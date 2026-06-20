"""Improve endoscopy SEGMENTATION (polyp) on Kvasir-SEG.
SMP UNet (EfficientNet-B0), BCE+Dice, mixed precision, leakage-free split.
Outputs under models/endoscopy_segmentation/.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader

REPO = Path(__file__).resolve().parent.parent
ROOT = REPO / "data" / "polyp" / "Kvasir-SEG" / "Kvasir-SEG"
OUT = REPO / "models" / "endoscopy_segmentation"
spec = importlib.util.spec_from_file_location("txs", REPO / "scripts" / "train_xray_seg.py")
txs = importlib.util.module_from_spec(spec); spec.loader.exec_module(txs)


def build_pairs():
    img_dir = ROOT / "images"; mask_dir = ROOT / "masks"
    pairs = []
    for f in sorted(img_dir.iterdir()):
        m = mask_dir / f.name
        if m.exists():
            pairs.append((str(f), str(m)))
    return pairs


def _plots(hist):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    P = OUT / "plots"; P.mkdir(parents=True, exist_ok=True)
    ep = [h["epoch"] for h in hist]
    for key, title, fn in [("dice", "Endoscopy Polyp Seg (UNet/eff-b0) - Dice", "dice_curve.svg"),
                           ("iou", "Endoscopy Polyp Seg (UNet/eff-b0) - IoU", "iou_curve.svg"),
                           ("loss", "Endoscopy Polyp Seg (UNet/eff-b0) - Loss", "loss_curve.svg")]:
        plt.figure(figsize=(7, 5))
        if ("train_" + key) in hist[0]:
            plt.plot(ep, [h["train_" + key] for h in hist], marker="o", label="train")
        plt.plot(ep, [h["val_" + key] for h in hist], marker="s", label="val")
        plt.xlabel("Epoch"); plt.ylabel(title.split(" - ")[-1]); plt.title(title)
        plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout(); plt.savefig(P / fn); plt.close()


def main(args):
    device = torch.device("cuda")
    txs.set_seed(args.seed)
    OUT.mkdir(parents=True, exist_ok=True)
    pairs = build_pairs()
    print(f"[pairs] {len(pairs)} polyp image+mask pairs", flush=True)
    tr, ho = train_test_split(pairs, test_size=0.30, random_state=args.seed)
    va, te = train_test_split(ho, test_size=0.50, random_state=args.seed)
    splits = {"train": tr, "val": va, "test": te}
    for k in splits:
        print(f"[split] {k}: {len(splits[k])}", flush=True)
    nw = args.num_workers
    loaders = {
        k: DataLoader(txs.SegDataset(splits[k], train=(k == "train")),
                      batch_size=args.batch_size, shuffle=(k == "train"), num_workers=nw,
                      pin_memory=True, persistent_workers=(nw > 0), drop_last=(k == "train"))
        for k in ("train", "val", "test")}
    model = txs.build_model(device)
    bce = nn.BCEWithLogitsLoss()
    import segmentation_models_pytorch as smp
    dice_loss = smp.losses.DiceLoss(mode="binary", from_logits=False)
    opt = torch.optim.AdamW(model.parameters(), lr=args.max_lr, weight_decay=args.weight_decay)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.max_lr, epochs=args.epochs,
                                              steps_per_epoch=len(loaders["train"]), pct_start=0.1)
    scaler = torch.amp.GradScaler("cuda")
    best_dice, best_iou, best_ep, hist = -1, -1, 0, []
    best = OUT / "best_segmenter.pt"
    for ep in range(1, args.epochs + 1):
        model.train(); rl = rd = n = 0
        for img, mask in loaders["train"]:
            img = img.to(device); mask = mask.to(device); opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda"):
                lo = model(img); prob = torch.sigmoid(lo)
                loss = bce(lo, mask) + dice_loss(prob, mask)
            scaler.scale(loss).backward(); scaler.step(opt); scaler.update(); sch.step()
            d, _ = txs.metric_dice_iou(prob.float(), mask)
            rl += loss.item(); rd += d; n += 1
        tr_loss, tr_dice = rl / max(n, 1), rd / max(n, 1)
        v = txs.evaluate(model, loaders["val"], device, bce, dice_loss); lr = opt.param_groups[0]["lr"]
        print(f"[ep {ep:02d}/{args.epochs}] tr_loss={tr_loss:.4f} tr_dice={tr_dice:.4f} "
              f"val_loss={v['loss']:.4f} val_dice={v['dice']:.4f} val_iou={v['iou']:.4f} lr={lr:.2e}", flush=True)
        hist.append({"epoch": ep, "train_loss": tr_loss, "train_dice": tr_dice,
                     "val_loss": v["loss"], "val_dice": v["dice"], "val_iou": v["iou"], "lr": lr})
        (OUT / "training_history.json").write_text(json.dumps(hist, indent=2))
        if v["dice"] > best_dice:
            best_dice, best_iou, best_ep = v["dice"], v["iou"], ep
            torch.save({"model_state": model.state_dict(), "arch": "smp_unet",
                        "encoder": "efficientnet-b0", "encoder_weights": "imagenet",
                        "in_channels": 3, "classes": 1, "task": "binary polyp segmentation",
                        "img_size": txs.IMG_SIZE, "normalization_mean": txs.IMAGENET_MEAN,
                        "normalization_std": txs.IMAGENET_STD}, best)
            print(f"      -> new best val_dice={best_dice:.4f}", flush=True)
    ck = torch.load(best, map_location=device, weights_only=False)
    model = txs.build_model(device); model.load_state_dict(ck["model_state"])
    te = txs.evaluate(model, loaders["test"], device, bce, dice_loss)
    metrics = {"status": "done", "disease_id": "endoscopy", "task": "binary polyp segmentation",
               "best_epoch": best_ep, "best_val_dice": best_dice, "best_val_iou": best_iou,
               "test": {"dice": te["dice"], "iou": te["iou"], "loss": te["loss"]},
               "test_dice": te["dice"], "test_iou": te["iou"], "test_loss": te["loss"],
               "architecture": {"model": "smp.Unet", "encoder": "efficientnet-b0",
                                "encoder_weights": "imagenet", "in_channels": 3, "classes": 1,
                                "img_size": txs.IMG_SIZE},
               "dataset": {"source": "Kvasir-SEG (debeshjha1/kvasirseg), 1000 polyp images+masks"},
               "training": {"epochs": args.epochs, "batch_size": args.batch_size,
                            "optimizer": "AdamW", "max_lr": args.max_lr, "loss": "BCEWithLogits + Dice",
                            "augmentation": ["hflip", "rot90(p=0.3)"], "mixed_precision": True},
               "n_train": len(splits["train"]), "n_val": len(splits["val"]), "n_test": len(splits["test"])}
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    _plots(hist)
    print(f"[test] dice={te['dice']:.4f} iou={te['iou']:.4f}", flush=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--epochs", type=int, default=25); p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--max-lr", type=float, default=3e-4); p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--num-workers", type=int, default=8); p.add_argument("--seed", type=int, default=42)
    main(p.parse_args()); sys.exit(0)
