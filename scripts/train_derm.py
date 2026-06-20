"""Dermatology classification with a LEAKAGE-FREE lesion-level split.

HAM10000 has multiple images per lesion (~10k images / ~7.5k lesions), so a
random image-level split leaks (same lesion in train+test -> ~100% accuracy).
This script splits by lesion_id (all images of a lesion in one split), combined
with fanconic (using fanconic's own train/test holdout). ConvNeXt-Small.

Outputs under models/dermatology_convnext/.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader

REPO = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("tc", REPO / "scripts" / "train_cls.py")
tc = importlib.util.module_from_spec(spec); spec.loader.exec_module(tc)

HAM_IMG = REPO / "data" / "ham" / "images"
HAM_META = REPO / "data" / "ham_meta" / "HAM10000_metadata.csv"
FANCONIC = REPO / "data" / "fanconic_dl" / "data"
OUT = REPO / "models" / "dermatology_convnext"
CLASSES = ["malignant", "non_malignant"]


def ham_binary(dx):
    return "malignant" if dx in ("mel", "bcc", "akiec") else "non_malignant"


def build_splits(seed):
    import pandas as pd
    meta = pd.read_csv(HAM_META)
    meta["bin"] = meta["dx"].apply(ham_binary)
    # one class per lesion
    les = meta.drop_duplicates("lesion_id")[["lesion_id", "bin"]]
    tr_l, ho_l = train_test_split(les["lesion_id"], test_size=0.30,
                                  stratify=les["bin"], random_state=seed)
    tr_les = set(tr_l); ho = meta[meta["lesion_id"].isin(ho_l)].drop_duplicates("lesion_id")[["lesion_id", "bin"]]
    va_l, te_l = train_test_split(ho["lesion_id"], test_size=0.50,
                                  stratify=ho["bin"], random_state=seed)
    sets = {"train": tr_les, "val": set(va_l), "test": set(te_l)}
    splits = {"train": [], "val": [], "test": []}
    for _, r in meta.iterrows():
        for s in sets:
            if r["lesion_id"] in sets[s]:
                img = HAM_IMG / (r["image_id"] + ".jpg")
                if img.exists():
                    splits[s].append((str(img), CLASSES.index(r["bin"])))
    print(f"[ham] lesion-level split train={len(splits['train'])} "
          f"val={len(splits['val'])} test={len(splits['test'])}", flush=True)
    # fanconic: its own train/test holdout (no lesion ids available)
    nf = {"train": 0, "test": 0}
    for split in ("train", "test"):
        for cls_folder, cls in (("malignant", "malignant"), ("benign", "non_malignant")):
            d = FANCONIC / split / cls_folder
            if not d.is_dir():
                continue
            for f in d.iterdir():
                if f.suffix.lower() in (".png", ".jpg", ".jpeg"):
                    splits[split].append((str(f), CLASSES.index(cls)))
                    nf[split] += 1
    print(f"[fanconic] train={nf['train']} test={nf['test']}", flush=True)
    return splits


def main(args):
    import torch.nn as nn
    device = torch.device("cuda")
    tc.set_seed(args.seed)
    OUT.mkdir(parents=True, exist_ok=True)
    splits = build_splits(args.seed)
    for k in ("train", "val", "test"):
        d = np.bincount([s[1] for s in splits[k]], minlength=len(CLASSES))
        print(f"[split] {k}: {len(splits[k])} dist={dict(zip(CLASSES, d.tolist()))}", flush=True)
    tr_tf, ev_tf = tc.get_tf(args.size)
    nw = args.num_workers
    loaders = {
        k: DataLoader(tc.ImgDS(splits[k], ev_tf if k != "train" else tr_tf),
                      batch_size=args.batch_size, shuffle=(k == "train"), num_workers=nw,
                      pin_memory=True, persistent_workers=(nw > 0), drop_last=(k == "train"))
        for k in ("train", "val", "test")}
    model = tc.build_model(args.backbone, len(CLASSES), device)
    w = np.bincount([s[1] for s in splits["train"]], minlength=len(CLASSES)).astype(float)
    w = np.maximum(w, 1.0); w = np.sqrt(w.sum() / w); w = w / w.mean()
    crit = nn.CrossEntropyLoss(weight=torch.tensor(w, dtype=torch.float32, device=device), label_smoothing=0.1)
    opt = torch.optim.AdamW(model.parameters(), lr=args.max_lr, weight_decay=args.weight_decay)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.max_lr, epochs=args.epochs,
                                              steps_per_epoch=len(loaders["train"]), pct_start=0.1)
    scaler = torch.amp.GradScaler("cuda")
    best_f1, best_acc, best_ep, hist = -1, -1, 0, []
    best = OUT / "best_classifier.pt"
    for ep in range(1, args.epochs + 1):
        model.train(); rl = rn = 0; TP = []; TL = []
        for x, y in loaders["train"]:
            x = x.to(device); y = y.to(device); opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda"):
                lo = model(x); loss = crit(lo, y)
            scaler.scale(loss).backward(); scaler.step(opt); scaler.update(); sch.step()
            rl += loss.item() * y.size(0); rn += y.size(0)
            TP.extend(lo.argmax(1).detach().cpu().numpy().tolist()); TL.extend(y.detach().cpu().numpy().tolist())
        tr = {"loss": rl / max(rn, 1), "accuracy": float(accuracy_score(TL, TP)),
              "macro_f1": float(f1_score(TL, TP, average="macro", labels=[0, 1], zero_division=0))}
        v = tc.evaluate(model, loaders["val"], device, len(CLASSES)); lr = opt.param_groups[0]["lr"]
        print(f"[ep {ep:02d}/{args.epochs}] tr_loss={tr['loss']:.4f} tr_acc={tr['accuracy']:.4f} "
              f"val_loss={v['loss']:.4f} val_acc={v['accuracy']:.4f} val_f1={v['macro_f1']:.4f} lr={lr:.2e}", flush=True)
        hist.append({"epoch": ep, "train_loss": tr["loss"], "train_accuracy": tr["accuracy"],
                     "train_macro_f1": tr["macro_f1"], "val_loss": v["loss"],
                     "val_accuracy": v["accuracy"], "val_macro_f1": v["macro_f1"], "lr": lr})
        (OUT / "training_history.json").write_text(json.dumps(hist, indent=2))
        if v["macro_f1"] > best_f1:
            best_f1, best_acc, best_ep = v["macro_f1"], v["accuracy"], ep
            torch.save({"model_state": model.state_dict(), "arch": args.backbone,
                        "weights": tc.WDEFAULT[args.backbone], "class_names": CLASSES,
                        "num_classes": len(CLASSES), "img_size": args.size}, best)
            print(f"      -> new best val_f1={best_f1:.4f}", flush=True)
    ck = torch.load(best, map_location=device, weights_only=False)
    model = tc.build_model(args.backbone, len(CLASSES), device); model.load_state_dict(ck["model_state"])
    te = tc.evaluate(model, loaders["test"], device, len(CLASSES))
    rep = classification_report(te["labels"], te["preds"], target_names=CLASSES, digits=4, zero_division=0, output_dict=True)
    cm = confusion_matrix(te["labels"], te["preds"], labels=list(range(len(CLASSES)))).tolist()
    counts = {k: {c: sum(1 for _, y in v if CLASSES[y] == c) for c in CLASSES} for k, v in splits.items()}
    metrics = {"status": "done", "disease_id": "dermatology", "tta": "none", "best_epoch": best_ep,
               "best_val_macro_f1": best_f1, "best_val_accuracy": best_acc,
               "test": {"accuracy": te["accuracy"], "macro_precision": rep["macro avg"]["precision"],
                        "macro_recall": rep["macro avg"]["recall"], "macro_f1": te["macro_f1"],
                        "confusion_matrix": cm, "loss": te["loss"]},
               "test_accuracy": te["accuracy"], "test_macro_f1": te["macro_f1"], "test_loss": te["loss"],
               "classification_report": rep, "confusion_matrix": cm, "class_names": CLASSES, "classes": CLASSES,
               "class_counts": {"per_split": counts, "totals": {c: sum(counts[s][c] for s in counts) for c in CLASSES}},
               "n_train": len(splits["train"]), "n_val": len(splits["val"]), "n_test": len(splits["test"]),
               "architecture": {"backbone": args.backbone, "pretrained_weights": tc.WDEFAULT[args.backbone],
                                "img_size": args.size, "tta": "none"},
               "dataset": {"source": "HAM10000 (kmader metadata, lesion-level split) + fanconic (own train/test holdout)",
                           "classes": CLASSES, "split": "lesion-level (HAM10000) to prevent same-lesion leakage"}}
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    tc.plots(hist, cm, CLASSES, "Dermatology (ConvNeXt-Small)", OUT)
    print(f"[test] acc={te['accuracy']:.4f} f1={te['macro_f1']:.4f}", flush=True)
    print(json.dumps(rep, indent=2), flush=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--backbone", default="convnext_small"); p.add_argument("--size", type=int, default=224)
    p.add_argument("--epochs", type=int, default=12); p.add_argument("--batch-size", type=int, default=48)
    p.add_argument("--max-lr", type=float, default=2e-4); p.add_argument("--weight-decay", type=float, default=0.03)
    p.add_argument("--num-workers", type=int, default=8); p.add_argument("--seed", type=int, default=42)
    main(p.parse_args()); sys.exit(0)
