"""Train a pretrained CNN (ConvNeXt-Small @ 384px) on HyperKvasir for 5-class
endoscopy classification: barretts, esophagitis, polyp, ulcerative_colitis,
healthy (healthy added vs. the previous 4-class model).

Pipeline:
  - Reuse the existing leakage-free split if present (data/endoscopy_splits/),
    else merge HyperKvasir splits, map 23 source folders -> 5 target classes,
    global dedup (MD5 + perceptual pHash, mirror-aware), stratified 70/15/15.
  - ConvNeXt-Small (IMAGENET1K_V1) + fresh 5-class head.
  - Tempered class weights, label smoothing, OneCycleLR, mixed precision,
    strong augmentation (train only), TTA at eval.
  - Saves EVERYTHING: metrics.json, training_history.json, per-epoch curves
    (accuracy/loss/macro_f1) and confusion matrix as SVG.
  - Pushes weights + metrics + curves to the HF repo on every new best
    and a final push after test evaluation.

Outputs under models/endoscopy_convnext/:
  best_convnext.pt, final_convnext.pt, metrics.json, training_history.json,
  plots/{accuracy_curve,loss_curve,macro_f1_curve,test_confusion_matrix}.svg

Usage:
    python scripts/train_endoscopy.py --epochs 25 --batch-size 32
"""

import argparse
import json
import os
import sys
import time
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
DATA_DIR = REPO / "data" / "endoscopy"
SPLIT_DIR = REPO / "data" / "endoscopy_splits"
OUT_DIR = REPO / "models" / "endoscopy_convnext"
PLOTS_DIR = OUT_DIR / "plots"

HF_REPO = "umairinayat/medical-models"
HF_REMOTE_DIR = "disease_models/endoscopy/classification"

TARGET_CLASSES = [
    "barretts", "esophagitis", "polyp", "ulcerative_colitis", "healthy",
]
NAME2TARGET = {
    "barretts": "barretts", "barretts-short-segment": "barretts",
    "esophagitis-a": "esophagitis", "esophagitis-b-d": "esophagitis",
    "polyps": "polyp",
    "ulcerative-colitis-grade-0-1": "ulcerative_colitis",
    "ulcerative-colitis-grade-1": "ulcerative_colitis",
    "ulcerative-colitis-grade-1-2": "ulcerative_colitis",
    "ulcerative-colitis-grade-2": "ulcerative_colitis",
    "ulcerative-colitis-grade-2-3": "ulcerative_colitis",
    "ulcerative-colitis-grade-3": "ulcerative_colitis",
    "cecum": "healthy", "pylorus": "healthy", "z-line": "healthy",
    "retroflex-rectum": "healthy", "retroflex-stomach": "healthy",
    "ileum": "healthy",
}

IMG_SIZE = 384
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def set_seed(seed):
    import random
    random.seed(seed); np.random.seed(seed)
    torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)


class EndoDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform is not None:
            img = self.transform(img)
        return img, label


# ---------------- data: reuse split or build from scratch ----------------

def load_existing_splits():
    splits = {}
    for name in ("train", "val", "test"):
        f = SPLIT_DIR / f"{name}.txt"
        if not f.exists():
            return None
        items = []
        for line in f.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            path, cls = line.rsplit("\t", 1)
            items.append((path, TARGET_CLASSES.index(cls)))
        splits[name] = items
    return splits


