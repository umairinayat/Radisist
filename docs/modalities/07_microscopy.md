# Modality: Microscopy (Histopathology)

## Model Information

| Property | Value |
|----------|-------|
| Disease key | `microscopy` |
| Classifier checkpoint | `models/disease_models/microscopy/classification/best_classifier.pt` |
| Segmentor checkpoint | None |
| Has segmentation | No |
| Multi-label | No (single-label softmax) |
| Specialist label | Histopathology Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

## Classes (2)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `metastasis` | Tumor-positive lymph node patch (cancer present) |
| 2 | `no_metastasis` | Normal tissue / no tumor cells detected in patch |

## Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `1aurent/PatchCamelyon` |
| Original dataset | **PatchCamelyon (PCam)** |
| Source dataset size | **327,680** 96×96 px H&E patches (262,144 train / 32,768 val / 32,768 test) |
| Split used | `train` (streamed, shuffled) |
| Sample script | `scripts/download_samples.py` → `do_microscopy()` |

### Split Sizes

> `metrics.json` is **not present** in the HF repo for this model — split sizes and per-class counts are not available from the checkpoint metadata.

### Test Performance (from HF model card)

| Metric | Score |
|--------|-------|
| Accuracy | Not listed in model card |
| Note | No metrics.json uploaded for this modality |

> PCam is by far the largest source dataset (~327K patches) among all modalities in this project.

## Class Mapping Logic (from download script)

```python
label 0 → "no_metastasis"
label 1 → "metastasis"
```

## Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `general_histopathology` | CAP 2020 — Cancer Protocol Templates for Histopathology Reporting |
| `gastrointestinal_pathology` | WHO 2019 — Classification of Tumours: Digestive System (5th Edition) |
| `breast_pathology` | ASCO/CAP 2023 — HER2 Testing Guidelines in Breast Cancer |
