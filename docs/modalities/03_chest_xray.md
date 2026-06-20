# Modality: Chest X-Ray

## Model Information

| Property | Value |
|----------|-------|
| Disease key | `chest_xray` |
| Classifier checkpoint | `models/disease_models/chest_xray/classification/best_classifier.pt` |
| Segmentor checkpoint | None |
| Has segmentation | No |
| Multi-label | **Yes** (sigmoid per class, threshold 0.5) |
| Specialist label | Pulmonary Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

## Classes (15)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `atelectasis` | Partial or complete lung collapse |
| 2 | `cardiomegaly` | Enlarged heart (cardiothoracic ratio > 0.5) |
| 3 | `consolidation` | Airspace opacification with air bronchograms |
| 4 | `edema` | Pulmonary edema / fluid in lung tissue |
| 5 | `effusion` | Pleural effusion (fluid in pleural space) |
| 6 | `emphysema` | Hyperinflation with increased lucency |
| 7 | `fibrosis` | Pulmonary fibrosis / interstitial lung disease |
| 8 | `hernia` | Hiatal or diaphragmatic hernia |
| 9 | `infiltration` | Non-specific airspace infiltrate |
| 10 | `mass` | Focal pulmonary mass |
| 11 | `no_finding` | No pathological finding detected |
| 12 | `nodule` | Pulmonary nodule |
| 13 | `pleural_thickening` | Pleural thickening |
| 14 | `pneumonia` | Pneumonia / infectious consolidation |
| 15 | `pneumothorax` | Air in pleural space |

> This is the only **multi-label** classifier in the pipeline — a single image can be positive for multiple classes simultaneously.

## Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `BahaaEldin0/NIH-Chest-Xray-14` |
| Original dataset | **NIH ChestX-ray14** |
| Source dataset size | **112,120** frontal-view chest X-rays from 30,805 unique patients |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_chest_xray()` |

### Actual Split Sizes (from `metrics.json`)

| Split | Total |
|-------|-------|
| Train | ~72,000 |
| Validation | ~5,000 |
| Test | ~4,100 |

> `no_finding` dominates (~40–50% of samples); rare classes like `hernia` are <1%. Severe class imbalance drives the low macro F1.

### Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 20.93% |
| Macro Precision | 13.82% |
| Macro Recall | 17.34% |
| Macro F1 | 12.35% |
| Best epoch | 25 |

> Low scores are expected for this multi-label imbalanced task. The metric is macro-averaged across 15 classes including very rare ones.

## Class Mapping Logic (from download script)

```python
label_map = {
    "Atelectasis": "atelectasis",  "Cardiomegaly": "cardiomegaly",
    "Consolidation": "consolidation", "Edema": "edema",
    "Effusion": "effusion",  "Emphysema": "emphysema",
    "Fibrosis": "fibrosis",  "Hernia": "hernia",
    "Infiltration": "infiltration", "Mass": "mass",
    "No Finding": "no_finding", "Nodule": "nodule",
    "Pleural_Thickening": "pleural_thickening", "Pneumonia": "pneumonia",
    "Pneumothorax": "pneumothorax",
}
```

## Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `nodule` | Fleischner Society 2017 — Incidental Pulmonary Nodules |
| `consolidation` | ACR Appropriateness Criteria 2020 — Chest Radiograph Findings |
| `pneumothorax` | BTS 2010 — Management of Spontaneous Pneumothorax |
| `cardiomegaly` | ESC/ERS 2022 — Radiographic Assessment of Cardiothoracic Conditions |
