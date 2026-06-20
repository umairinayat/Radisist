# Modality: Ultrasound

The Ultrasound modality routes to **two separate disease models** run in parallel: one for breast and one for thyroid. Both share the same BiomedCLIP backbone.

---

## Model A — Breast Ultrasound

| Property | Value |
|----------|-------|
| Disease key | `breast_ultrasound` |
| Classifier checkpoint | `models/disease_models/breast_ultrasound/classification/best_classifier.pt` |
| Segmentor checkpoint | `models/disease_models/breast_ultrasound/segmentation/best_segmenter.pt` |
| Has segmentation | Yes (UNet++) |
| Multi-label | No (single-label softmax) |
| Specialist label | Breast Ultrasound Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

### Classes (3)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `benign` | Benign lesion (BI-RADS 2–3); oval, circumscribed, parallel orientation |
| 2 | `malignant` | Malignant lesion (BI-RADS 4C–5); irregular, spiculated, posterior shadowing |
| 3 | `normal` | No focal abnormality; homogeneous echotexture |

### Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `m-nast76/breast-ultrasound-dataset` |
| Original dataset | **BUSI** (Breast Ultrasound Images Dataset) |
| Source dataset size | ~780 images total |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_breast_ultrasound()` |

#### Actual Split Sizes (from `metrics.json`)

| Split | Total | benign | malignant | normal |
|-------|-------|--------|-----------|--------|
| Train | ~624 | ~207 | ~188 | ~229 |
| Validation | ~78 | ~39 | ~20 | ~19 |
| Test | 65 | 42 | 14 | 16 |

#### Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 92.31% |
| Macro Precision | 89.79% |
| Macro Recall | 91.85% |
| Macro F1 | 90.75% |
| Best epoch | 23 |

### Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `malignant` | ACR BI-RADS 5th Edition — Ultrasound Lexicon |
| `benign` | ACR BI-RADS 5th Edition — Benign Ultrasound Assessment |
| `normal` | ACR Practice Parameter 2020 — Breast Ultrasound Examination |

---

## Model B — Thyroid Ultrasound

| Property | Value |
|----------|-------|
| Disease key | `thyroid_ultrasound` |
| Classifier checkpoint | `models/disease_models/thyroid_ultrasound/classification/best_classifier.pt` |
| Segmentor checkpoint | `models/disease_models/thyroid_ultrasound/segmentation/best_segmenter.pt` |
| Has segmentation | Yes (UNet++) |
| Multi-label | No (single-label softmax) |
| Specialist label | Thyroid Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

### Classes (2)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `low_risk` | Low-suspicion pattern; malignancy risk <10%; FNA at ≥15 mm |
| 2 | `suspicious` | High-suspicion pattern (TI-RADS TR4/5); FNA recommended ≥5–10 mm |

### Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `BTX24/thyroid-cancer-classification-ultrasound-dataset` |
| Original dataset | BTX24 Thyroid Ultrasound Dataset |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_thyroid()` |

#### Actual Split Sizes (from `metrics.json`)

| Split | Total | low_risk | suspicious |
|-------|-------|----------|------------|
| Train | ~280 | — | — |
| Validation | ~34 | — | — |
| Test | 35 | 5 | 30 |

> Very small dataset — only 349 images total across all splits.

#### Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 88.57% |
| Macro Precision | 76.79% |
| Macro Recall | 85.00% |
| Macro F1 | 79.89% |
| Best epoch | 8 |

### Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `suspicious` | ACR TI-RADS 2017 — Thyroid Imaging Reporting and Data System |
| `low_risk` | ATA 2015 — Management Guidelines for Thyroid Nodules |

---

## Routing Note

Both models always run when the router predicts `Ultrasound` (index 3). The pipeline collects results from both and includes both in the report.