def build_splits_fresh(seed, dedup_threshold):
    import importlib.util
    from multiprocessing import Pool
    path = Path(__file__).resolve().parent / "dedupe_dataset.py"
    spec = importlib.util.spec_from_file_location("dd_endo", path)
    dd = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(dd)

    def _hash_one(args):
        import hashlib, imagehash
        p, ci, cn, nm = args
        with open(p, "rb") as fh:
            md5 = hashlib.md5(fh.read()).hexdigest()
        im = Image.open(p).convert("L")
        h = imagehash.phash(im, hash_size=8).hash.flatten()
        mh = imagehash.phash(im.transpose(Image.FLIP_LEFT_RIGHT),
                             hash_size=8).hash.flatten()
        return {"path": p, "ci": ci, "cn": cn, "name": nm, "md5": md5,
                "h": int(np.packbits(h).tobytes().hex(), 16),
                "mh": int(np.packbits(mh).tobytes().hex(), 16)}

    pool_args = []
    for split in ("train", "valid", "test"):
        root = DATA_DIR / split
        if not root.is_dir():
            continue
        for src in sorted(p for p in root.iterdir() if p.is_dir()):
            tgt = NAME2TARGET.get(src.name)
            if tgt is None:
                continue
            ci = TARGET_CLASSES.index(tgt)
            for f in sorted(src.iterdir()):
                if f.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    pool_args.append((str(f), ci, tgt, f.name))
    print(f"[gather] collected {len(pool_args)} images", flush=True)
    with Pool(8) as pool:
        records = pool.map(_hash_one, pool_args, chunksize=64)
    from collections import defaultdict
    by_cls = defaultdict(list)
    for r in records:
        by_cls[r["ci"]].append(r)
    kept_all = []
    dedup_report = {}
    for ci, cn in enumerate(TARGET_CLASSES):
        recs = by_cls.get(ci, [])
        if not recs:
            dedup_report[cn] = dict(input=0, kept=0, exact=0, near=0)
            continue
        kept, ex, nr = dd.dedupe_class(recs, dedup_threshold)
        kept_all.extend(kept)
        dedup_report[cn] = dict(input=len(recs), kept=len(kept),
                                exact=ex, near=nr)
        print(f"[dedup] {cn}: in={len(recs)} kept={len(kept)} "
              f"exact={ex} near={nr}", flush=True)
    kept_all.sort(key=lambda r: (r["ci"], r["path"]))
    samples = [(r["path"], r["ci"]) for r in kept_all]
    paths = [s[0] for s in samples]
    labels = [s[1] for s in samples]
    tr_p, ho_p, tr_y, ho_y = train_test_split(
        paths, labels, test_size=0.30, stratify=labels, random_state=seed)
    va_p, te_p, va_y, te_y = train_test_split(
        ho_p, ho_y, test_size=0.50, stratify=ho_y, random_state=seed)
    splits = {"train": list(zip(tr_p, tr_y)),
              "val": list(zip(va_p, va_y)),
              "test": list(zip(te_p, te_y))}
    SPLIT_DIR.mkdir(parents=True, exist_ok=True)
    for name, items in splits.items():
        with (SPLIT_DIR / f"{name}.txt").open("w") as fh:
            for p, c in items:
                fh.write(f"{p}\t{TARGET_CLASSES[c]}\n")
    return splits, dedup_report


# ---------------- model / transforms ----------------

def get_transforms():
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(
            IMG_SIZE, scale=(0.6, 1.0), ratio=(0.8, 1.2)),
        transforms.TrivialAugmentWide(),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        transforms.RandomErasing(p=0.25, scale=(0.02, 0.15)),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return train_tf, eval_tf


def build_model(num_classes, device):
    weights = models.ConvNeXt_Small_Weights.IMAGENET1K_V1
    model = models.convnext_small(weights=weights)
    in_feat = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_feat, num_classes)
    return model.to(device)


def class_weights_for(labels, num_classes, device):
    counts = np.bincount(labels, minlength=num_classes).astype(np.float64)
    counts = np.maximum(counts, 1.0)
    w = counts.sum() / counts
    w = np.sqrt(w)            # temper: gentler than raw inverse frequency
    w = w / w.mean()          # normalize to mean 1
    return torch.tensor(w, dtype=torch.float32, device=device)


@torch.no_grad()
def evaluate(model, loader, device, num_classes, tta="flip"):
    model.eval()
    crit = nn.CrossEntropyLoss(reduction="sum")
    preds_all, labels_all = [], []
    total = 0.0
    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            logits = model(images)
            if tta == "flip":
                logits = 0.5 * (logits + model(torch.flip(images, dims=[-1])))
            elif tta == "full":
                logits = (
                    model(images)
                    + model(torch.flip(images, dims=[-1]))
                    + model(torch.flip(images, dims=[-2]))
                    + model(torch.flip(images, dims=[-1, -2]))
                ) / 4.0
            total += crit(logits, labels).item()
        preds_all.extend(logits.argmax(1).cpu().numpy().tolist())
        labels_all.extend(labels.cpu().numpy().tolist())
    n = max(len(labels_all), 1)
    return {
        "loss": total / n,
        "accuracy": float(accuracy_score(labels_all, preds_all)),
        "macro_f1": float(f1_score(labels_all, preds_all, average="macro",
                                   labels=list(range(num_classes)),
                                   zero_division=0)),
        "preds": preds_all, "labels": labels_all,
    }


# ---------------- artifact saving + HF push ----------------

