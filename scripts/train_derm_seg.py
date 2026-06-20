"""Dermatology SEGMENTATION (lesion masks) on HAM10000 with SegFormer-B3.
Lesion-level split (by lesion_id) so the same lesion never appears in both
train and test. BCE + Dice, mixed precision, logits interpolated to mask size.
Outputs under models/dermatology_segmentation/.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader

REPO = Path(__file__).resolve().parent.parent
HAM_IMG = REPO / "data" / "ham" / "images"
HAM_MASK = REPO / "data" / "ham" / "masks"
HAM_META = REPO / "data" / "ham_meta" / "HAM10000_metadata.csv"
OUT = REPO / "models" / "dermatology_segmentation"
spec = importlib.util.spec_from_file_location("txs", REPO / "scripts" / "train_xray_seg.py")
txs = importlib.util.module_from_spec(spec); spec.loader.exec_module(txs)
spec2 = importlib.util.spec_from_file_location("tms", REPO / "scripts" / "train_mammoseg.py")
tms = importlib.util.module_from_spec(spec2); spec2.loader.exec_module(tms)


def build_pairs_and_split(seed):
    import pandas as pd
    meta = pd.read_csv(HAM_META)
    pairs = {}  # image_id -> (img_path, mask_path)
    for iid in meta["image_id"]:
        img = HAM_IMG / (iid + ".jpg"); mk = HAM_MASK / (iid + "_segmentation.png")
        if img.exists() and mk.exists():
            pairs[iid] = (str(img), str(mk))
    # lesion-level split
    les = meta.drop_duplicates("lesion_id")[["lesion_id"]]
    tr_l, ho_l = train_test_split(les["lesion_id"], test_size=0.30, random_state=seed)
    ho = meta[meta["lesion_id"].isin(ho_l)].drop_duplicates("lesion_id")[["lesion_id"]]
    va_l, te_l = train_test_split(ho["lesion_id"], test_size=0.50, random_state=seed)
    sets = {"train": set(tr_l), "val": set(va_l), "test": set(te_l)}
    splits = {"train": [], "val": [], "test": []}
    for _, r in meta.iterrows():
        if r["image_id"] not in pairs:
            continue
        for s in sets:
            if r["lesion_id"] in sets[s]:
                splits[s].append(pairs[r["image_id"]])
    return splits


@torch.no_grad()
def evaluate(model, loader, device, bce):
    model.eval(); tl = td = ti = n = 0
    for img, mask in loader:
        img = img.to(device); mask = mask.to(device)
        with torch.amp.autocast("cuda"):
            lo = model(pixel_values=img).logits
            lo = F.interpolate(lo, size=mask.shape[-2:], mode="bilinear", align_corners=False)
            prob = torch.sigmoid(lo); loss = bce(lo, mask)
        d, i = txs.metric_dice_iou(prob.float(), mask)
        tl += loss.item(); td += d; ti += i; n += 1
    n = max(n, 1)
    return {"loss": tl / n, "dice": td / n, "iou": ti / n}


def _plots(hist):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    P = OUT / "plots"; P.mkdir(parents=True, exist_ok=True)
    ep = [h["epoch"] for h in hist]
    for key, title, fn in [("dice", "Dermatology Lesion Seg (SegFormer-B3) - Dice", "dice_curve.svg"),
                           ("iou", "Dermatology Lesion Seg (SegFormer-B3) - IoU", "iou_curve.svg"),
                           ("loss", "Dermatology Lesion Seg (SegFormer-B3) - Loss", "loss_curve.svg")]:
        plt.figure(figsize=(7, 5))
        if ("train_" + key) in hist[0]:
            plt.plot(ep, [h["train_" + key] for h in hist], marker="o", label="train")
        plt.plot(ep, [h["val_" + key] for h in hist], marker="s", label="val")
        plt.xlabel("Epoch"); plt.ylabel(title.split(" - ")[-1]); plt.title(title)
        plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout(); plt.savefig(P / fn); plt.close()


def main(args):
    import segmentation_models_pytorch as smp
    device = torch.device("cuda"); txs.set_seed(args.seed)
    OUT.mkdir(parents=True, exist_ok=True)
    splits = build_pairs_and_split(args.seed)
    for k in splits:
        print(f"[split] {k}: {len(splits[k])} image+mask pairs (lesion-level)", flush=True)
    nw = args.num_workers
    loaders = {k: DataLoader(txs.SegDataset(splits[k], train=(k == "train")), batch_size=args.batch_size,
              shuffle=(k == "train"), num_workers=nw, pin_memory=True,
              persistent_workers=(nw > 0), drop_last=(k == "train")) for k in splits}
    model = tms.build_model(device)
    bce = nn.BCEWithLogitsLoss(); dice_loss = smp.losses.DiceLoss(mode="binary", from_logits=False)
    opt = torch.optim.AdamW(model.parameters(), lr=args.max_lr, weight_decay=args.weight_decay)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.max_lr, epochs=args.epochs,
                                              steps_per_epoch=len(loaders["train"]), pct_start=0.1)
    scaler = torch.amp.GradScaler("cuda")
    best_dice = best_iou = -1; best_ep = 0; hist = []; best = OUT / "best_segmenter.pt"
    for ep in range(1, args.epochs + 1):
        model.train(); rl = rd = n = 0
        for img, mask in loaders["train"]:
            img = img.to(device); mask = mask.to(device); opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda"):
                lo = model(pixel_values=img).logits
                lo = F.interpolate(lo, size=mask.shape[-2:], mode="bilinear", align_corners=False)
                prob = torch.sigmoid(lo); loss = bce(lo, mask) + dice_loss(prob, mask)
            scaler.scale(loss).backward(); scaler.step(opt); scaler.update(); sch.step()
            d, _ = txs.metric_dice_iou(prob.float(), mask); rl += loss.item(); rd += d; n += 1
        tr_loss, tr_dice = rl / max(n, 1), rd / max(n, 1)
        v = evaluate(model, loaders["val"], device, bce); lr = opt.param_groups[0]["lr"]
        print(f"[ep {ep:02d}/{args.epochs}] tr_loss={tr_loss:.4f} tr_dice={tr_dice:.4f} "
              f"val_loss={v['loss']:.4f} val_dice={v['dice']:.4f} val_iou={v['iou']:.4f} lr={lr:.2e}", flush=True)
        hist.append({"epoch": ep, "train_loss": tr_loss, "train_dice": tr_dice,
                     "val_loss": v["loss"], "val_dice": v["dice"], "val_iou": v["iou"], "lr": lr})
        (OUT / "training_history.json").write_text(json.dumps(hist, indent=2))
        if v["dice"] > best_dice:
            best_dice, best_iou, best_ep = v["dice"], v["iou"], ep
            torch.save({"model_state": model.state_dict(), "arch": "segformer_b3",
                        "pretrained": tms.HF_BACKBONE, "in_channels": 3, "classes": 1,
                        "task": "binary lesion segmentation", "img_size": txs.IMG_SIZE,
                        "normalization_mean": txs.IMAGENET_MEAN, "normalization_std": txs.IMAGENET_STD}, best)
            print(f"      -> new best val_dice={best_dice:.4f}", flush=True)
    ck = torch.load(best, map_location=device, weights_only=False)
    model = tms.build_model(device); model.load_state_dict(ck["model_state"])
    te = evaluate(model, loaders["test"], device, bce)
    metrics = {"status": "done", "disease_id": "dermatology", "task": "binary lesion segmentation",
               "best_epoch": best_ep, "best_val_dice": best_dice, "best_val_iou": best_iou,
               "test": {"dice": te["dice"], "iou": te["iou"], "loss": te["loss"]},
               "test_dice": te["dice"], "test_iou": te["iou"], "test_loss": te["loss"],
               "architecture": {"model": "SegFormerForSemanticSegmentation (SegFormer-B3)",
                                "pretrained": tms.HF_BACKBONE, "num_labels": 1, "img_size": txs.IMG_SIZE,
                                "normalization_mean": txs.IMAGENET_MEAN, "normalization_std": txs.IMAGENET_STD},
               "dataset": {"source": "HAM10000 (surajghuwalewala/ham1000-segmentation-and-classification) lesion masks",
                           "split": "lesion-level (by lesion_id) to prevent same-lesion leakage"},
               "training": {"epochs": args.epochs, "batch_size": args.batch_size, "optimizer": "AdamW",
                            "max_lr": args.max_lr, "loss": "BCEWithLogits + Dice", "augmentation": ["hflip", "rot90(p=0.3)"],
                            "mixed_precision": True},
               "n_train": len(splits["train"]), "n_val": len(splits["val"]), "n_test": len(splits["test"])}
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2)); _plots(hist)
    print(f"[test] dice={te['dice']:.4f} iou={te['iou']:.4f}", flush=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--epochs", type=int, default=20); p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--max-lr", type=float, default=6e-5); p.add_argument("--weight-decay", type=float, default=1e-2)
    p.add_argument("--num-workers", type=int, default=8); p.add_argument("--seed", type=int, default=42)
    main(p.parse_args()); sys.exit(0)
