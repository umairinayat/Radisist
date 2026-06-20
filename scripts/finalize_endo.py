"""Finalize the endoscopy ConvNeXt-Small model: re-evaluate the best
checkpoint on the held-out test set WITHOUT test-time augmentation,
and write the final metrics.json + confusion-matrix plot (no TTA).
Training curves (accuracy/loss/macro_f1) are left as-is from history.
"""
import importlib.util
import json
from pathlib import Path

import torch
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score, f1_score,
)

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "models" / "endoscopy_convnext"

spec = importlib.util.spec_from_file_location("te", REPO / "scripts" / "train_endoscopy.py")
te = importlib.util.module_from_spec(spec)
spec.loader.exec_module(te)

device = torch.device("cuda")
_, eval_tf = te.get_transforms()
splits = te.load_existing_splits()
test_ds = te.EndoDataset(splits["test"], eval_tf)
test_loader = torch.utils.data.DataLoader(
    test_ds, batch_size=16, shuffle=False, num_workers=8,
    pin_memory=(device.type == "cuda"))

ckpt = torch.load(SRC / "best_convnext.pt", map_location=device, weights_only=False)
model = te.build_model(len(te.TARGET_CLASSES), device)
model.load_state_dict(ckpt["model_state"])

# No TTA: single center-crop forward
res = te.evaluate(model, test_loader, device, len(te.TARGET_CLASSES), tta="none")
report = classification_report(res["labels"], res["preds"],
                               target_names=te.TARGET_CLASSES, digits=4,
                               zero_division=0, output_dict=True)
cm = confusion_matrix(res["labels"], res["preds"],
                      labels=list(range(len(te.TARGET_CLASSES)))).tolist()
history = json.loads((SRC / "training_history.json").read_text())
best_epoch = max(history, key=lambda h: h["val_macro_f1"])["epoch"]
best_val_f1 = max(h["val_macro_f1"] for h in history)
best_val_acc = max(h["val_accuracy"] for h in history)

dedup_report = None
old = SRC / "metrics.json"
if old.exists():
    try:
        dedup_report = json.loads(old.read_text()).get("dedup")
    except Exception:
        dedup_report = None

metrics = {
    "status": "done", "disease_id": "endoscopy", "tta": "none",
    "best_epoch": best_epoch, "best_val_macro_f1": best_val_f1,
    "best_val_accuracy": best_val_acc,
    "test": {"accuracy": res["accuracy"],
             "macro_precision": report["macro avg"]["precision"],
             "macro_recall": report["macro avg"]["recall"],
             "macro_f1": res["macro_f1"],
             "confusion_matrix": cm, "loss": res["loss"]},
    "test_accuracy": res["accuracy"], "test_macro_f1": res["macro_f1"],
    "test_loss": res["loss"], "classification_report": report,
    "confusion_matrix": cm, "class_names": te.TARGET_CLASSES,
    "classes": te.TARGET_CLASSES,
    "n_train": len(splits["train"]), "n_val": len(splits["val"]),
    "n_test": len(splits["test"]),
    "architecture": {"backbone": "convnext_small",
                     "pretrained_weights": "IMAGENET1K_V1",
                     "head": "Linear(768, 5)", "img_size": te.IMG_SIZE,
                     "normalization_mean": te.IMAGENET_MEAN,
                     "normalization_std": te.IMAGENET_STD, "tta": "none"},
    "training": {"epochs": len(history), "batch_size": 16, "optimizer": "AdamW",
                 "max_lr": 2e-4, "weight_decay": 0.05, "scheduler": "OneCycleLR",
                 "loss": "CrossEntropyLoss (tempered class-weighted, "
                         "label smoothing 0.1)",
                 "augmentation": ["RandomResizedCrop(384, scale=0.6-1.0)",
                                  "TrivialAugmentWide",
                                  "RandomHorizontalFlip",
                                  "RandomErasing(p=0.25)"],
                 "mixed_precision": True, "eval_tta": "none"},
}
if dedup_report is not None:
    metrics["dedup"] = dedup_report
(SRC / "metrics.json").write_text(json.dumps(metrics, indent=2))

# regenerate confusion matrix plot (no TTA); leave curve plots as-is
te.make_plots(history, cm, te.TARGET_CLASSES, "Test (no TTA)")
print(f"[finalize] test_accuracy(no TTA)={res['accuracy']:.4f} "
      f"macro_f1={res['macro_f1']:.4f}")
print(json.dumps(report, indent=2))
print("[finalize] wrote metrics.json + test_confusion_matrix.svg")