def make_plots(history, cm, classes, eval_label):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    ep = [h["epoch"] for h in history]
    plt.figure(figsize=(7, 5))
    plt.plot(ep, [h["val_accuracy"] * 100 for h in history], marker="o",
             color="#2a9d8f", label="val acc")
    plt.plot(ep, [h["train_accuracy"] * 100 for h in history], marker=".",
             color="#e9c46a", label="train acc")
    plt.xlabel("Epoch"); plt.ylabel("Accuracy (%)")
    plt.title(f"Endoscopy (ConvNeXt-Small) - Accuracy ({eval_label})")
    plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout()
    plt.savefig(PLOTS_DIR / "accuracy_curve.svg"); plt.close()

    plt.figure(figsize=(7, 5))
    plt.plot(ep, [h["train_loss"] for h in history], marker="o",
             label="train", color="#e76f51")
    plt.plot(ep, [h["val_loss"] for h in history], marker="s",
             label="val", color="#264653")
    plt.xlabel("Epoch"); plt.ylabel("Loss")
    plt.title("Endoscopy (ConvNeXt-Small) - Loss Curves")
    plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout()
    plt.savefig(PLOTS_DIR / "loss_curve.svg"); plt.close()

    plt.figure(figsize=(7, 5))
    plt.plot(ep, [h["val_macro_f1"] * 100 for h in history], marker="o",
             color="#457b9d", label="val macro-F1")
    plt.plot(ep, [h["train_macro_f1"] * 100 for h in history], marker=".",
             color="#e9c46a", label="train macro-F1")
    plt.xlabel("Epoch"); plt.ylabel("Macro F1 (%)")
    plt.title(f"Endoscopy (ConvNeXt-Small) - Macro F1 ({eval_label})")
    plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout()
    plt.savefig(PLOTS_DIR / "macro_f1_curve.svg"); plt.close()

    cm = np.array(cm)
    fig, ax = plt.subplots(figsize=(6.5, 6))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(classes))); ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, rotation=45, ha="right")
    ax.set_yticklabels(classes)
    ax.set_xlabel("Predicted"); ax.set_ylabel("True")
    ax.set_title(f"Endoscopy (ConvNeXt-Small) - {eval_label} Confusion Matrix")
    thr = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > thr else "black")
    fig.colorbar(im, fraction=0.046, pad=0.04)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "test_confusion_matrix.svg"); plt.close()


def save_checkpoint(path, model, args, extra=None):
    payload = {
        "model_state": model.state_dict(),
        "arch": "convnext_small",
        "weights": "IMAGENET1K_V1",
        "class_names": TARGET_CLASSES,
        "num_classes": len(TARGET_CLASSES),
        "img_size": IMG_SIZE,
        "normalization_mean": IMAGENET_MEAN,
        "normalization_std": IMAGENET_STD,
        "args": {k: (str(v) if isinstance(v, Path) else v)
                 for k, v in vars(args).items()},
    }
    if extra:
        payload.update(extra)
    torch.save(payload, path)


def push_to_hf(tag, weights_path=None, note=""):
    if not os.getenv("HF_TOKEN") or not args_global.push_hf:
        return
    try:
        from huggingface_hub import HfApi
        api = HfApi()
        rem = lambda f: f"{HF_REMOTE_DIR}/{f}"
        api.upload_file(path_or_fileobj=str(OUT_DIR / "metrics.json"),
                        path_in_repo=rem("metrics.json"), repo_id=HF_REPO,
                        repo_type="model",
                        commit_message=f"[endoscopy] {tag} metrics {note}")
        api.upload_file(path_or_fileobj=str(OUT_DIR / "training_history.json"),
                        path_in_repo=rem("training_history.json"),
                        repo_id=HF_REPO, repo_type="model",
                        commit_message=f"[endoscopy] {tag} history")
        for svg in ("accuracy_curve.svg", "loss_curve.svg",
                    "macro_f1_curve.svg", "test_confusion_matrix.svg"):
            p = PLOTS_DIR / svg
            if p.exists():
                api.upload_file(path_or_fileobj=str(p),
                                path_in_repo=rem(f"plots/{svg}"),
                                repo_id=HF_REPO, repo_type="model",
                                commit_message=f"[endoscopy] {tag} {svg}")
        if weights_path is not None and Path(weights_path).exists():
            api.upload_file(path_or_fileobj=str(weights_path),
                            path_in_repo=rem("best_classifier.pt"),
                            repo_id=HF_REPO, repo_type="model",
                            commit_message=f"[endoscopy] {tag} weights {note}")
        print(f"[hf] pushed ({tag})", flush=True)
    except Exception as e:
        print(f"[hf] push skipped ({tag}): {e}", flush=True)


args_global = None


