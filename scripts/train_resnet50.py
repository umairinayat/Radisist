"""Train a pretrained ResNet50 on the mammography dataset
(INbreast + MIAS + DDSM) for 3-class classification
(benign / malignant / normal).

- Stratified train/val/test split (70/15/15), index-based and persisted
  to data/splits/{train,val,test}.txt so the sets stay strictly separate.
- Pretrained torchvision ResNet50 (IMAGENET1K_V2) with a fresh 3-class head.
- Class-weighted cross-entropy to handle the class imbalance.
- Mixed precision + OneCycleLR.
- Saves best (by val macro-F1) and final checkpoints, full metrics and history.

Usage:
    python scripts/train_resnet50.py --epochs 12 --batch-size 64
"""

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    accuracy_score,
)
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data" / "raw" / "CLAHE_images"
SPLIT_DIR = REPO_ROOT / "data" / "splits"
MANIFEST = REPO_ROOT / "data" / "unique_manifest.json"
OUT_DIR = REPO_ROOT / "models" / "mammography_resnet50"

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
IMG_SIZE = 224

CLASSES = ["benign", "malignant", "normal"]


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


class MammographyDataset(Dataset):
    """Dataset over an explicit list of (path, label_index) pairs."""

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


def gather_samples():
    """Return (path, class_index) pairs.

    Uses the deduplicated manifest if present (only unique images -> no
    train/test leakage), otherwise falls back to all images in DATA_DIR.
    """
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text())
        samples = [(p, int(c)) for p, c in manifest["samples"]]
        print(f"[info] loaded deduped manifest: {len(samples)} unique images",
              flush=True)
        return samples

    print("[info] no manifest found; using all images in DATA_DIR",
          flush=True)
    samples = []
    for cls_idx, cls_name in enumerate(CLASSES):
        cls_dir = DATA_DIR / cls_name
        if not cls_dir.is_dir():
            raise FileNotFoundError(f"Missing class directory: {cls_dir}")
        files = sorted(
            p for p in cls_dir.iterdir()
            if p.suffix.lower() == ".png"
        )
        for p in files:
            samples.append((str(p), cls_idx))
    return samples


def make_splits(samples, seed):
    """Stratified 70/15/15 split. Returns dict of sample lists."""
    paths = [s[0] for s in samples]
    labels = [s[1] for s in samples]

    train_paths, holdout_paths, train_labels, holdout_labels = train_test_split(
        paths, labels, test_size=0.30, stratify=labels, random_state=seed
    )
    val_paths, test_paths, val_labels, test_labels = train_test_split(
        holdout_paths, holdout_labels, test_size=0.50,
        stratify=holdout_labels, random_state=seed,
    )

    splits = {
        "train": list(zip(train_paths, train_labels)),
        "val": list(zip(val_paths, val_labels)),
        "test": list(zip(test_paths, test_labels)),
    }
    return splits


def persist_splits(splits):
    SPLIT_DIR.mkdir(parents=True, exist_ok=True)
    for name, items in splits.items():
        with (SPLIT_DIR / f"{name}.txt").open("w") as fh:
            for path, label in items:
                fh.write(f"{path}\t{CLASSES[label]}\n")


