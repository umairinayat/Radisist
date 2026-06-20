import logging

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import segmentation_models_pytorch as smp
from PIL import Image

from app.config import MODELS_DIR, DEVICE

logger = logging.getLogger(__name__)

SEGMENTATION_MODELS = {
    "breast_ultrasound",
    "endoscopy",
    "mammography",
    "thyroid_ultrasound",
    "chest_xray",
    "dermatology",
}

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

SEGFORMER_ENC_CHANNELS = {
    "segformer_b0": 256,
    "segformer_b1": 256,
    "segformer_b2": 768,
    "segformer_b3": 768,
    "segformer_b4": 1024,
    "segformer_b5": 1024,
}
SEGFORMER_HF_NAMES = {
    "segformer_b0": "nvidia/segformer-b0-finetuned-ade-512-512",
    "segformer_b1": "nvidia/segformer-b1-finetuned-ade-512-512",
    "segformer_b2": "nvidia/segformer-b2-finetuned-ade-512-512",
    "segformer_b3": "nvidia/segformer-b3-finetuned-ade-512-512",
    "segformer_b4": "nvidia/segformer-b4-finetuned-ade-512-512",
    "segformer_b5": "nvidia/segformer-b5-finetuned-ade-640-640",
}


class SegFormerBinary(nn.Module):
    """Wrap HuggingFace SegformerForSemanticSegmentation with a 1-channel binary head,
    matching the saved state_dict layout (`segformer.*`, `decode_head.*`)."""

    def __init__(self, arch: str = "segformer_b3"):
        super().__init__()
        from transformers import SegformerForSemanticSegmentation

        hf_name = SEGFORMER_HF_NAMES.get(arch, SEGFORMER_HF_NAMES["segformer_b3"])
        # ignore_mismatched_sizes=True lets us swap the pretrained 150-class ADE20K
        # head for a 1-channel binary head; the trained weights are applied after.
        self.net = SegformerForSemanticSegmentation.from_pretrained(
            hf_name, num_labels=1, ignore_mismatched_sizes=True
        )

    def forward(self, x):
        out = self.net(x)
        logits = out.logits if hasattr(out, "logits") else out[0]
        logits = F.interpolate(logits, size=x.shape[2:], mode="bilinear", align_corners=False)
        return logits


def _detect_seg_arch(checkpoint: dict, state: dict) -> tuple[str, str]:
    """Return (arch, encoder) inferred from checkpoint metadata or state keys."""
    arch = (checkpoint.get("arch") or checkpoint.get("architecture") or "").lower()
    if arch.startswith("segformer"):
        return arch, ""
    encoder = checkpoint.get("encoder") or checkpoint.get("encoder_name") or ""
    if arch == "smp_unet":
        return "smp_unet", encoder or "efficientnet-b0"
    if arch.startswith("smp_unetplusplus") or arch == "unetplusplus" or not arch:
        # Legacy checkpoints had architecture="smp_unetplusplus" without encoder info
        return "smp_unetplusplus", encoder or _detect_smp_encoder(state)
    if not arch:
        # Fall back to key inspection
        if any(k.startswith("segformer.encoder.") for k in state.keys()):
            return "segformer_b3", ""
        return "smp_unetplusplus", _detect_smp_encoder(state)
    return arch, encoder


def _detect_smp_encoder(state: dict) -> str:
    """Detect the SMP encoder variant by matching tensor shapes against candidates.

    Legacy UNet++ checkpoints were trained with efficientnet-b3 (1536 final channels),
    so guessing b0/resnet34 silently broke the encoder. We pick the candidate with the
    highest number of shape-matching keys.
    """
    candidates = [
        "efficientnet-b0", "efficientnet-b1", "efficientnet-b2", "efficientnet-b3",
        "efficientnet-b4", "efficientnet-b5", "efficientnet-b6", "efficientnet-b7",
        "resnet34", "resnet50", "resnext50_32x4d", "timm-efficientnet-b3",
    ]
    best_enc, best_match = "efficientnet-b0", -1
    for enc in candidates:
        try:
            m = smp.UnetPlusPlus(encoder_name=enc, encoder_weights=None, in_channels=3, classes=1)
            msd = m.state_dict()
            shared = set(msd.keys()) & set(state.keys())
            matches = sum(1 for k in shared if msd[k].shape == state[k].shape)
            if matches > best_match:
                best_match, best_enc = matches, enc
            del m
        except Exception:
            continue
    return best_enc


