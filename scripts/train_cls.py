"""Generic image-classification trainer (ImageFolder layout), reused across
diseases. Strong pretrained CNN backbones, deduped leakage-free stratified
split, class-weighted CE + label smoothing, OneCycleLR, mixed precision.
Saves metrics.json, training_history.json, and plots.
"""

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, f1_score,
)
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

REPO = Path(__file__).resolve().parent.parent


def load_dedupe():
    p = REPO / "scripts" / "dedupe_dataset.py"
    spec = importlib.util.spec_from_file_location("dd_g", p)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def set_seed(seed):
    import random
    random.seed(seed); np.random.seed(seed)
    torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)


class ImgDS(Dataset):
    def __init__(self, samples, tf):
        self.samples = samples; self.tf = tf

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, i):
        p, y = self.samples[i]
        return self.tf(Image.open(p).convert("RGB")), y


BACKBONES = {
    "resnet50": (models.resnet50, lambda m, n: setattr(m, "fc", nn.Linear(m.fc.in_features, n))),
    "convnext_tiny": (models.convnext_tiny, lambda m, n: m.classifier.__setitem__(2, nn.Linear(m.classifier[2].in_features, n))),
    "convnext_small": (models.convnext_small, lambda m, n: m.classifier.__setitem__(2, nn.Linear(m.classifier[2].in_features, n))),
    "densenet121": (models.densenet121, lambda m, n: setattr(m, "classifier", nn.Linear(m.classifier.in_features, n))),
    "efficientnet_v2_s": (models.efficientnet_v2_s, lambda m, n: setattr(m, "classifier", nn.Sequential(nn.Dropout(0.2, inplace=True), nn.Linear(m.classifier[1].in_features, n)))),
}
WDEFAULT = {"resnet50": "IMAGENET1K_V2", "densenet121": "IMAGENET1K_V1",
            "convnext_tiny": "IMAGENET1K_V1", "convnext_small": "IMAGENET1K_V1",
            "efficientnet_v2_s": "IMAGENET1K_V1"}


def build_model(name, num_classes, device):
    factory, head_fn = BACKBONES[name]
    weights = getattr(models, f"{name.replace('_','_').title()}Weights".replace("_Weights", "Weights"), None)
    # resolve weights enum
    wmap = {"resnet50": models.ResNet50_Weights, "convnext_tiny": models.ConvNeXt_Tiny_Weights,
            "convnext_small": models.ConvNeXt_Small_Weights, "densenet121": models.DenseNet121_Weights,
            "efficientnet_v2_s": models.EfficientNet_V2_S_Weights}
    model = factory(weights=wmap[name][WDEFAULT[name]])
    head_fn(model, num_classes)
    return model.to(device)


def _hash_one(args):
    import hashlib, imagehash
    p, ci, cn, nm = args
    with open(p, "rb") as fh:
        md5 = hashlib.md5(fh.read()).hexdigest()
    im = Image.open(p).convert("L")
    h = imagehash.phash(im, hash_size=8).hash.flatten()
    mh = imagehash.phash(im.transpose(Image.FLIP_LEFT_RIGHT), hash_size=8).hash.flatten()
    return {"path": p, "ci": ci, "cn": cn, "name": nm, "md5": md5,
            "h": int(np.packbits(h).tobytes().hex(), 16),
            "mh": int(np.packbits(mh).tobytes().hex(), 16)}


def gather(roots, rename=None, exclude_mask=False):
    rename = rename or {}
    pool = []
    classes = set()
    folders = []
    for data_root in roots:
        root = Path(data_root)
        if (root / "train").is_dir():
            for s in ("train", "test", "val"):
                if (root / s).is_dir():
                    folders.append(root / s)
        else:
            folders.append(root)
    for c in folders:
        for cls in c.iterdir():
            if not cls.is_dir():
                continue
            name = rename.get(cls.name, cls.name)
            classes.add(name)
            for f in cls.iterdir():
                if f.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                    continue
                if exclude_mask and "mask" in f.stem.lower():
                    continue
                pool.append((str(f), name, f.name))
    classes = sorted(classes)
    cidx = {c: i for i, c in enumerate(classes)}
    pool = [(p, cidx[cn], cn, nm) for (p, cn, nm) in pool]
    return pool, classes


