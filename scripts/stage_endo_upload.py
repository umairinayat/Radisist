"""Stage the new ConvNeXt-Tiny endoscopy model in the HF repo's format.

Outputs under /tmp/hf_stage_endo/:
  disease_models/endoscopy/classification/best_classifier.pt
  disease_models/endoscopy/classification/metrics.json
  disease_models/endoscopy/classification/plots/*.svg
"""
import json
import shutil
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "models" / "endoscopy_convnext"
STAGE = Path("/tmp/hf_stage_endo")
CLF = STAGE / "disease_models" / "endoscopy" / "classification"
PLOTS = CLF / "plots"
CLF.mkdir(parents=True, exist_ok=True)
PLOTS.mkdir(parents=True, exist_ok=True)

metrics = json.loads((SRC / "metrics.json").read_text())
history = json.loads((SRC / "training_history.json").read_text())

shutil.copy(SRC / "best_convnext.pt", CLF / "best_classifier.pt")

report = metrics["classification_report"]
dedup_total_in = sum(v["input"] for v in metrics["dedup"].values())
dedup_total_rm = sum(v["exact"] + v["near"] for v in metrics["dedup"].values())
repo_metrics = {
    "disease_id": "endoscopy",
    "best_epoch": max(history, key=lambda h: h["val_macro_f1"])["epoch"],
    "best_val_macro_f1": metrics["best_val_macro_f1"],
    "best_val_accuracy": metrics["best_val_accuracy"],
    "test": {
        "accuracy": metrics["test_accuracy"],
        "macro_precision": report["macro avg"]["precision"],
        "macro_recall": report["macro avg"]["recall"],
        "macro_f1": metrics["test_macro_f1"],
        "confusion_matrix": metrics["confusion_matrix"],
        "loss": metrics["test_loss"],
    },
    "class_names": metrics["classes"],
    "classification_report": report,
    "architecture": {
        "backbone": "convnext_tiny",
        "pretrained_weights": "IMAGENET1K_V1",
        "head": "Linear(768, 5)",
        "input_size": 224,
        "normalization_mean": [0.485, 0.456, 0.406],
        "normalization_std": [0.229, 0.224, 0.225],
    },
    "dataset": {
        "source": ("HyperKvasir labeled images (sahilur/hyper-kvasir-labeled-"
                   "images) - INbreast-style GI endoscopy, 23 source classes "
                   "mapped to 5 target classes"),
        "classes": metrics["classes"],
        "class_mapping_note": (
            "barretts<-{barretts,barretts-short-segment}; "
            "esophagitis<-{esophagitis-a,esophagitis-b-d}; "
            "polyp<-{polyps}; "
            "ulcerative_colitis<-{ulcerative-colitis-grade-*}; "
            "healthy<-{cecum,pylorus,z-line,retroflex-rectum,"
            "retroflex-stomach,ileum}"),
        "source_classes_used": metrics["source_classes_used"],
        "n_raw_mapped": dedup_total_in,
        "n_unique_after_dedup": metrics["n_unique"],
        "duplicates_removed": dedup_total_rm,
        "dedup_method": ("MD5 exact + perceptual pHash near-duplicate "
                         "(LSH banding, mirror-aware, Hamming<=5)"),
        "n_train": metrics["n_train"],
        "n_val": metrics["n_val"],
        "n_test": metrics["n_test"],
        "split": "stratified 70/15/15, deduplicated globally before split "
                 "(no train/test leakage)",
    },
    "training": {
        "epochs": len(history),
        "batch_size": 64,
        "optimizer": "AdamW",
        "max_lr": 2e-4,
        "weight_decay": 1e-4,
        "scheduler": "OneCycleLR",
        "loss": "CrossEntropyLoss (class-weighted, label smoothing 0.05)",
        "augmentation": [
            "RandomResizedCrop(224, scale=0.7-1.0)",
            "RandomHorizontalFlip", "RandomVerticalFlip(p=0.2)",
            "RandomRotation(20)", "ColorJitter",
            "RandomErasing(p=0.15)",
        ],
        "mixed_precision": True,
    },
    "history": [
        {
            "epoch": h["epoch"],
            "train": {"loss": h["train_loss"]},
            "val": {"loss": h["val_loss"], "accuracy": h["val_accuracy"],
                    "macro_f1": h["val_macro_f1"]},
            "lr": h["lr"],
        }
        for h in history
    ],
}
(CLF / "metrics.json").write_text(json.dumps(repo_metrics, indent=2))

epochs = [h["epoch"] for h in history]
plt.figure(figsize=(7, 5))
plt.plot(epochs, [a * 100 for a in [h["val_accuracy"] for h in history]],
         marker="o", color="#2a9d8f")
plt.xlabel("Epoch"); plt.ylabel("Validation Accuracy (%)")
plt.title("Endoscopy (ConvNeXt-Tiny) - Validation Accuracy")
plt.grid(True, alpha=0.3); plt.tight_layout()
plt.savefig(PLOTS / "accuracy_curve.svg"); plt.close()

plt.figure(figsize=(7, 5))
plt.plot(epochs, [h["train_loss"] for h in history], marker="o",
         label="train", color="#e76f51")
plt.plot(epochs, [h["val_loss"] for h in history], marker="s",
         label="val", color="#264653")
plt.xlabel("Epoch"); plt.ylabel("Loss")
plt.title("Endoscopy (ConvNeXt-Tiny) - Loss Curves")
plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout()
plt.savefig(PLOTS / "loss_curve.svg"); plt.close()

plt.figure(figsize=(7, 5))
plt.plot(epochs, [f * 100 for f in [h["val_macro_f1"] for h in history]],
         marker="o", color="#457b9d")
plt.xlabel("Epoch"); plt.ylabel("Validation Macro F1 (%)")
plt.title("Endoscopy (ConvNeXt-Tiny) - Validation Macro F1")
plt.grid(True, alpha=0.3); plt.tight_layout()
plt.savefig(PLOTS / "macro_f1_curve.svg"); plt.close()

cm = np.array(metrics["confusion_matrix"])
classes = metrics["classes"]
fig, ax = plt.subplots(figsize=(6, 5.5))
im = ax.imshow(cm, cmap="Blues")
ax.set_xticks(range(len(classes))); ax.set_yticks(range(len(classes)))
ax.set_xticklabels(classes, rotation=45, ha="right")
ax.set_yticklabels(classes)
ax.set_xlabel("Predicted"); ax.set_ylabel("True")
ax.set_title("Endoscopy (ConvNeXt-Tiny) - Test Confusion Matrix")
thr = cm.max() / 2.0
for i in range(cm.shape[0]):
    for j in range(cm.shape[1]):
        ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                color="white" if cm[i, j] > thr else "black")
fig.colorbar(im, fraction=0.046, pad=0.04)
plt.tight_layout()
plt.savefig(PLOTS / "test_confusion_matrix.svg"); plt.close()

print("staged endoscopy files:")
for p in sorted(CLF.rglob("*")):
    if p.is_file():
        print(" ", p.relative_to(STAGE), f"({p.stat().st_size} bytes)")
