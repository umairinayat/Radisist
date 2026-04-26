import logging

import cv2
import numpy as np
import torch
import segmentation_models_pytorch as smp
from PIL import Image

from app.config import MODELS_DIR, DEVICE

logger = logging.getLogger(__name__)

SEGMENTATION_MODELS = {
    "breast_ultrasound",
    "endoscopy",
    "mammography",
    "thyroid_ultrasound",
}


class DiseaseSegmentor:
    def __init__(self):
        self.loaded_models: dict[str, dict] = {}
        self.device = DEVICE

    def _load_model(self, disease: str):
        if disease in self.loaded_models:
            return

        if disease not in SEGMENTATION_MODELS:
            raise ValueError(f"No segmentation model for: {disease}")

        checkpoint_path = MODELS_DIR / "disease_models" / disease / "segmentation" / "best_segmenter.pt"
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Segmentation checkpoint not found: {checkpoint_path}")

        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        model_state = checkpoint.get("model_state_dict", checkpoint)

        # Determine encoder from checkpoint keys
        # SMP UNet++ with various encoders
        try:
            model = smp.UnetPlusPlus(
                encoder_name="resnet34",
                encoder_weights=None,
                in_channels=3,
                classes=1,
            )
            model.load_state_dict(model_state, strict=False)
        except Exception:
            # Try other common encoders
            for encoder in ["resnet50", "efficientnet-b4", "vgg16"]:
                try:
                    model = smp.UnetPlusPlus(
                        encoder_name=encoder,
                        encoder_weights=None,
                        in_channels=3,
                        classes=1,
                    )
                    model.load_state_dict(model_state, strict=True)
                    break
                except Exception:
                    continue
            else:
                # Last resort: load with strict=False
                model = smp.UnetPlusPlus(
                    encoder_name="resnet34",
                    encoder_weights=None,
                    in_channels=3,
                    classes=1,
                )
                model.load_state_dict(model_state, strict=False)

        model.to(self.device).eval()
        self.loaded_models[disease] = {"model": model}
        logger.info(f"Loaded segmentor for {disease}")

    @torch.no_grad()
    def predict(self, image: Image.Image, disease: str, original_size: tuple = None) -> dict:
        self._load_model(disease)
        model = self.loaded_models[disease]["model"]

        # Preprocess for segmentation
        img_np = np.array(image.convert("RGB"))
        if original_size is None:
            original_size = (img_np.shape[1], img_np.shape[0])

        # Resize to 256x256 for segmentation
        img_resized = cv2.resize(img_np, (256, 256))
        img_tensor = torch.from_numpy(img_resized).permute(2, 0, 1).float() / 255.0
        # Normalize with ImageNet stats
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        img_tensor = (img_tensor - mean) / std
        img_tensor = img_tensor.unsqueeze(0).to(self.device)

        # Inference
        output = model(img_tensor)
        mask = torch.sigmoid(output).squeeze().cpu().numpy()

        # Threshold
        binary_mask = (mask > 0.5).astype(np.uint8)

        # Resize mask back to original size
        binary_mask_resized = cv2.resize(binary_mask, original_size, interpolation=cv2.INTER_NEAREST)

        # Find contours for region info
        contours, _ = cv2.findContours(binary_mask_resized, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)
            if area < 50:  # skip tiny regions
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
        }


segmentor_instance = DiseaseSegmentor()