def parse_rename(s):
    out = {}
    if not s:
        return out
    for pair in s.split(","):
        if "=" in pair:
            a, b = pair.split("=", 1); out[a.strip()] = b.strip()
    return out


def make_splits(pool, classes, seed, dedup_threshold):
    dd = load_dedupe()
    from multiprocessing import Pool
    with Pool(8) as pl:
        recs = pl.map(_hash_one, pool, chunksize=64)
    from collections import defaultdict
    by = defaultdict(list)
    for r in recs:
        by[r["ci"]].append(r)
    kept, dedup_report = [], {}
    for ci, cn in enumerate(classes):
        k, ex, nr = dd.dedupe_class(by.get(ci, []), dedup_threshold)
        kept.extend(k)
        dedup_report[cn] = dict(input=len(by.get(ci, [])), kept=len(k), exact=ex, near=nr)
        print(f"[dedup] {cn}: in={len(by.get(ci,[]))} kept={len(k)} exact={ex} near={nr}", flush=True)
    samples = [(r["path"], r["ci"]) for r in sorted(kept, key=lambda x: (x["ci"], x["path"]))]
    paths = [s[0] for s in samples]; labels = [s[1] for s in samples]
    tr_p, ho_p, tr_y, ho_y = train_test_split(paths, labels, test_size=0.30,
                                              stratify=labels, random_state=seed)
    va_p, te_p, va_y, te_y = train_test_split(ho_p, ho_y, test_size=0.50,
                                              stratify=ho_y, random_state=seed)
    return {"train": list(zip(tr_p, tr_y)), "val": list(zip(va_p, va_y)),
            "test": list(zip(te_p, te_y))}, dedup_report, len(samples)


def get_tf(size):
    return (transforms.Compose([
        transforms.RandomResizedCrop(size, scale=(0.7, 1.0), ratio=(0.85, 1.15)),
        transforms.TrivialAugmentWide(), transforms.RandomHorizontalFlip(0.5),
        transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.2)]),
        transforms.Compose([transforms.Resize((size, size)), transforms.ToTensor(),
                            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]))


@torch.no_grad()
def evaluate(model, loader, device, n):
    model.eval()
    crit = nn.CrossEntropyLoss(reduction="sum"); P = []; L = []; tot = 0.0
    for x, y in loader:
        x = x.to(device); y = y.to(device)
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            lo = model(x); tot += crit(lo, y).item()
        P.extend(lo.argmax(1).cpu().numpy().tolist()); L.extend(y.cpu().numpy().tolist())
    n2 = max(len(L), 1)
    return {"loss": tot / n2, "accuracy": float(accuracy_score(L, P)),
            "macro_f1": float(f1_score(L, P, average="macro", labels=list(range(n)), zero_division=0)),
            "preds": P, "labels": L}


