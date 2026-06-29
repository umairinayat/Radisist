import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR = BASE_DIR / "uploads"
KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"

HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_REPO_ID = "umairinayat/medical-models"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GLM_API_KEY = os.getenv("GLM_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")

DEVICE = "cuda" if os.getenv("DEVICE", "auto") == "cuda" else "cpu"
try:
    import torch
    if DEVICE == "cpu" and torch.cuda.is_available():
        DEVICE = "cuda"
except ImportError:
    DEVICE = "cpu"

ROUTER_CLASSES = [
    "Endoscopy",
    "Dermatology",
    "X-Ray",
    "Ultrasound",
    "Mammography",
    "Fundus / Retinography",
    "Microscopy",
]

DISEASE_MODELS = {
    "endoscopy": {
        "classes": ["barretts", "esophagitis", "polyp", "ulcerative_colitis", "healthy"],
        "has_segmentation": True,
        "multilabel": False,
        "specialist": "Gastrointestinal Specialist",
    },
    "dermatology": {
        "classes": ["malignant", "non_malignant"],
        "has_segmentation": True,
        "multilabel": False,
        "specialist": "Dermatology Specialist",
    },
    "chest_xray": {
        "classes": ["covid", "lung_opacity", "normal", "viral_pneumonia"],
        "has_segmentation": True,
        "multilabel": False,
        "specialist": "Pulmonary Specialist",
    },
    "breast_ultrasound": {
        "classes": ["benign", "malignant", "normal"],
        "has_segmentation": True,
        "multilabel": False,
        "specialist": "Breast Ultrasound Specialist",
    },
    "mammography": {
        "classes": ["benign", "malignant", "normal"],
        "has_segmentation": True,
        "multilabel": False,
        "specialist": "Mammography Specialist",
    },
    "thyroid_ultrasound": {
        "classes": ["low_risk", "suspicious"],
        "has_segmentation": True,
        "multilabel": False,
        "specialist": "Thyroid Specialist",
    },
}

MODALITY_TO_DISEASE = {
    0: ["endoscopy"],                              # Endoscopy
    1: ["dermatology"],                            # Dermatology
    2: ["chest_xray"],                             # X-Ray
    3: ["breast_ultrasound", "thyroid_ultrasound"],# Ultrasound
    4: ["mammography"],                            # Mammography
    # 5 (Fundus/Retinography) and 6 (Microscopy) removed per request -
    # router still outputs them but no disease model is attached.
}
