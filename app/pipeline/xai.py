import io
import base64
import logging

import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)


def generate_gradcam(
    model,
    preprocess,
    image: Image.Image,
    device: str = "cpu",
    target_class: int = None,
) -> dict:
    """Generate Grad-CAM++ heatmap for a BiomedCLIPClassifier model."""
    try:
        from pytorch_grad_cam import GradCAMPlusPlus
        from pytorch_grad_cam.utils.image import show_cam_on_image
    except ImportError:
        logger.warning("grad-cam not installed, skipping XAI")
        return {"heatmap_base64": None, "error": "grad-cam not installed"}

    img_tensor = preprocess(image).unsqueeze(0).to(device)
    img_np = np.array(image.resize((224, 224)).convert("RGB")) / 255.0

    # Target layer: last transformer block's layer norm in the visual trunk
    visual = model.backbone.visual
    trunk = visual.trunk
    target_layers = [trunk.blocks[-1].norm1]

    # Reshape transform for ViT (remove CLS token, reshape to spatial)
    def reshape_transform(tensor, height=14, width=14):
        if tensor.dim() == 3:
            result = tensor[:, 1:, :]
            num_patches = result.shape[1]
            h = w = int(num_patches ** 0.5)
            if h * w != num_patches:
                h = w = 14
                result = result[:, :h*w, :]
            result = result.reshape(result.shape[0], h, w, result.shape[2])
            result = result.permute(0, 3, 1, 2)
            return result
        return tensor

    try:
        cam = GradCAMPlusPlus(
            model=model,
            target_layers=target_layers,
            reshape_transform=reshape_transform,
        )

        targets = None
        if target_class is not None:
            from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
            targets = [ClassifierOutputTarget(target_class)]

        grayscale_cam = cam(input_tensor=img_tensor, targets=targets)
        grayscale_cam = grayscale_cam[0]

        visualization = show_cam_on_image(img_np.astype(np.float32), grayscale_cam, use_rgb=True)

        vis_image = Image.fromarray(visualization)
        buffer = io.BytesIO()
        vis_image.save(buffer, format="PNG")
        heatmap_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {"heatmap_base64": heatmap_b64, "error": None}
    except Exception as e:
        logger.error(f"Grad-CAM failed: {e}", exc_info=True)
        return {"heatmap_base64": None, "error": str(e)}
