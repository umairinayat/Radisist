"""Train a segmentation model (SMP UNet, EfficientNet-B0 ImageNet encoder) for
binary lung-region segmentation on the COVID-19 Radiography Database, using the
<class>/masks/ provided alongside the images.

Reuses the leakage-free split produced by train_xray.py
(data/xray_splits/{train,val,test}.txt) so the segmentation test images match
the classification test images exactly.

Saves metrics.json, training_history.json, plots (dice/iou/loss curves) under
models/xray_segmentation/.
"""

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

REPO = Path(__file__).resolve().parent.parent
SPLIT_DIR = REPO / "data" / "xray_splits"
OUT_DIR = REPO / "models" / "xray_segmentation"
PLOTS_DIR = OUT_DIR / "plots"

IMG_SIZE = 256
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
TARGET_CLASSES = ["covid", "lung_opacity", "normal", "viral_pneumonia"]


def set_seed(seed):
    random.seed(seed); np.random.seed(seed)
    torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)


def load_split(name):
    items = []
    for line in (SPLIT_DIR / f"{name}.txt").read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        path, cls = line.rsplit("\t", 1)
        mask = path.replace("/images/", "/masks/")
        items.append((path, mask))
    return items


class SegDataset(Dataset):
    def __init__(self, items, train=True):
        self.items = items
        self.train = train
        self.norm = transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        ipath, mpath = self.items[idx]
        img = Image.open(ipath).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
        mask = Image.open(mpath).convert("L").resize((IMG_SIZE, IMG_SIZE))
        img = transforms.ToTensor()(img)
        mask = torch.from_numpy(np.array(mask)).float() / 255.0
        mask = (mask > 0.5).float().unsqueeze(0)
        if self.train:
            if random.random() < 0.5:
                img = torch.flip(img, dims=[2]); mask = torch.flip(mask, dims=[2])
            if random.random() < 0.3:
                k = random.choice([1, 3])
                img = torch.rot90(img, k, dims=[1, 2])
                mask = torch.rot90(mask, k, dims=[1, 2])
        img = self.norm(img)
        return img, mask


def build_model(device):
    import segmentation_models_pytorch as smp
    model = smp.Unet(
        encoder_name="efficientnet-b0", encoder_weights="imagenet",
        in_channels=3, classes=1, activation=None,
    )
    return model.to(device)


@torch.no_grad()
def metric_dice_iou(pred, target, eps=1e-7):
    pred = (pred > 0.5).float()
    inter = (pred * target).sum(dim=(2, 3))
    union = pred.sum(dim=(2, 3)) + target.sum(dim=(2, 3))
    dice = ((2 * inter + eps) / (union + eps)).mean().item()
    iou = ((inter + eps) / (union - inter + eps)).mean().item()
    return dice, iou


@torch.no_grad()
def evaluate(model, loader, device, bce, dice_loss):
    model.eval()
    tot_loss = tot_dice = tot_iou = 0.0
    n = 0
    for img, mask in loader:
        img = img.to(device, non_blocking=True)
        mask = mask.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            logits = model(img)
            prob = torch.sigmoid(logits)
            loss = bce(logits, mask) + dice_loss(prob, mask)
        d, i = metric_dice_iou(prob.float(), mask)
        tot_loss += loss.item(); tot_dice += d; tot_iou += i
        n += 1
    n = max(n, 1)
    return {"loss": tot_loss / n, "dice": tot_dice / n, "iou": tot_iou / n}


def make_plots(history):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    ep = [h["epoch"] for h in history]

    def _curve(key, title, fname):
        plt.figure(figsize=(7, 5))
        tkey = "train_" + key
        if tkey in history[0]:
            plt.plot(ep, [h[tkey] for h in history], marker="o",
                     label="train", color="#e76f51")
        plt.plot(ep, [h["val_" + key] for h in history], marker="s",
                 label="val", color="#264653")
        plt.xlabel("Epoch"); plt.ylabel(title.split(" - ")[-1])
        plt.title(title); plt.legend(); plt.grid(True, alpha=0.3)
        plt.tight_layout(); plt.savefig(PLOTS_DIR / fname); plt.close()

    _curve("dice", "Chest X-Ray Seg (UNet/eff-b0) - Dice", "dice_curve.svg")
    _curve("iou", "Chest X-Ray Seg (UNet/eff-b0) - IoU", "iou_curve.svg")
    _curve("loss", "Chest X-Ray Seg (UNet/eff-b0) - Loss", "loss_curve.svg")


def save_checkpoint(path, model, args, extra=None):
    payload = {"model_state": model.state_dict(), "arch": "smp_unet",
               "encoder": "efficientnet-b0", "encoder_weights": "imagenet",
               "in_channels": 3, "classes": 1, "task": "binary lung segmentation",
               "img_size": IMG_SIZE,
               "normalization_mean": IMAGENET_MEAN, "normalization_std": IMAGENET_STD,
               "args": {k: (str(v) if isinstance(v, Path) else v)
                        for k, v in vars(args).items()}}
    if extra:
        payload.update(extra)
    torch.save(payload, path)