def get_transforms():
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(
            IMG_SIZE, scale=(0.8, 1.0), ratio=(0.9, 1.1)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.RandomAffine(
            degrees=0, translate=(0.05, 0.05), scale=(0.95, 1.05)),
        transforms.ColorJitter(brightness=0.10, contrast=0.10),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        transforms.RandomErasing(p=0.10, scale=(0.02, 0.10)),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return train_tf, eval_tf


def build_model(num_classes, device):
    weights = models.ResNet50_Weights.IMAGENET1K_V2
    model = models.resnet50(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model.to(device)


def class_weights_for(labels, num_classes, device):
    counts = np.bincount(labels, minlength=num_classes).astype(np.float64)
    counts = np.maximum(counts, 1.0)
    weights = counts.sum() / (num_classes * counts)
    return torch.tensor(weights, dtype=torch.float32, device=device)


@torch.no_grad()
def evaluate(model, loader, device, num_classes):
    model.eval()
    all_preds, all_labels = [], []
    total_loss = 0.0
    criterion = nn.CrossEntropyLoss(reduction="sum")
    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            logits = model(images)
            loss = criterion(logits, labels)
        total_loss += loss.item()
        preds = logits.argmax(dim=1)
        all_preds.extend(preds.cpu().numpy().tolist())
        all_labels.extend(labels.cpu().numpy().tolist())
    n = len(all_labels)
    avg_loss = total_loss / max(n, 1)
    acc = accuracy_score(all_labels, all_preds)
    macro_f1 = f1_score(all_labels, all_preds, average="macro",
                       labels=list(range(num_classes)), zero_division=0)
    return {
        "loss": avg_loss,
        "accuracy": float(acc),
        "macro_f1": float(macro_f1),
        "preds": all_preds,
        "labels": all_labels,
    }


def save_checkpoint(path, model, args, extra=None):
    payload = {
        "model_state": model.state_dict(),
        "arch": "resnet50",
        "weights": "IMAGENET1K_V2",
        "class_names": CLASSES,
        "num_classes": len(CLASSES),
        "img_size": IMG_SIZE,
        "normalization_mean": IMAGENET_MEAN,
        "normalization_std": IMAGENET_STD,
        "args": vars(args),
    }
    if extra:
        payload.update(extra)
    torch.save(payload, path)


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_seed(args.seed)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[info] device={device}", flush=True)

    samples = gather_samples()
    print(f"[info] total images: {len(samples)}", flush=True)
    counts = np.bincount([s[1] for s in samples], minlength=len(CLASSES))
    for name, c in zip(CLASSES, counts):
        print(f"        {name}: {c}", flush=True)

    splits = make_splits(samples, args.seed)
    persist_splits(splits)
    for name in ("train", "val", "test"):
        print(f"[split] {name}: {len(splits[name])} images", flush=True)

    train_tf, eval_tf = get_transforms()
    train_ds = MammographyDataset(splits["train"], train_tf)
    val_ds = MammographyDataset(splits["val"], eval_tf)
    test_ds = MammographyDataset(splits["test"], eval_tf)

    nw = args.num_workers
    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size, shuffle=True,
        num_workers=nw, pin_memory=(device.type == "cuda"),
        persistent_workers=(nw > 0), drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=args.batch_size, shuffle=False,
        num_workers=nw, pin_memory=(device.type == "cuda"),
        persistent_workers=(nw > 0),
    )
    test_loader = DataLoader(
        test_ds, batch_size=args.batch_size, shuffle=False,
        num_workers=nw, pin_memory=(device.type == "cuda"),
        persistent_workers=(nw > 0),
    )

    model = build_model(len(CLASSES), device)
    weights = class_weights_for(
        [s[1] for s in splits["train"]], len(CLASSES), device)
    print(f"[info] class weights: "
          f"{dict(zip(CLASSES, [round(w.item(), 4) for w in weights]))}",
          flush=True)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.max_lr, weight_decay=args.weight_decay)
    steps_per_epoch = len(train_loader)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=args.max_lr, epochs=args.epochs,
        steps_per_epoch=steps_per_epoch, pct_start=0.1, div_factor=10.0,
        final_div_factor=100.0,
    )
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    best_f1 = -1.0
    best_acc = -1.0
    history = []
    best_path = OUT_DIR / "best_resnet50.pt"

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss, running_total = 0.0, 0
        for images, labels in train_loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
                logits = model(images)
                loss = criterion(logits, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            bs = labels.size(0)
            running_loss += loss.item() * bs
            running_total += bs
        train_loss = running_loss / max(running_total, 1)

        val = evaluate(model, val_loader, device, len(CLASSES))
        lr_now = optimizer.param_groups[0]["lr"]
        print(
            f"[epoch {epoch:02d}/{args.epochs}] "
            f"train_loss={train_loss:.4f} "
            f"val_loss={val['loss']:.4f} "
            f"val_acc={val['accuracy']:.4f} "
            f"val_macro_f1={val['macro_f1']:.4f} "
            f"lr={lr_now:.2e}",
            flush=True,
        )
        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val["loss"],
            "val_accuracy": val["accuracy"],
            "val_macro_f1": val["macro_f1"],
            "lr": lr_now,
        })

        if val["macro_f1"] > best_f1:
            best_f1 = val["macro_f1"]
            best_acc = val["accuracy"]
            save_checkpoint(
                best_path, model, args,
                extra={
                    "val_macro_f1": best_f1,
                    "val_accuracy": best_acc,
                    "epoch": epoch,
                },
            )
            print(f"          -> new best (macro_f1={best_f1:.4f}) "
                  f"saved to {best_path}", flush=True)

    final_path = OUT_DIR / "final_resnet50.pt"
    save_checkpoint(final_path, model, args, extra={"epoch": args.epochs})
    print(f"[done] best val macro_f1={best_f1:.4f} acc={best_acc:.4f}",
          flush=True)

    print("[test] evaluating best checkpoint on held-out test set...",
          flush=True)
    ckpt = torch.load(best_path, map_location=device, weights_only=False)
    model = build_model(len(CLASSES), device)
    model.load_state_dict(ckpt["model_state"])
    test = evaluate(model, test_loader, device, len(CLASSES))
    report = classification_report(
        test["labels"], test["preds"], target_names=CLASSES,
        digits=4, zero_division=0, output_dict=True,
    )
    cm = confusion_matrix(
        test["labels"], test["preds"], labels=list(range(len(CLASSES)))
    ).tolist()

    metrics = {
        "test_accuracy": test["accuracy"],
        "test_macro_f1": test["macro_f1"],
        "test_loss": test["loss"],
        "classification_report": report,
        "confusion_matrix": cm,
        "classes": CLASSES,
        "best_val_macro_f1": best_f1,
        "best_val_accuracy": best_acc,
        "n_train": len(splits["train"]),
        "n_val": len(splits["val"]),
        "n_test": len(splits["test"]),
    }
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (OUT_DIR / "training_history.json").write_text(
        json.dumps(history, indent=2))
    print(f"[test] accuracy={test['accuracy']:.4f} "
          f"macro_f1={test['macro_f1']:.4f}", flush=True)
    print(json.dumps(report, indent=2), flush=True)
    print("[done] artifacts written to "
          f"{OUT_DIR}", flush=True)


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--epochs", type=int, default=12)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--max-lr", type=float, default=3e-4)
    p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--num-workers", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


if __name__ == "__main__":
    train(parse_args())
    sys.exit(0)