def plots(history, cm, classes, label, out):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    (out / "plots").mkdir(parents=True, exist_ok=True)
    ep = [h["epoch"] for h in history]

    def c(key, title, fn):
        plt.figure(figsize=(7, 5))
        if ("train_" + key) in history[0]:
            plt.plot(ep, [h["train_" + key] for h in history], marker=".", label="train")
        plt.plot(ep, [h["val_" + key] for h in history], marker="s", label="val")
        plt.xlabel("Epoch"); plt.ylabel(title.split("-")[-1]); plt.title(title)
        plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout(); plt.savefig(out / "plots" / fn); plt.close()

    c("accuracy", f"{label} - Accuracy", "accuracy_curve.svg")
    c("loss", f"{label} - Loss", "loss_curve.svg")
    c("macro_f1", f"{label} - Macro F1", "macro_f1_curve.svg")
    cm = np.array(cm); fig, ax = plt.subplots(figsize=(6.5, 6))
    ax.imshow(cm, cmap="Blues"); ax.set_xticks(range(len(classes))); ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, rotation=45, ha="right"); ax.set_yticklabels(classes)
    ax.set_xlabel("Predicted"); ax.set_ylabel("True"); thr = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > thr else "black")
    ax.set_title(f"{label} - Confusion Matrix"); fig.colorbar(ax.imshow(cm, cmap="Blues"), fraction=0.046, pad=0.04)
    plt.tight_layout(); plt.savefig(out / "plots" / "test_confusion_matrix.svg"); plt.close()


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_seed(args.seed)
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    print(f"[info] disease={args.disease} backbone={args.backbone} size={args.size} device={device}", flush=True)
    pool, classes = gather(args.data, parse_rename(args.rename_classes),
                           exclude_mask=args.exclude_mask)
    print(f"[gather] {len(pool)} images, classes={classes}", flush=True)
    splits, dedup, n_unique = make_splits(pool, classes, args.seed, args.dedup_threshold)
    counts = {k: {c: sum(1 for _, y in v if classes[y] == c) for c in classes} for k, v in splits.items()}
    for k in ("train", "val", "test"):
        d = np.bincount([s[1] for s in splits[k]], minlength=len(classes))
        print(f"[split] {k}: {len(splits[k])} dist={dict(zip(classes,d.tolist()))}", flush=True)
    tr_tf, ev_tf = get_tf(args.size)
    nw = args.num_workers
    loaders = {
        "train": DataLoader(ImgDS(splits["train"], tr_tf), batch_size=args.batch_size, shuffle=True,
                            num_workers=nw, pin_memory=True, persistent_workers=(nw > 0), drop_last=True),
        "val": DataLoader(ImgDS(splits["val"], ev_tf), batch_size=args.batch_size, shuffle=False,
                          num_workers=nw, pin_memory=True, persistent_workers=(nw > 0)),
        "test": DataLoader(ImgDS(splits["test"], ev_tf), batch_size=args.batch_size, shuffle=False,
                           num_workers=nw, pin_memory=True, persistent_workers=(nw > 0)),
    }
    model = build_model(args.backbone, len(classes), device)
    w = np.bincount([s[1] for s in splits["train"]], minlength=len(classes)).astype(float)
    w = np.maximum(w, 1.0); w = np.sqrt(w.sum() / w); w = w / w.mean()
    crit = nn.CrossEntropyLoss(weight=torch.tensor(w, dtype=torch.float32, device=device), label_smoothing=0.1)
    opt = torch.optim.AdamW(model.parameters(), lr=args.max_lr, weight_decay=args.weight_decay)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.max_lr, epochs=args.epochs,
                                              steps_per_epoch=len(loaders["train"]), pct_start=0.1)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))
    best_f1, best_acc, best_ep, hist = -1, -1, 0, []
    best_path = out / "best_classifier.pt"
    for ep in range(1, args.epochs + 1):
        model.train(); rl = rn = 0; TP = []; TL = []
        for x, y in loaders["train"]:
            x = x.to(device); y = y.to(device); opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
                lo = model(x); loss = crit(lo, y)
            scaler.scale(loss).backward(); scaler.step(opt); scaler.update(); sch.step()
            rl += loss.item() * y.size(0); rn += y.size(0)
            TP.extend(lo.argmax(1).detach().cpu().numpy().tolist()); TL.extend(y.detach().cpu().numpy().tolist())
        tr = {"loss": rl / max(rn, 1), "accuracy": float(accuracy_score(TL, TP)),
              "macro_f1": float(f1_score(TL, TP, average="macro", labels=list(range(len(classes))), zero_division=0))}
        v = evaluate(model, loaders["val"], device, len(classes)); lr = opt.param_groups[0]["lr"]
        print(f"[ep {ep:02d}/{args.epochs}] tr_loss={tr['loss']:.4f} tr_acc={tr['accuracy']:.4f} "
              f"val_loss={v['loss']:.4f} val_acc={v['accuracy']:.4f} val_f1={v['macro_f1']:.4f} lr={lr:.2e}", flush=True)
        hist.append({"epoch": ep, "train_loss": tr["loss"], "train_accuracy": tr["accuracy"],
                     "train_macro_f1": tr["macro_f1"], "val_loss": v["loss"],
                     "val_accuracy": v["accuracy"], "val_macro_f1": v["macro_f1"], "lr": lr})
        (out / "training_history.json").write_text(json.dumps(hist, indent=2))
        if v["macro_f1"] > best_f1:
            best_f1, best_acc, best_ep = v["macro_f1"], v["accuracy"], ep
            torch.save({"model_state": model.state_dict(), "arch": args.backbone,
                        "weights": WDEFAULT[args.backbone], "class_names": classes,
                        "num_classes": len(classes), "img_size": args.size}, best_path)
            print(f"      -> new best val_f1={best_f1:.4f}", flush=True)
    torch.save({"model_state": model.state_dict(), "arch": args.backbone, "class_names": classes},
               out / "final_classifier.pt")
    ck = torch.load(best_path, map_location=device, weights_only=False)
    model = build_model(args.backbone, len(classes), device); model.load_state_dict(ck["model_state"])
    te = evaluate(model, loaders["test"], device, len(classes))
    rep = classification_report(te["labels"], te["preds"], target_names=classes, digits=4, zero_division=0, output_dict=True)
    cm = confusion_matrix(te["labels"], te["preds"], labels=list(range(len(classes)))).tolist()
    metrics = {"status": "done", "disease_id": args.disease, "tta": "none", "best_epoch": best_ep,
               "best_val_macro_f1": best_f1, "best_val_accuracy": best_acc,
               "test": {"accuracy": te["accuracy"], "macro_precision": rep["macro avg"]["precision"],
                        "macro_recall": rep["macro avg"]["recall"], "macro_f1": te["macro_f1"],
                        "confusion_matrix": cm, "loss": te["loss"]},
               "test_accuracy": te["accuracy"], "test_macro_f1": te["macro_f1"], "test_loss": te["loss"],
               "classification_report": rep, "confusion_matrix": cm, "class_names": classes, "classes": classes,
               "class_counts": {"per_split": counts, "totals": {c: sum(counts[s][c] for s in counts) for c in classes}},
               "n_unique": n_unique, "n_train": len(splits["train"]), "n_val": len(splits["val"]), "n_test": len(splits["test"]),
               "architecture": {"backbone": args.backbone, "pretrained_weights": WDEFAULT[args.backbone],
                                "img_size": args.size, "tta": "none"},
               "dataset": {"source": args.data_source, "classes": classes, "dedup": dedup}}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    plots(hist, cm, classes, f"{args.disease} ({args.backbone})", out)
    print(f"[test] acc={te['accuracy']:.4f} f1={te['macro_f1']:.4f}", flush=True)
    print(json.dumps(rep, indent=2), flush=True)
    print(f"[done] -> {out}", flush=True)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data", nargs="+", required=True)
    p.add_argument("--rename-classes", default="")
    p.add_argument("--exclude-mask", action="store_true",
                   help="skip files with 'mask' in the name (e.g. BUSI)")
    p.add_argument("--out", required=True)
    p.add_argument("--disease", required=True)
    p.add_argument("--data-source", default="")
    p.add_argument("--backbone", default="convnext_small")
    p.add_argument("--size", type=int, default=224)
    p.add_argument("--epochs", type=int, default=15)
    p.add_argument("--batch-size", type=int, default=48)
    p.add_argument("--max-lr", type=float, default=2e-4)
    p.add_argument("--weight-decay", type=float, default=0.03)
    p.add_argument("--dedup-threshold", type=int, default=5)
    p.add_argument("--num-workers", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


if __name__ == "__main__":
    train(parse_args())
    sys.exit(0)
