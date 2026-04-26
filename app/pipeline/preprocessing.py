import io
import logging

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff", "application/dicom"}


def validate_image(file_bytes: bytes, content_type: str) -> bool:
    try:
        Image.open(io.BytesIO(file_bytes)).verify()
        return True
    except Exception:
        return False


def load_image(file_bytes: bytes) -> Image.Image:
    # Try DICOM first
    try:
        import pydicom
        ds = pydicom.dcmread(io.BytesIO(file_bytes))
        pixel_array = ds.pixel_array
        if len(pixel_array.shape) == 2:
            pixel_array = cv2.cvtColor(pixel_array.astype(np.uint8), cv2.COLOR_GRAY2RGB)
        return Image.fromarray(pixel_array)
    except Exception:
        pass

    return Image.open(io.BytesIO(file_bytes)).convert("RGB")


def apply_clahe(image: Image.Image) -> Image.Image:
    img_np = np.array(image)
    lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    return Image.fromarray(result)


def preprocess_for_classification(image: Image.Image) -> Image.Image:
    image = apply_clahe(image)
    image = image.resize((224, 224), Image.LANCZOS)
    return image


def preprocess_for_segmentation(image: Image.Image) -> Image.Image:
    image = apply_clahe(image)
    return image


def image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    import base64
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def mask_to_overlay(original: Image.Image, mask: np.ndarray, color=(255, 0, 0), alpha=0.4) -> Image.Image:
    img_np = np.array(original.convert("RGB"))
    overlay = img_np.copy()
    overlay[mask > 0] = (
        (1 - alpha) * overlay[mask > 0] + alpha * np.array(color)
    ).astype(np.uint8)

    # Draw contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(overlay, contours, -1, color, 2)

    return Image.fromarray(overlay)
