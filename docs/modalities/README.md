# Modality & Model Reference

This folder documents every imaging modality, disease model, class list, and training dataset used in the Radisist pipeline.

## Quick Summary

| # | Modality | Disease Model(s) | Classes | Seg. | Dataset | Train | Val | Test |
|---|----------|-----------------|---------|------|---------|-------|-----|------|
| Router | — | 7-class modality router | 7 | — | Composite | 14,000 | 1,750 | 1,750 |
| 1 | Endoscopy | `endoscopy` | 4 | Yes | Hyper-Kvasir | ~2,048 | ~213 | 265 |
| 2 | Dermatology | `dermatology` | 2 | No | HAM10000 / ISIC | 33,524 | 4,190 | 3,960 |
| 3 | X-Ray | `chest_xray` | 15 ★ | No | NIH ChestX-ray14 | ~72,000 | ~5,000 | ~4,100 |
| 4 | Ultrasound | `breast_ultrasound` | 3 | Yes | BUSI | ~624 | ~78 | 65 |
| 4 | Ultrasound | `thyroid_ultrasound` | 2 | Yes | BTX24 Thyroid | ~280 | ~34 | 35 |
| 5 | Mammography | `mammography` | 2 | Yes | CBIS-DDSM | 2,769 | 347 | 345 |
| 6 | Fundus / Retinography | `fundus_retinography` | 2 | No | APTOS 2019 | N/A† | N/A† | N/A† |
| 7 | Microscopy | `microscopy` | 2 | No | PatchCamelyon | N/A† | N/A† | N/A† |

★ Multi-label classifier  
† `metrics.json` not uploaded to HF for this model; split sizes unavailable

**Total modalities:** 7  
**Total disease models:** 8 (Ultrasound routes to 2 sub-models)  
**Total unique classes across all classifiers:** 4 + 2 + 15 + 3 + 2 + 2 + 2 + 2 = **32 classes**

## Model Backbone

All classifiers and the router share the same backbone:  
`microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224`

Architecture: BiomedCLIP visual encoder → LayerNorm(512) → ReLU → Linear(512, N)

## Test Performance Summary

| Modality | Accuracy | Macro F1 | Notes |
|----------|----------|----------|-------|
| Router | 100% | 100% | Perfect — balanced 7-class task |
| Endoscopy | 95.09% | 84.95% | — |
| Dermatology | 88.74% | 79.46% | Val/test imbalance (~17% malignant) |
| Chest X-Ray | 20.93% | 12.35% | Severe imbalance; multi-label |
| Breast Ultrasound | 92.31% | 90.75% | — |
| Thyroid Ultrasound | 88.57% | 79.89% | Very small dataset (~349 images) |
| Mammography | 66.38% | 65.94% | — |
| Fundus / Retinography | — | — | No metrics.json in HF repo |
| Microscopy | — | — | No metrics.json in HF repo |

## Dataset Size Note

Split sizes in the table above are derived from the `metrics.json` files stored in `umairinayat/medical-models` on HuggingFace (read from confusion matrices). Fundus and Microscopy do not have `metrics.json` uploaded — their splits are unknown. Source dataset column reflects the original public dataset size before splitting.

## Per-Modality Detail Files

- [00_router.md](00_router.md) — Modality router (7 classes)
- [01_endoscopy.md](01_endoscopy.md) — Endoscopy (4 classes)
- [02_dermatology.md](02_dermatology.md) — Dermatology (2 classes)
- [03_chest_xray.md](03_chest_xray.md) — Chest X-Ray (15 classes, multi-label)
- [04_ultrasound.md](04_ultrasound.md) — Ultrasound: Breast (3) + Thyroid (2)
- [05_mammography.md](05_mammography.md) — Mammography (2 classes)
- [06_fundus_retinography.md](06_fundus_retinography.md) — Fundus / Retinography (2 classes)
- [07_microscopy.md](07_microscopy.md) — Microscopy / Histopathology (2 classes)
