# Modality: Fundus / Retinography

## Model Information

| Property | Value |
|----------|-------|
| Disease key | `fundus_retinography` |
| Classifier checkpoint | `models/disease_models/fundus_retinography/classification/best_classifier.pt` |
| Segmentor checkpoint | None |
| Has segmentation | No |
| Multi-label | No (single-label softmax) |
| Specialist label | Ophthalmology Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

## Classes (2)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `no_retinal_disease` | No apparent retinopathy (DR severity level 0 — normal) |
| 2 | `retinal_disease` | Any degree of diabetic retinopathy present (DR severity levels 1–4) |

> The two-class split is derived from the APTOS 2019 5-level severity scale: level 0 → `no_retinal_disease`, levels 1–4 → `retinal_disease`.

## Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `EslamHasan/APTOS2019DiabeticRetinopathy` |
| Original dataset | **APTOS 2019 Blindness Detection** (Kaggle) |
| Source dataset size | **3,662** retinal fundus images across 5 DR severity levels |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_fundus()` |

### Split Sizes

> `metrics.json` is **not present** in the HF repo for this model — split sizes and per-class counts are not available from the checkpoint metadata.

### Test Performance (from HF model card)

| Metric | Score |
|--------|-------|
| Accuracy | Not listed in model card |
| Note | No metrics.json uploaded for this modality |

## Class Mapping Logic (from download script)

```python
if label == 0:     → "no_retinal_disease"
if 1 <= label <= 4 → "retinal_disease"
```

## Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `diabetic_retinopathy` | AAO PPP 2019 — Diabetic Retinopathy |
| `glaucoma` | EGS 2020 — European Glaucoma Society Guidelines |
| `age_related_macular_degeneration` | AAO PPP 2019 — Age-Related Macular Degeneration |

> The knowledge base includes guidelines for DR, glaucoma, and AMD even though the classifier only outputs a binary retinal disease flag. The report engine uses RAG to pull the most relevant guideline for the predicted finding.