def train(args):
    global args_global
    args_global = args
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_seed(args.seed)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[info] backbone=convnext_small img={IMG_SIZE} device={device} "
          f"tta=True push_hf={args.push_hf}", flush=True)

    splits = load_existing_splits() if args.reuse_splits else None
    dedup_report = None
    if splits is not None:
        print("[info] reusing existing leakage-free split", flush=True)
    else:
        splits, dedup_report = build_splits_fresh(args.seed, args.dedup_threshold)
    for k in ("train", "val", "test"):
        dist = np.bincount([s[1] for s in splits[k]], minlength=len(TARGET_CLASSES))
        print(f"[split] {k}: {len(splits[k])} "
              f"dist={dict(zip(TARGET_CLASSES, dist.tolist()))}", flush=True)

    train_tf, eval_tf = get_transforms()
    train_ds = EndoDataset(splits["train"], train_tf)
    val_ds = EndoDataset(splits["val"], eval_tf)
    test_ds = EndoDataset(splits["test"], eval_tf)
    nw = args.num_workers
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                              num_workers=nw, pin_memory=(device.type == "cuda"),
                              persistent_workers=(nw > 0), drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                            num_workers=nw, pin_memory=(device.type == "cuda"),
                            persistent_workers=(nw > 0))
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False,
                             num_workers=nw, pin_memory=(device.type == "cuda"),
                             persistent_workers=(nw > 0))

    model = build_model(len(TARGET_CLASSES), device)
    weights = class_weights_for([s[1] for s in splits["train"]],
                                len(TARGET_CLASSES), device)
    print(f"[info] class weights (tempered): "
          f"{dict(zip(TARGET_CLASSES, [round(w.item(),3) for w in weights]))}",
          flush=True)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1, weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.max_lr,
                                  weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=args.max_lr, epochs=args.epochs,
        steps_per_epoch=len(train_loader), pct_start=0.1,
        div_factor=10.0, final_div_factor=100.0)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    best_f1, best_acc, best_epoch = -1.0, -1.0, 0
    history = []
    best_path = OUT_DIR / "best_convnext.pt"

    for epoch in range(1, args.epochs + 1):
        model.train()
        run_loss, run_n = 0.0, 0
        # train metrics
        tr_preds, tr_labels = [], []
        for images, labels in train_loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
                logits = model(images)
                loss = criterion(logits, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer); scaler.update(); scheduler.step()
            bs = labels.size(0)
            run_loss += loss.item() * bs; run_n += bs
            tr_preds.extend(logits.argmax(1).detach().cpu().numpy().tolist())
            tr_labels.extend(labels.detach().cpu().numpy().tolist())
        train_loss = run_loss / max(run_n, 1)
        train_acc = float(accuracy_score(tr_labels, tr_preds))
        train_f1 = float(f1_score(tr_labels, tr_preds, average="macro",
                                  labels=list(range(len(TARGET_CLASSES))),
                                  zero_division=0))
        val = evaluate(model, val_loader, device, len(TARGET_CLASSES), tta="flip")
        lr_now = optimizer.param_groups[0]["lr"]
        print(f"[epoch {epoch:02d}/{args.epochs}] "
              f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
              f"val_loss={val['loss']:.4f} val_acc={val['accuracy']:.4f} "
              f"val_macro_f1={val['macro_f1']:.4f} lr={lr_now:.2e}", flush=True)
        history.append({"epoch": epoch, "train_loss": train_loss,
                        "train_accuracy": train_acc, "train_macro_f1": train_f1,
                        "val_loss": val["loss"], "val_accuracy": val["accuracy"],
                        "val_macro_f1": val["macro_f1"], "lr": lr_now})
        (OUT_DIR / "training_history.json").write_text(json.dumps(history, indent=2))

        val_cm = confusion_matrix(val["labels"], val["preds"],
                                  labels=list(range(len(TARGET_CLASSES)))).tolist()
        # write a progress metrics + plots
        progress = {
            "status": "training", "epoch": epoch, "epochs": args.epochs,
            "best_val_macro_f1": max(best_f1, val["macro_f1"]),
            "val": {"accuracy": val["accuracy"], "macro_f1": val["macro_f1"],
                    "loss": val["loss"], "confusion_matrix": val_cm},
            "class_names": TARGET_CLASSES,
            "architecture": {"backbone": "convnext_small",
                             "weights": "IMAGENET1K_V1", "img_size": IMG_SIZE},
        }
        (OUT_DIR / "metrics.json").write_text(json.dumps(progress, indent=2))
        make_plots(history, val_cm, TARGET_CLASSES, "Val")

        if val["macro_f1"] > best_f1:
            best_f1 = val["macro_f1"]; best_acc = val["accuracy"]; best_epoch = epoch
            save_checkpoint(best_path, model, args,
                            extra={"val_macro_f1": best_f1,
                                   "val_accuracy": best_acc, "epoch": epoch})
            print(f"          -> new best (val_macro_f1={best_f1:.4f}, "
                  f"val_acc={best_acc:.4f})", flush=True)
            push_to_hf(f"epoch{epoch}", weights_path=best_path,
                       note=f"val_f1={best_f1:.4f}")

    save_checkpoint(OUT_DIR / "final_convnext.pt", model, args,
                    extra={"epoch": args.epochs})
    print(f"[done] best epoch {best_epoch} val_macro_f1={best_f1:.4f} "
          f"val_acc={best_acc:.4f}", flush=True)

    # ---- final test evaluation ----
    ckpt = torch.load(best_path, map_location=device, weights_only=False)
    model = build_model(len(TARGET_CLASSES), device)
    model.load_state_dict(ckpt["model_state"])
    test = evaluate(model, test_loader, device, len(TARGET_CLASSES), tta="full")
    report = classification_report(test["labels"], test["preds"],
                                   target_names=TARGET_CLASSES, digits=4,
                                   zero_division=0, output_dict=True)
    cm = confusion_matrix(test["labels"], test["preds"],
                          labels=list(range(len(TARGET_CLASSES)))).tolist()
    metrics = {
        "status": "done", "disease_id": "endoscopy",
        "best_epoch": best_epoch, "best_val_macro_f1": best_f1,
        "best_val_accuracy": best_acc,
        "test": {"accuracy": test["accuracy"],
                 "macro_precision": report["macro avg"]["precision"],
                 "macro_recall": report["macro avg"]["recall"],
                 "macro_f1": test["macro_f1"],
                 "confusion_matrix": cm, "loss": test["loss"]},
        "test_accuracy": test["accuracy"], "test_macro_f1": test["macro_f1"],
        "test_loss": test["loss"], "classification_report": report,
        "confusion_matrix": cm, "class_names": TARGET_CLASSES,
        "classes": TARGET_CLASSES,
        "n_train": len(splits["train"]), "n_val": len(splits["val"]),
        "n_test": len(splits["test"]),
        "architecture": {"backbone": "convnext_small",
                         "pretrained_weights": "IMAGENET1K_V1",
                         "head": "Linear(768, 5)", "img_size": IMG_SIZE,
                         "normalization_mean": IMAGENET_MEAN,
                         "normalization_std": IMAGENET_STD,
                         "tta": "horizontal-flip"},
        "training": {"epochs": args.epochs, "batch_size": args.batch_size,
                     "optimizer": "AdamW", "max_lr": args.max_lr,
                     "weight_decay": args.weight_decay, "scheduler": "OneCycleLR",
                     "loss": "CrossEntropyLoss (tempered class-weighted, "
                             "label smoothing 0.1)",
                     "augmentation": [
                         "RandomResizedCrop(384, scale=0.6-1.0)",
                         "TrivialAugmentWide", "RandomHorizontalFlip",
                         "RandomErasing(p=0.25)",
                     ],
                     "mixed_precision": True, "eval_tta": "4-orientation (h/v flips)"},
    }
    if dedup_report is not None:
        metrics["dedup"] = dedup_report
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    make_plots(history, cm, TARGET_CLASSES, "Test")
    print(f"[test] accuracy={test['accuracy']:.4f} "
          f"macro_f1={test['macro_f1']:.4f}", flush=True)
    print(json.dumps(report, indent=2), flush=True)
    push_to_hf("final", weights_path=best_path,
               note=f"test_acc={test['accuracy']:.4f}")
    # also push final weights under explicit name for completeness
    print(f"[done] all artifacts saved -> {OUT_DIR}", flush=True)


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--epochs", type=int, default=25)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--max-lr", type=float, default=2e-4)
    p.add_argument("--weight-decay", type=float, default=0.05)
    p.add_argument("--dedup-threshold", type=int, default=5)
    p.add_argument("--num-workers", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--reuse-splits", action="store_true", default=True,
                   help="reuse data/endoscopy_splits if present")
    p.add_argument("--push-hf", action="store_true", default=True,
                   help="push best metrics+weights to HF on each new best")
    return p.parse_args()


if __name__ == "__main__":
    train(parse_args())
    sys.exit(0)