class DiseaseSegmentor:
    def __init__(self):
        self.loaded_models: dict[str, dict] = {}
        self.device = DEVICE

    def _load_model(self, disease: str):
        if disease in self.loaded_models:
            return

        checkpoint_path = MODELS_DIR / "disease_models" / disease / "segmentation" / "best_segmenter.pt"
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Segmentation checkpoint not found: {checkpoint_path}")

        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        model_state = checkpoint.get("model_state_dict", checkpoint.get("model_state", checkpoint))

        arch, encoder = _detect_seg_arch(checkpoint, model_state)
        img_size = checkpoint.get("img_size", 256)
        mean = checkpoint.get("normalization_mean") or IMAGENET_MEAN
        std = checkpoint.get("normalization_std") or IMAGENET_STD

        logger.info(f"Loading {disease} segmentor: arch={arch}, encoder={encoder}, size={img_size}")

        if arch.startswith("segformer"):
            model = SegFormerBinary(arch)
            model.load_state_dict(model_state, strict=False)
        elif arch == "smp_unet":
            model = smp.Unet(
                encoder_name=encoder,
                encoder_weights=None,
                in_channels=3,
                classes=1,
            )
            model.load_state_dict(model_state, strict=False)
        else:  # smp_unetplusplus (default)
            try:
                model = smp.UnetPlusPlus(
                    encoder_name=encoder,
                    encoder_weights=None,
                    in_channels=3,
                    classes=1,
                )
                model.load_state_dict(model_state, strict=False)
            except Exception:
                for fallback_enc in ["efficientnet-b0", "resnet34", "resnet50"]:
                    try:
                        model = smp.UnetPlusPlus(
                            encoder_name=fallback_enc,
                            encoder_weights=None,
                            in_channels=3,
                            classes=1,
                        )
                        model.load_state_dict(model_state, strict=True)
                        break
                    except Exception:
                        continue
                else:
                    model = smp.UnetPlusPlus(
                        encoder_name="efficientnet-b0",
                        encoder_weights=None,
                        in_channels=3,
                        classes=1,
                    )
                    model.load_state_dict(model_state, strict=False)

        model.to(self.device).eval()
        self.loaded_models[disease] = {
            "model": model,
            "img_size": img_size,
            "mean": mean,
            "std": std,
            "arch": arch,
        }
        logger.info(f"Loaded segmentor for {disease}: arch={arch}")

    @torch.no_grad()
    def predict(self, image: Image.Image, disease: str, original_size: tuple = None) -> dict:
        self._load_model(disease)
        entry = self.loaded_models[disease]
        model = entry["model"]
        img_size = entry["img_size"]
        mean = entry["mean"]
        std = entry["std"]

        img_np = np.array(image.convert("RGB"))
        if original_size is None:
            original_size = (img_np.shape[1], img_np.shape[0])

        img_resized = cv2.resize(img_np, (img_size, img_size))
        img_tensor = torch.from_numpy(img_resized).permute(2, 0, 1).float() / 255.0
        mean_t = torch.tensor(mean).view(3, 1, 1)
        std_t = torch.tensor(std).view(3, 1, 1)
        img_tensor = (img_tensor - mean_t) / std_t
        img_tensor = img_tensor.unsqueeze(0).to(self.device)

        output = model(img_tensor)
        if output.shape[-1] != img_size:
            output = F.interpolate(output, size=(img_size, img_size), mode="bilinear", align_corners=False)
        mask = torch.sigmoid(output).squeeze().cpu().numpy()

        binary_mask = (mask > 0.5).astype(np.uint8)
        binary_mask_resized = cv2.resize(binary_mask, original_size, interpolation=cv2.INTER_NEAREST)

        contours, _ = cv2.findContours(binary_mask_resized, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)
            if area < 50:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            regions.append({
                "id": i + 1,
                "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                "area_pixels": int(area),
            })

        return {
            "mask": binary_mask_resized,
            "regions": regions,
            "num_regions": len(regions),
            "has_findings": len(regions) > 0,
            "arch": entry.get("arch"),
        }


segmentor_instance = DiseaseSegmentor()
