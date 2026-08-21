# Fine-Tuned Models — Viva Reference

This file lists every model fine-tuned for the Radisist medical-imaging pipeline, grouped by stage. Use it as a quick-reference sheet for the viva. All pushed models live at <https://huggingface.co/umairinayat/medical-models>, and the dataset at <https://huggingface.co/umairinayat/fyp-dataset>.

Total: **1 router + 7 classification + 6 segmentation = 14 fine-tuned models** (13 in production + 1 router).

---

## 1. Pipeline Overview

```
Image -> BiomedCLIP Router -> {modality} -> Classifier -> (optional) Segmentor -> Grad-CAM++ -> Report
```

| Stage | Purpose | # Models |
|-------|---------|----------|
| Modality Router | Route image to one of 7 modalities | 1 |
| Classification | Disease / abnormality detection per modality | 7 |
| Segmentation | Lesion / region-of-interest masks | 6 |

---

## 2. Master Table — All Fine-Tuned Models

| # | Stage | Domain | Backbone | Dataset | Test Result | Status |
|---|-------|--------|----------|---------|-------------|--------|
| 1 | Router | 7 modalities | BiomedCLIP ViT-B/16 | Custom 17,500-img set | **100.0% acc / 100.0% F1** | pushed |
| 2 | Cls | Mammography | ResNet50 | INbreast + MIAS + DDSM (CLAHE) | **99.63% acc / 99.72% F1** | pushed |
| 3 | Cls | Chest X-Ray | DenseNet121 | COVID-19 Radiography | **96.17% acc / 96.08% F1** | pushed |
| 4 | Cls | Endoscopy | ConvNeXt-Small | HyperKvasir (5-class) | **94.73% acc / 80.35% F1** | pushed |
| 5 | Cls | Breast Ultrasound | BiomedCLIP ViT-B/16 | BUSI | **92.31% acc / 90.75% F1** | pushed |
| 6 | Cls | Thyroid Ultrasound | BiomedCLIP ViT-B/16 | Thyroid US | **88.57% acc / 79.89% F1** | pushed |
| 7 | Seg | Chest X-Ray | UNet (EfficientNet-B0) | COVID-19 lung masks | **98.71% Dice / 97.50% IoU** | pushed |
| 8 | Seg | Mammography | SegFormer-B3 | CBIS-DDSM mass | **90.48% Dice / 83.01% IoU** | pushed |
| 9 | Seg | Endoscopy | SMP UNet++ | Kvasir-SEG | **88.52% Dice / 82.18% IoU** | legacy |
| 10 | Seg | Breast Ultrasound | SMP UNet++ | BUSI masks | **83.80% Dice / 76.17% IoU** | pushed |
| 11 | Seg | Thyroid Ultrasound | SMP UNet++ | DDTI / Thyroid masks | **83.43% Dice / 73.64% IoU** | pushed |


---

## 3. Modality Router

| Field | Value |
|-------|-------|
| File | `biomedclip_router_20260423_194004/best_biomedclip_router.pt` (748 MB) |
| Backbone | `microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224` (ViT-B/16) |
| Classes | 7 — Endoscopy, Dermatology, X-Ray, Ultrasound, Mammography, Fundus, Microscopy |
| Train / Val / Test | 14,000 / 1,750 / 1,750 (2,000 / 250 / 250 per class) |
| Best epoch | 1 |
| Test accuracy / F1 | 100% / 100% |

---

## 4. Classification Models — Detail

### 4.1 Mammography — ResNet50 (3-class)
- **Classes**: `benign`, `malignant`, `normal`
- **Dataset**: INbreast + MIAS + DDSM (CLAHE preprocessed); 26,602 raw -> **16,130 unique** after MD5 + pHash dedup
- **Split**: 11,291 / 2,419 / 2,420 (stratified 70/15/15, leakage-free)
- **Input**: 224x224, grayscale -> 3 channels, ImageNet norm
- **Training**: 15 epochs, AdamW + OneCycleLR (max_lr 3e-4), class-weighted CE, mixed precision
- **Best epoch**: 12 -> **99.63% accuracy**
- Replaces the legacy 2-class BiomedCLIP model (66% accuracy).

### 4.2 Chest X-Ray — DenseNet121 (4-class)
- **Classes**: `covid`, `lung_opacity`, `normal`, `viral_pneumonia`
- **Dataset**: COVID-19 Radiography Database (Kaggle `tawsifurrahman/covid19-radiography-database`); 19,133 unique after dedup
- **Split**: 13,393 / 2,870 / 2,870
- **Input**: 224x224, ImageNet norm; augmentation = RandomResizedCrop + TrivialAugmentWide + flip + RandomErasing
- **Training**: 15 epochs, AdamW + OneCycleLR (max_lr 2e-4, wd 0.03), label smoothing 0.1, mixed precision
- **Best epoch**: 11 -> **96.17% accuracy**
- Replaces the legacy 15-class BiomedCLIP multi-label model (~21% exact-match).

### 4.3 Endoscopy — ConvNeXt-Small (5-class, healthy added)
- **Classes**: `barretts`, `esophagitis`, `polyp`, `ulcerative_colitis`, `healthy`
- **Dataset**: HyperKvasir (23 source classes mapped to 5 targets); 6,695 unique after dedup
- **Split**: 4,686 / 1,004 / 1,005
- **Input**: 384x384, ImageNet norm
- **Training**: 22 epochs, AdamW + OneCycleLR (max_lr 2e-4, wd 0.05), label smoothing 0.1, mixed precision
- **Best epoch**: 20 -> **94.73% accuracy**
- `barretts` only has 94 images total -> caps macro-F1; other 4 classes F1 0.84-0.99.

