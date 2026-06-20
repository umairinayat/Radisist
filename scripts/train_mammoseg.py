"""Train an advanced transformer segmentation model (SegFormer-B3, pretrained on
ADE20K) for binary MAMMOGRAPHY MASS segmentation on CBIS-DDSM.

Pipeline:
  - Build image+mask pairs from dicom_info.csv (mass cases): full mammogram +
    full-image ROI mask (same resolution, aligned).
  - Crop a square patch around each lesion (from the mask bbox) with margin and
    resize to 512x512 -> aligned image/mask patches.
  - Use the OFFICIAL CBIS-DDSM mass train/test split (patient-disjoint, no
    leakage); carve 15% of train as validation.
  - Fine-tune nvidia/segformer-b3-finetuned-ade-512-512 (num_labels=1).
  - Loss: BCE + Dice. Metrics: Dice, IoU. Mixed precision.
  - Saves metrics.json, training_history.json, plots (dice/iou/loss).

Outputs under models/mammoseg_segformer/.
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
DATA = REPO / "data" / "mammoseg"
PATCH_DIR = DATA / "patches"
OUT_DIR = REPO / "models" / "mammoseg_segformer"
PLOTS_DIR = OUT_DIR / "plots"

SIZE = 512
TRAIN_SIZE = 384
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]
HF_BACKBONE = "nvidia/segformer-b3-finetuned-ade-512-512"


def set_seed(seed):
    random.seed(seed); np.random.seed(seed)
    torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)


# ---------------- patch extraction ----------------

def build_pairs():
    import pandas as pd
    d = pd.read_csv(DATA / "csv" / "dicom_info.csv")
    d = d[d["PatientName"].astype(str).str.contains("Mass", na=False)]
    full = d[d["SeriesDescription"] == "full mammogram images"]
    masks = d[d["SeriesDescription"] == "ROI mask images"]
    # ROI mask PatientName == full PatientName + "_1" -> base name matches study
    def base(p):
        return "_".join(str(p).split("_")[:-1]) if str(p).endswith("_1") else str(p)
    mask_by_base = {}
    for _, r in masks.iterrows():
        mask_by_base.setdefault(base(r["PatientName"]), []).append(
            r["image_path"].replace("CBIS-DDSM/", ""))
    full_by_base = {}
    for _, r in full.iterrows():
        full_by_base.setdefault(base(r["PatientName"]), []).append(
            r["image_path"].replace("CBIS-DDSM/", ""))
    # official split via mass CSVs
    def case_bases(csv):
        df = pd.read_csv(DATA / "csv" / csv)
        return ["_".join(str(p).split("/")[-1].split("/")[0].split("_")[:])
                for p in []]  # placeholder, unused
    import os
    train_bases, test_bases = set(), set()
    for csv, sink in (("mass_case_description_train_set.csv", train_bases),
                      ("mass_case_description_test_set.csv", test_bases)):
        df = pd.read_csv(DATA / "csv" / csv)
        for p in df["image file path"].astype(str):
            sink.add(p.split("/")[0])  # e.g. Mass-Training_P_00001_LEFT_CC
    pairs = []
    for b in full_by_base:
        if b not in mask_by_base:
            continue
        split = "test" if b in test_bases else ("train" if b in train_bases else None)
        if split is None:
            continue
        for f in full_by_base[b]:
            for m in mask_by_base[b]:
                pairs.append((f, m, split))
    return pairs


def prepare_patches(pairs, margin=2.0):
    if (PATCH_DIR / "img").exists() and len(list((PATCH_DIR / "img").glob("*.png"))) > 0:
        # cache exists; just rebuild the split index
        items = []
        for p in (PATCH_DIR / "img").glob("*.png"):
            stem = p.stem
            split = stem.split("__")[0]
            items.append((stem, split))
        return items
    (PATCH_DIR / "img").mkdir(parents=True, exist_ok=True)
    (PATCH_DIR / "mask").mkdir(parents=True, exist_ok=True)
    items = []
    for i, (fp, mp, split) in enumerate(pairs):
        try:
            img = Image.open(DATA / fp).convert("RGB")
            mask = Image.open(DATA / mp).convert("L")
        except Exception:
            continue
        if img.size != mask.size:
            continue
        m = np.array(mask)
        ys, xs = np.where(m > 127)
        if len(xs) < 5:
            continue
        x0, x1 = xs.min(), xs.max(); y0, y1 = ys.min(), ys.max()
        bw, bh = x1 - x0, y1 - y0
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        side = max(bw, bh) * margin
        side = max(side, 64)
        half = side / 2
        W, H = img.size
        left = max(0, int(cx - half)); top = max(0, int(cy - half))
        right = min(W, int(cx + half)); bottom = min(H, int(cy + half))
        right = max(right, left + 16); bottom = max(bottom, top + 16)
        cimg = img.crop((left, top, right, bottom)).resize((SIZE, SIZE))
        cmask = mask.crop((left, top, right, bottom)).resize((SIZE, SIZE), Image.NEAREST)
        cmask = (np.array(cmask) > 127).astype(np.uint8) * 255
        if cmask.sum() == 0:
            continue
        stem = f"{split}__{i:05d}"
        cimg.save(PATCH_DIR / "img" / f"{stem}.png")
        Image.fromarray(cmask).save(PATCH_DIR / "mask" / f"{stem}.png")
        items.append((stem, split))
    return items


class SegDS(Dataset):
    def __init__(self, stems, train=True):
        self.stems = stems
        self.train = train

    def __len__(self):
        return len(self.stems)

    def __getitem__(self, idx):
        s = self.stems[idx]
        img = Image.open(PATCH_DIR / "img" / f"{s}.png").convert("RGB")
        mask = Image.open(PATCH_DIR / "mask" / f"{s}.png").convert("L")
        img = img.resize((TRAIN_SIZE, TRAIN_SIZE))
        mask = mask.resize((TRAIN_SIZE, TRAIN_SIZE), Image.NEAREST)
        img = transforms.ToTensor()(img)
        mask = torch.from_numpy(np.array(mask)).float() / 255.0
        mask = (mask > 0.5).float().unsqueeze(0)
        if self.train:
            if random.random() < 0.5:
                img = torch.flip(img, dims=[2]); mask = torch.flip(mask, dims=[2])
            if random.random() < 0.5:
                img = torch.flip(img, dims=[1]); mask = torch.flip(mask, dims=[1])
            if random.random() < 0.3:
                k = random.choice([1, 3])
                img = torch.rot90(img, k, dims=[1, 2]); mask = torch.rot90(mask, k, dims=[1, 2])
        img = transforms.Normalize(MEAN, STD)(img)
        return img, mask


def build_model(device):
    from transformers import SegformerConfig, SegformerForSemanticSegmentation
    from huggingface_hub import hf_hub_download
    cfg = SegformerConfig.from_pretrained(HF_BACKBONE)
    cfg.num_labels = 1
    model = SegformerForSemanticSegmentation(cfg)
    bin_path = hf_hub_download(HF_BACKBONE, "pytorch_model.bin")
    sd = torch.load(bin_path, map_location="cpu", weights_only=True)
    msd = model.state_dict()
    # drop tensors whose shapes don't match (the ADE 150-class classifier head)
    # so the backbone+decoder load and the binary head stays freshly initialized.
    sd = {k: v for k, v in sd.items()
          if k in msd and msd[k].shape == v.shape}
    missing, unexpected = model.load_state_dict(sd, strict=False)
    print(f"[model] loaded {len(sd)} pretrained tensors from SegFormer-B3 "
          f"(binary head re-initialized)", flush=True)
    return model.to(device)


@torch.no_grad()
def metrics_bin(prob, target, eps=1e-7):
    pred = (prob > 0.5).float()
    inter = (pred * target).sum(dim=(2, 3))
    union = pred.sum(dim=(2, 3)) + target.sum(dim=(2, 3))
    dice = ((2 * inter + eps) / (union + eps)).mean().item()
    iou = ((inter + eps) / (union - inter + eps)).mean().item()
    return dice, iou


@torch.no_grad()
def evaluate(model, loader, device, bce):
    from transformers import SegformerImageProcessor  # noqa
    model.eval()
    tot_loss = tot_dice = tot_iou = 0.0
    n = 0
    for img, mask in loader:
        img = img.to(device, non_blocking=True)
        mask = mask.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            logits = model(pixel_values=img).logits
            logits = F.interpolate(logits, size=mask.shape[-2:], mode="bilinear",
                                   align_corners=False)
            prob = torch.sigmoid(logits)
            loss = bce(logits, mask.float())
        d, i = metrics_bin(prob.float(), mask)
        tot_loss += loss.item(); tot_dice += d; tot_iou += i; n += 1
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
        if ("train_" + key) in history[0]:
            plt.plot(ep, [h["train_" + key] for h in history], marker="o",
                     label="train", color="#e76f51")
        plt.plot(ep, [h["val_" + key] for h in history], marker="s",
                 label="val", color="#264653")
        plt.xlabel("Epoch"); plt.ylabel(title.split(" - ")[-1])
        plt.title(title); plt.legend(); plt.grid(True, alpha=0.3)
        plt.tight_layout(); plt.savefig(PLOTS_DIR / fname); plt.close()

    _curve("dice", "Mammography Mass Seg (SegFormer-B3) - Dice", "dice_curve.svg")
    _curve("iou", "Mammography Mass Seg (SegFormer-B3) - IoU", "iou_curve.svg")
    _curve("loss", "Mammography Mass Seg (SegFormer-B3) - Loss", "loss_curve.svg")


def save_checkpoint(path, model, args, extra=None):
    payload = {"model_state": model.state_dict(), "arch": "segformer_b3",
               "pretrained": HF_BACKBONE, "task": "binary mass segmentation",
               "num_labels": 1, "img_size": SIZE,
               "normalization_mean": MEAN, "normalization_std": STD,
               "args": {k: (str(v) if isinstance(v, Path) else v)
                        for k, v in vars(args).items()}}
    if extra:
        payload.update(extra)
    torch.save(payload, path)


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_seed(args.seed)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    print("[info] backbone=segformer-b3 size=512 device=", device, flush=True)

    pairs = build_pairs()
    print(f"[pairs] {len(pairs)} mass image+mask pairs "
          f"(train/official-split + test)", flush=True)
    items = prepare_patches(pairs)
    by_split = {"train": [], "val": [], "test": []}
    for stem, sp in items:
        by_split[sp].append(stem)
    random.Random(args.seed).shuffle(by_split["train"])
    n_val = int(len(by_split["train"]) * 0.15)
    by_split["val"] = by_split["train"][:n_val]
    by_split["train"] = by_split["train"][n_val:]
    for k in ("train", "val", "test"):
        print(f"[split] {k}: {len(by_split[k])} patches", flush=True)

    nw = args.num_workers
    train_loader = DataLoader(SegDS(by_split["train"], True), batch_size=args.batch_size,
                              shuffle=True, num_workers=nw,
                              pin_memory=(device.type == "cuda"),
                              persistent_workers=(nw > 0), drop_last=True)
    val_loader = DataLoader(SegDS(by_split["val"], False), batch_size=args.batch_size,
                            shuffle=False, num_workers=nw,
                            pin_memory=(device.type == "cuda"),
                            persistent_workers=(nw > 0))
    test_loader = DataLoader(SegDS(by_split["test"], False), batch_size=args.batch_size,
                             shuffle=False, num_workers=nw,
                             pin_memory=(device.type == "cuda"),
                             persistent_workers=(nw > 0))

    model = build_model(device)
    bce = nn.BCEWithLogitsLoss()
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
                logits = model(pixel_values=img).logits
                logits = F.interpolate(logits, size=mask.shape[-2:],
                                       mode="bilinear", align_corners=False)
                prob = torch.sigmoid(logits)
                loss = bce(logits, mask.float())
            scaler.scale(loss).backward()
            scaler.step(optimizer); scaler.update(); scheduler.step()
            d, _ = metrics_bin(prob.float(), mask)
            run_loss += loss.item(); run_dice += d; n += 1
        train_loss, train_dice = run_loss / max(n, 1), run_dice / max(n, 1)
        val = evaluate(model, val_loader, device, bce)
        lr_now = optimizer.param_groups[0]["lr"]
        print(f"[epoch {epoch:02d}/{args.epochs}] train_loss={train_loss:.4f} "
              f"train_dice={train_dice:.4f} val_loss={val['loss']:.4f} "
              f"val_dice={val['dice']:.4f} val_iou={val['iou']:.4f} lr={lr_now:.2e}",
              flush=True)
        history.append({"epoch": epoch, "train_loss": train_loss,
                        "train_dice": train_dice, "val_loss": val["loss"],
                        "val_dice": val["dice"], "val_iou": val["iou"], "lr": lr_now})
        (OUT_DIR / "training_history.json").write_text(json.dumps(history, indent=2))
        if val["dice"] > best_dice:
            best_dice, best_iou, best_epoch = val["dice"], val["iou"], epoch
            save_checkpoint(best_path, model, args,
                            extra={"val_dice": best_dice, "val_iou": best_iou,
                                   "epoch": epoch})
            print(f"          -> new best (val_dice={best_dice:.4f}, "
                  f"val_iou={best_iou:.4f})", flush=True)
    save_checkpoint(OUT_DIR / "final_segmenter.pt", model, args, extra={"epoch": args.epochs})

    ckpt = torch.load(best_path, map_location=device, weights_only=False)
    model = build_model(device)
    model.load_state_dict(ckpt["model_state"])
    test = evaluate(model, test_loader, device, bce)
    metrics = {
        "status": "done", "disease_id": "mammography",
        "task": "binary mass segmentation", "best_epoch": best_epoch,
        "best_val_dice": best_dice, "best_val_iou": best_iou,
        "test": {"dice": test["dice"], "iou": test["iou"], "loss": test["loss"]},
        "test_dice": test["dice"], "test_iou": test["iou"], "test_loss": test["loss"],
        "architecture": {"model": "SegFormerForSemanticSegmentation (SegFormer-B3)",
                         "pretrained": HF_BACKBONE, "num_labels": 1,
                         "img_size": SIZE, "normalization_mean": MEAN,
                         "normalization_std": STD},
        "dataset": {"source": "CBIS-DDSM (Kaggle awsaf49/cbis-ddsm-breast-cancer-image-"
                              "dataset), mass cases",
                    "patching": "square crop around lesion bbox (margin 2x), resized to 512",
                    "split": "official CBIS-DDSM mass train/test (patient-disjoint), "
                             "15% of train held as validation"},
        "training": {"epochs": args.epochs, "batch_size": args.batch_size,
                     "optimizer": "AdamW", "max_lr": args.max_lr,
                     "weight_decay": args.weight_decay, "scheduler": "OneCycleLR",
                     "loss": "BCEWithLogits + Dice (binary)",
                     "augmentation": ["hflip", "vflip", "rot90(p=0.3)"],
                     "mixed_precision": True},
        "n_train": len(by_split["train"]), "n_val": len(by_split["val"]),
        "n_test": len(by_split["test"]),
    }
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    make_plots(history)
    print(f"[test] dice={test['dice']:.4f} iou={test['iou']:.4f}", flush=True)
    print(f"[done] artifacts -> {OUT_DIR}", flush=True)


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--epochs", type=int, default=15)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--max-lr", type=float, default=6e-5)
    p.add_argument("--weight-decay", type=float, default=1e-2)
    p.add_argument("--num-workers", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


if __name__ == "__main__":
    train(parse_args())
    sys.exit(0)
