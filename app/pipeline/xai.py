import io
import base64
import logging

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

logger = logging.getLogger(__name__)


def _resolve_target_layers(model, arch: str):
    """Pick a Grad-CAM target layer appropriate for the model architecture."""
    arch = (arch or "").lower()

    if arch in ("", "biomedclip", "biomedclip_vitb16"):
        visual = model.backbone.visual
        return [visual.trunk.blocks[-1].norm1], "vit"

    if arch in ("resnet50", "resnet_50", "resnet"):
        return [model.layer4[-1]], None

    if arch in ("densenet121", "densenet"):
        return [model.features.denseblock4.denselayer16.norm2], None

    if arch.startswith("convnext"):
        return [model.features[7][-1].block[3]], None

    last_conv = _find_last_conv(model)
    if last_conv is not None:
        return [last_conv], None
    raise ValueError("No suitable target layer found for Grad-CAM")


def _find_last_conv(module: nn.Module) -> nn.Module | None:
    last = None
    for m in module.modules():
        if isinstance(m, (nn.Conv2d,)):
            last = m
    return last


def _vit_reshape_transform(tensor, height=14, width=14):
    if tensor.dim() == 3:
        result = tensor[:, 1:, :]
        num_patches = result.shape[1]
        h = w = int(num_patches ** 0.5)
        if h * w != num_patches:
            h = w = 14
            result = result[:, : h * w, :]
        result = result.reshape(result.shape[0], h, w, result.shape[2])
        result = result.permute(0, 3, 1, 2)
        return result
    return tensor


def generate_gradcam(
    model,
    preprocess,
    image: Image.Image,
    device: str = "cpu",
    target_class: int = None,
    arch: str = "",
) -> dict:
    """Generate a Grad-CAM++ heatmap for a classifier model."""
    try:
        from pytorch_grad_cam import GradCAMPlusPlus
        from pytorch_grad_cam.utils.image import show_cam_on_image
    except ImportError:
        logger.warning("grad-cam not installed, skipping XAI")
        return {"heatmap_base64": None, "error": "grad-cam not installed"}

    img_tensor = preprocess(image).unsqueeze(0).to(device)
    preprocess_size = getattr(preprocess, "resize_size", None) or (224, 224)
    if isinstance(preprocess_size, int):
        preprocess_size = (preprocess_size, preprocess_size)
    img_np = np.array(image.resize(preprocess_size).convert("RGB")) / 255.0

    try:
        target_layers, mode = _resolve_target_layers(model, arch)
        reshape_transform = _vit_reshape_transform if mode == "vit" else None

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

        if grayscale_cam.shape != img_np.shape[:2]:
            import cv2
            grayscale_cam = cv2.resize(grayscale_cam, (img_np.shape[1], img_np.shape[0]))

        visualization = show_cam_on_image(img_np.astype(np.float32), grayscale_cam, use_rgb=True)

        vis_image = Image.fromarray(visualization)
        buffer = io.BytesIO()
        vis_image.save(buffer, format="PNG")
        heatmap_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {"heatmap_base64": heatmap_b64, "error": None}
    except Exception as e:
        logger.error(f"Grad-CAM failed: {e}", exc_info=True)
        return {"heatmap_base64": None, "error": str(e)}
