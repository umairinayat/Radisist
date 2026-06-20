"""Stage the new ResNet50 mammography model artifacts in the HF repo's format.

Builds, under a staging directory:
  disease_models/mammography/classification/best_classifier.pt   (copy of best_resnet50.pt)
  disease_models/mammography/classification/metrics.json         (repo format + extras)
  disease_models/mammography/classification/plots/*.svg          (regenerated)
  README.md                                                      (updated model card)
"""
import json
import shutil
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "models" / "mammography_resnet50"
STAGE = Path("/tmp/hf_stage")

CLF_DIR = STAGE / "disease_models" / "mammography" / "classification"
PLOTS_DIR = CLF_DIR / "plots"
CLF_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

metrics = json.loads((SRC / "metrics.json").read_text())
history = json.loads((SRC / "training_history.json").read_text())

# ---- copy weights as best_classifier.pt (repo convention) ----
shutil.copy(SRC / "best_resnet50.pt", CLF_DIR / "best_classifier.pt")

# ---- repo-format metrics.json ----
report = metrics["classification_report"]
repo_metrics = {
    "disease_id": "mammography",
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
        "backbone": "resnet50",
        "pretrained_weights": "IMAGENET1K_V2",
        "head": "Linear(2048, 3)",
        "input_size": 224,
        "input_channels": 3,
        "grayscale_to_rgb": True,
        "normalization_mean": [0.485, 0.456, 0.406],
        "normalization_std": [0.229, 0.224, 0.225],
    },
    "dataset": {
        "source": ("Kaggle: emiliovenegas1/mammography-dataset-from-inbreast-"
                   "mias-and-ddsm (INbreast + MIAS + DDSM, CLAHE preprocessed)"),
        "classes": metrics["classes"],
        "n_total_raw": 26602,
        "n_unique_after_dedup": 16130,
        "duplicates_removed": 10472,
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
        "max_lr": 3e-4,
        "weight_decay": 1e-4,
        "scheduler": "OneCycleLR",
        "loss": "CrossEntropyLoss (class-weighted)",
        "augmentation": [
            "RandomResizedCrop(224, scale=0.8-1.0)",
            "RandomHorizontalFlip",
            "RandomRotation(15)",
            "RandomAffine(translate, scale)",
            "ColorJitter(brightness, contrast)",
            "RandomErasing(p=0.1)",
        ],
        "mixed_precision": True,
    },
    "history": [
        {
            "epoch": h["epoch"],
            "train": {"loss": h["train_loss"]},
            "val": {
                "loss": h["val_loss"],
                "accuracy": h["val_accuracy"],
                "macro_f1": h["val_macro_f1"],
            },
            "lr": h["lr"],
        }
        for h in history
    ],
}
(CLF_DIR / "metrics.json").write_text(json.dumps(repo_metrics, indent=2))

# ---- plots ----
epochs = [h["epoch"] for h in history]
train_loss = [h["train_loss"] for h in history]
val_loss = [h["val_loss"] for h in history]
val_acc = [h["val_accuracy"] for h in history]
val_f1 = [h["val_macro_f1"] for h in history]

plt.figure(figsize=(7, 5))
plt.plot(epochs, [a * 100 for a in val_acc], marker="o", color="#2a9d8f")
plt.xlabel("Epoch"); plt.ylabel("Validation Accuracy (%)")
plt.title("Mammography (ResNet50) - Validation Accuracy")
plt.grid(True, alpha=0.3); plt.tight_layout()
plt.savefig(PLOTS_DIR / "accuracy_curve.svg"); plt.close()

plt.figure(figsize=(7, 5))
plt.plot(epochs, train_loss, marker="o", label="train", color="#e76f51")
plt.plot(epochs, val_loss, marker="s", label="val", color="#264653")
plt.xlabel("Epoch"); plt.ylabel("Loss")
plt.title("Mammography (ResNet50) - Loss Curves")
plt.legend(); plt.grid(True, alpha=0.3); plt.tight_layout()
plt.savefig(PLOTS_DIR / "loss_curve.svg"); plt.close()

plt.figure(figsize=(7, 5))
plt.plot(epochs, [f * 100 for f in val_f1], marker="o", color="#457b9d")
plt.xlabel("Epoch"); plt.ylabel("Validation Macro F1 (%)")
plt.title("Mammography (ResNet50) - Validation Macro F1")
plt.grid(True, alpha=0.3); plt.tight_layout()
plt.savefig(PLOTS_DIR / "macro_f1_curve.svg"); plt.close()

cm = np.array(metrics["confusion_matrix"])
classes = metrics["classes"]
fig, ax = plt.subplots(figsize=(5.5, 5))
im = ax.imshow(cm, cmap="Blues")
ax.set_xticks(range(len(classes))); ax.set_yticks(range(len(classes)))
ax.set_xticklabels(classes, rotation=45, ha="right")
ax.set_yticklabels(classes)
ax.set_xlabel("Predicted"); ax.set_ylabel("True")
ax.set_title("Mammography (ResNet50) - Test Confusion Matrix")
thr = cm.max() / 2.0
for i in range(cm.shape[0]):
    for j in range(cm.shape[1]):
        ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                color="white" if cm[i, j] > thr else "black")
fig.colorbar(im, fraction=0.046, pad=0.04)
plt.tight_layout()
plt.savefig(PLOTS_DIR / "test_confusion_matrix.svg"); plt.close()

print("staged files:")
for p in sorted(CLF_DIR.rglob("*")):
    if p.is_file():
        print(" ", p.relative_to(STAGE), f"({p.stat().st_size} bytes)")