### 4.4 Breast Ultrasound — BiomedCLIP (3-class, legacy)
- **Classes**: `benign`, `malignant`, `normal`
- **Dataset**: BUSI (Breast Ultrasound Images)
- **Best epoch**: 23 -> **92.31% accuracy / 90.75% F1** (with TTA)

### 4.5 Thyroid Ultrasound — BiomedCLIP (2-class, legacy)
- **Classes**: `low_risk`, `suspicious`
- **Best epoch**: 8 -> **88.57% accuracy / 79.89% F1**

---

## 5. Segmentation Models — Detail

### 5.1 Chest X-Ray — UNet + EfficientNet-B0 (lung)
- **Architecture**: SMP UNet, EfficientNet-B0 ImageNet encoder
- **Dataset**: COVID-19 Radiography `masks/`, 19,133 pairs
- **Loss**: BCE + Dice, image & mask @ 256x256
- **Best epoch**: 15 -> **98.71% Dice / 97.50% IoU**
- Replaces the legacy U-Net (95.84% Dice).

### 5.2 Mammography — SegFormer-B3 (mass)
- **Architecture**: SegFormer-B3, ADE20K pretrained, 1-label head
- **Dataset**: CBIS-DDSM mass cases; official patient-disjoint train/test, 512x512 patches around each lesion
- **Split**: 979 / 172 / 341 patches
- **Training**: 15 epochs @ 384px, AdamW + OneCycleLR (max_lr 6e-5), BCE + Dice, mixed precision
- **Best epoch**: 13 -> **90.48% Dice / 83.01% IoU**
- Replaces the previous UNet++ (86.31% Dice).

### 5.3 Endoscopy — SMP UNet++ (polyp, legacy)
- **Architecture**: SMP UNet++ with weighted Dice + BCE (positive_weight = 4.0)
- **Dataset**: Kvasir-SEG polyp masks
- **Best epoch**: 38 -> **88.52% Dice / 82.18% IoU**

### 5.5 Breast Ultrasound — SMP UNet++ (legacy)
- **Dataset**: BUSI masks
- **Best epoch**: 20 -> **83.80% Dice / 76.17% IoU**

### 5.6 Thyroid Ultrasound — SMP UNet++ (legacy)
- **Dataset**: DDTI / thyroid nodule masks
- **Best epoch**: 21 -> **83.43% Dice / 73.64% IoU**

---

## 6. Backbone Summary

| Backbone | Used for |
|----------|----------|
| BiomedCLIP ViT-B/16 | Router, Breast US cls, Thyroid US cls |
| ResNet50 (IMAGENET1K_V2) | Mammography cls |
| DenseNet121 (IMAGENET1K_V1, CheXNet) | Chest X-Ray cls |
| ConvNeXt-Small (IMAGENET1K_V1) | Endoscopy cls, Dermatology cls |
| SMP UNet (EfficientNet-B0) | Chest X-Ray seg |
| SMP UNet++ | Endoscopy seg, Breast US seg, Thyroid US seg |
| SegFormer-B3 (ADE20K) | Dermatology seg, Mammography seg |

---

## 7. Datasets Used

| Dataset | Source | Use |
|---------|--------|-----|
| Custom 17,500-img modality set | Curated | Router (7 modalities, 2,500 each) |
| INbreast + MIAS + DDSM (CLAHE) | Public | Mammography cls |
| CBIS-DDSM (mass) | Kaggle `awsaf49/cbis-ddsm-breast-cancer-image-dataset` | Mammography seg |
| COVID-19 Radiography Database | Kaggle `tawsifurrahman/covid19-radiography-database` | Chest X-Ray cls + seg |
| HyperKvasir (labeled) | Public | Endoscopy cls |
| Kvasir-SEG | Public | Endoscopy seg |
| fanconic/skin-cancer-malignant-vs-benign | Hugging Face | Dermatology cls (combined w/ HAM10000) |
| BUSI | Public | Breast US cls + seg |
| DDTI / Thyroid US | Public | Thyroid US cls + seg |

All datasets were de-duplicated (MD5 + perceptual pHash, mirror-aware) and split leakage-free (lesion_id / patient-level where applicable) before training.

---

## 8. Key Talking Points for Viva

1. **Two-stage pipeline**: a single router routes images to modality-specific specialists rather than training one giant model.
2. **Backbone choice matches the domain**: BiomedCLIP for small / imbalanced modalities; ImageNet CNNs (ResNet50, DenseNet121, ConvNeXt-Small) for the larger datasets where they outperform BiomedCLIP.
3. **Modern architectures for segmentation**: SegFormer-B3 (transformer) beats UNet++ on dermatology (95.25% vs ~86%) and mammography (90.48% vs 86.31%).
4. **Leakage prevention**: MD5 + perceptual hash dedup, patient/lesion-disjoint splits, global-before-split deduplication.
5. **Honest reporting**: models that did not beat the existing repo versions (Breast US, Endoscopy seg re-trains) were trained but not pushed.
6. **Reproducibility**: every pushed model ships with `metrics.json` + `training_history.json` + plots.

---

## 9. Repository

- Models: <https://huggingface.co/umairinayat/medical-models>
- Dataset: <https://huggingface.co/umairinayat/fyp-dataset>
- Pipeline source: `app/` (legacy FastAPI) + `radisist/radisist_backend/` (Django)
