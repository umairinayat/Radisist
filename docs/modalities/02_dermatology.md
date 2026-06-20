# Modality: Dermatology

## Model Information

| Property | Value |
|----------|-------|
| Disease key | `dermatology` |
| Classifier checkpoint | `models/disease_models/dermatology/classification/best_classifier.pt` |
| Segmentor checkpoint | None |
| Has segmentation | No |
| Multi-label | No (single-label softmax) |
| Specialist label | Dermatology Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

## Classes (2)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `malignant` | Melanoma, basal cell carcinoma, actinic keratoses |
| 2 | `non_malignant` | Melanocytic naevi, vascular lesions, dermatofibroma, benign keratosis-like lesions |

## Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `marmal88/skin_cancer` |
| Original dataset | **HAM10000** / ISIC skin lesion dataset |
| Source dataset size | ~10,015 dermoscopic images across 7 diagnostic categories |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_dermatology()` |

### Actual Split Sizes (from `metrics.json`)

| Split | Total | malignant | non_malignant |
|-------|-------|-----------|---------------|
| Train | 33,524 | 16,718 | 16,806 |
| Validation | 4,190 | 685 | 3,505 |
| Test | 3,960 | 682 | 3,278 |

> Training was balanced (~50/50), but validation/test reflect the natural class imbalance (~17% malignant).

### Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 88.74% |
| Macro Precision | 79.3% |
| Macro Recall | 79.6% |
| Macro F1 | 79.46% |
| Best epoch | 26 |

## Class Mapping Logic (from download script)

```python
malignant_dx     = {"melanoma", "basal_cell_carcinoma", "actinic_keratoses"}
non_malignant_dx = {"melanocytic_Nevi", "vascular_lesions", "dermatofibroma", "benign_keratosis-like_lesions"}
```

## Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `malignant` | AAD 2019 — Guidelines for Management of Primary Cutaneous Melanoma |
| `non_malignant` | BAD 2021 — Guidelines for Management of Benign Skin Lesions |
