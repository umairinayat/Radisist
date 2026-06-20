# Modality Router

## Overview

The router is the first stage of the Radisist pipeline. It receives a raw medical image and classifies it into one of **7 imaging modalities**, which determines which downstream disease classifier (and optional segmentor) is invoked.

- **Model file:** `models/biomedclip_router/best_biomedclip_router.pt`
- **Backbone:** `microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224`
- **Architecture:** BiomedCLIP visual encoder → LayerNorm(512) → ReLU → Linear(512, 7)
- **Low-confidence threshold:** < 0.75 → flagged for manual review

## Training Data (from `metrics.json`)

| Split | Images | Per Class |
|-------|--------|-----------|
| Train | 14,000 | 2,000 each |
| Validation | 1,750 | 250 each |
| Test | 1,750 | 250 each |
| **Total** | **17,500** | balanced |

All 7 modality classes are perfectly balanced across every split.

## Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 100% |
| Macro Precision | 100% |
| Macro Recall | 100% |
| Macro F1 | 100% |
| Best epoch | 1 |

## Classes (7)

| Index | Modality Label | Maps To Disease Model(s) |
|-------|---------------|--------------------------|
| 0 | Endoscopy | `endoscopy` |
| 1 | Dermatology | `dermatology` |
| 2 | X-Ray | `chest_xray` |
| 3 | Ultrasound | `breast_ultrasound`, `thyroid_ultrasound` |
| 4 | Mammography | `mammography` |
| 5 | Fundus / Retinography | `fundus_retinography` |
| 6 | Microscopy | `microscopy` |

## Pipeline Role

```
Image → [Router] → modality label → [Disease Classifier(s)] → [Segmentor?] → [Grad-CAM++] → [Report]
```

The router outputs the top predicted modality plus top-3 confidence scores. If confidence is below 0.75, the result is flagged so the user or clinician can override the routing decision.