def train(args):
    import segmentation_models_pytorch as smp
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_seed(args.seed)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[info] seg backbone=unet/efficientnet-b0 img={IMG_SIZE} device={device}",
          flush=True)

    splits = {n: load_split(n) for n in ("train", "val", "test")}
    for k in splits:
        print(f"[split] {k}: {len(splits[k])} image-mask pairs", flush=True)

    train_ds = SegDataset(splits["train"], train=True)
    val_ds = SegDataset(splits["val"], train=False)
    test_ds = SegDataset(splits["test"], train=False)
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

    model = build_model(device)
    bce = nn.BCEWithLogitsLoss()
    dice_loss = smp.losses.DiceLoss(mode="binary", from_logits=False)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.max_lr,
                                  weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=args.max_lr, epochs=args.epochs,
        steps_per_epoch=len(train_loader), pct_start=0.1, div_factor=10.0,
        final_div_factor=100.0)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    best_dice, best_iou, best_epoch = -1.0, -1.0, 0
    history = []
    best_path = OUT_DIR / "best_segmenter.pt"
    for epoch in range(1, args.epochs + 1):
        model.train()
        run_loss, run_dice, n = 0.0, 0.0, 0
        for img, mask in train_loader:
            img = img.to(device, non_blocking=True)
            mask = mask.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
                logits = model(img)
                prob = torch.sigmoid(logits)
                loss = bce(logits, mask) + dice_loss(prob, mask)
            scaler.scale(loss).backward()
            scaler.step(optimizer); scaler.update(); scheduler.step()
            d, _ = metric_dice_iou(prob.float(), mask)
            run_loss += loss.item(); run_dice += d; n += 1
        train_loss = run_loss / max(n, 1)
        train_dice = run_dice / max(n, 1)
        val = evaluate(model, val_loader, device, bce, dice_loss)
        lr_now = optimizer.param_groups[0]["lr"]
        print(f"[epoch {epoch:02d}/{args.epochs}] train_loss={train_loss:.4f} "
              f"train_dice={train_dice:.4f} val_loss={val['loss']:.4f} "
              f"val_dice={val['dice']:.4f} val_iou={val['iou']:.4f} "
              f"lr={lr_now:.2e}", flush=True)
        history.append({"epoch": epoch, "train_loss": train_loss,
                        "train_dice": train_dice, "val_loss": val["loss"],
                        "val_dice": val["dice"], "val_iou": val["iou"],
                        "lr": lr_now})
        (OUT_DIR / "training_history.json").write_text(json.dumps(history, indent=2))
        if val["dice"] > best_dice:
            best_dice, best_iou, best_epoch = val["dice"], val["iou"], epoch
            save_checkpoint(best_path, model, args,
                            extra={"val_dice": best_dice, "val_iou": best_iou,
                                   "epoch": epoch})
            print(f"          -> new best (val_dice={best_dice:.4f}, "
                  f"val_iou={best_iou:.4f})", flush=True)
    save_checkpoint(OUT_DIR / "final_segmenter.pt", model, args,
                    extra={"epoch": args.epochs})
    print(f"[done] best epoch {best_epoch} val_dice={best_dice:.4f} "
          f"val_iou={best_iou:.4f}", flush=True)

    ckpt = torch.load(best_path, map_location=device, weights_only=False)
    model = build_model(device)
    model.load_state_dict(ckpt["model_state"])
    test = evaluate(model, test_loader, device, bce, dice_loss)
    metrics = {
        "status": "done", "disease_id": "chest_xray", "task": "binary lung segmentation",
        "best_epoch": best_epoch, "best_val_dice": best_dice, "best_val_iou": best_iou,
        "test": {"dice": test["dice"], "iou": test["iou"], "loss": test["loss"]},
        "test_dice": test["dice"], "test_iou": test["iou"], "test_loss": test["loss"],
        "architecture": {"model": "smp.Unet", "encoder": "efficientnet-b0",
                         "encoder_weights": "imagenet", "in_channels": 3,
                         "classes": 1, "img_size": IMG_SIZE,
                         "normalization_mean": IMAGENET_MEAN,
                         "normalization_std": IMAGENET_STD},
        "dataset": {"source": ("Kaggle tawsifurrahman/covid19-radiography-"
                               "database (COVID-19 Radiography Database)"),
                    "mask_type": "binary lung region (0/255)"},
        "training": {"epochs": args.epochs, "batch_size": args.batch_size,
                     "optimizer": "AdamW", "max_lr": args.max_lr,
                     "weight_decay": args.weight_decay, "scheduler": "OneCycleLR",
                     "loss": "BCEWithLogits + Dice",
                     "augmentation": ["RandomHorizontalFlip", "RandomRot90(p=0.3)"],
                     "mixed_precision": True},
        "n_train": len(splits["train"]), "n_val": len(splits["val"]),
        "n_test": len(splits["test"]),
    }
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    make_plots(history)
    print(f"[test] dice={test['dice']:.4f} iou={test['iou']:.4f}", flush=True)
    print(f"[done] artifacts -> {OUT_DIR}", flush=True)


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--epochs", type=int, default=15)
    p.add_argument("--batch-size", type=int, default=24)
    p.add_argument("--max-lr", type=float, default=3e-4)
    p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--num-workers", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


if __name__ == "__main__":
    train(parse_args())
    sys.exit(0)
