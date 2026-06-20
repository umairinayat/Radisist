# Modality: Mammography

## Model Information

| Property | Value |
|----------|-------|
| Disease key | `mammography` |
| Classifier checkpoint | `models/disease_models/mammography/classification/best_classifier.pt` |
| Segmentor checkpoint | `models/disease_models/mammography/segmentation/best_segmenter.pt` |
| Has segmentation | Yes (UNet++) |
| Multi-label | No (single-label softmax) |
| Specialist label | Mammography Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

## Classes (2)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `BENIGN` | BI-RADS 2–3; involuting calcified fibroadenomas, fat-containing lesions, benign calcifications |
| 2 | `MALIGNANT` | BI-RADS 4–5; spiculated masses, pleomorphic calcifications, architectural distortion |

## Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `dpetrini/cbis_ddsm_rev` |
| Original dataset | **CBIS-DDSM** (Curated Breast Imaging Subset of DDSM) |
| Source dataset size | ~3,103 cases (~10,239 ROI images) |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_mammography()` |

### Actual Split Sizes (from `metrics.json`)

| Split | Total | BENIGN | MALIGNANT |
|-------|-------|--------|-----------|
| Train | 2,769 | 1,379 | 1,390 |
| Validation | 347 | 202 | 145 |
| Test | 345 | 207 | 138 |
| **Total** | **3,461** | **1,788** | **1,673** |

### Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 66.38% |
| Macro Precision | 66.13% |
| Macro Recall | 66.79% |
| Macro F1 | 65.94% |
| Best epoch | 11 |

## Class Mapping Logic (from download script)

```python
if "/malign" in record["__key__"]:  → "MALIGNANT"
if "/benign" in record["__key__"]:  → "BENIGN"
```

## Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `MALIGNANT` | ACR BI-RADS 5th Edition — Mammography Assessment |
| `BENIGN` | ACR BI-RADS 5th Edition — Benign Mammographic Assessment |
