# Modality: Endoscopy

## Model Information

| Property | Value |
|----------|-------|
| Disease key | `endoscopy` |
| Classifier checkpoint | `models/disease_models/endoscopy/classification/best_classifier.pt` |
| Segmentor checkpoint | `models/disease_models/endoscopy/segmentation/best_segmenter.pt` |
| Has segmentation | Yes (UNet++) |
| Multi-label | No (single-label softmax) |
| Specialist label | Gastrointestinal Specialist |
| Backbone | BiomedCLIP ViT-B/16 |

## Classes (4)

| # | Class Name | Description |
|---|-----------|-------------|
| 1 | `barretts` | Barrett's esophagus — columnar metaplasia of the distal esophagus |
| 2 | `esophagitis` | Erosive esophagitis graded by Los Angeles classification |
| 3 | `polyp` | Colorectal polyps classified by Paris/NICE/JNET criteria |
| 4 | `ulcerative_colitis` | Ulcerative colitis scored by Mayo Endoscopic Subscore |

## Training Dataset

| Property | Value |
|----------|-------|
| HuggingFace repo | `YukiTashiro/hyper-kvasir` |
| Original dataset | **Hyper-Kvasir** |
| Source dataset size | ~10,662 labeled images across 23 GI tract classes |
| Split used | `train` (streamed) |
| Sample script | `scripts/download_samples.py` → `do_endoscopy()` |

### Actual Split Sizes (from `metrics.json`)

| Split | Total | barretts | esophagitis | polyp | ulcerative_colitis |
|-------|-------|----------|-------------|-------|--------------------|
| Train | ~2,048 | ~528 | ~521 | ~529 | ~530 |
| Validation | ~213 | — | — | — | — |
| Test | 265 | 12 | 72 | 104 | 77 |

### Test Performance

| Metric | Score |
|--------|-------|
| Accuracy | 95.09% |
| Macro Precision | 87.49% |
| Macro Recall | 83.46% |
| Macro F1 | 84.95% |
| Best epoch | 3 |

## Class Mapping Logic (from download script)

```python
if "barrett" in class_name:     → "barretts"
if "oesophagitis"/"esophagitis" → "esophagitis"
if "polyp" in class_name:       → "polyp"
if "ulcerative-colitis":        → "ulcerative_colitis"
```

## Clinical Guidelines (RAG Source)

| Condition | Guideline |
|-----------|-----------|
| `barretts` | ESGE 2019 — Barrett's Esophagus Management |
| `esophagitis` | ACG 2022 — Erosive Esophagitis Clinical Guideline |
| `polyp` | ESGE 2020 — Colorectal Polypectomy and EMR |
| `ulcerative_colitis` | ECCO–ESGAR 2018 — UC Endoscopic Assessment |
