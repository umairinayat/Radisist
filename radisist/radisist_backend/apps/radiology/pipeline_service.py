import sys
from pathlib import Path
from threading import Lock

from asgiref.sync import async_to_sync

PIPELINE_ROOT = Path(__file__).resolve().parents[4]
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from app.config import DISEASE_MODELS, MODALITY_TO_DISEASE, ROUTER_CLASSES  # noqa: E402
from app.models.model_registry import download_all_models  # noqa: E402
from app.models.router import router_instance  # noqa: E402
from app.pipeline.orchestrator import analyze_image  # noqa: E402
from app.pipeline.preprocessing import assess_image_quality, image_to_base64, load_image, preprocess_for_classification  # noqa: E402

SAMPLES_DIR = PIPELINE_ROOT / "app" / "static" / "samples"

_models_ready = False
_models_lock = Lock()


def ensure_pipeline_ready():
    global _models_ready
    if _models_ready:
        return

    with _models_lock:
        if _models_ready:
            return
        download_all_models()
        _models_ready = True


def route_medical_image(file_bytes: bytes) -> dict:
    ensure_pipeline_ready()
    image = load_image(file_bytes)
    image_quality = assess_image_quality(image)
    image = preprocess_for_classification(image)
    route_result = router_instance.predict(image)
    modality_idx = route_result["modality_index"]
    route_result["disease_models"] = MODALITY_TO_DISEASE.get(modality_idx, [])
    route_result["image_quality"] = image_quality
    if image_quality["status"] != "acceptable":
        route_result["needs_radiologist_review"] = True
        route_result["warnings"] = image_quality["warnings"]
    return route_result


def analyze_medical_image(
    file_bytes: bytes,
    filename: str,
    force_disease: str | None = None,
    clinical_context: dict | None = None,
) -> dict:
    ensure_pipeline_ready()
    return async_to_sync(analyze_image)(file_bytes, filename, force_disease, clinical_context)


def file_to_base64(file_path: str) -> str | None:
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        return None

    with open(path, "rb") as image_file:
        image = load_image(image_file.read())
    return image_to_base64(image)


def get_pipeline_models() -> dict:
    return {
        "router_classes": ROUTER_CLASSES,
        "disease_models": [
            {
                "name": disease,
                "specialist": info["specialist"],
                "classes": info["classes"],
                "has_segmentation": info["has_segmentation"],
                "multilabel": info.get("multilabel", False),
            }
            for disease, info in DISEASE_MODELS.items()
        ],
    }


def get_sample_gallery(limit: int = 5) -> list[dict]:
    diseases = []
    if not SAMPLES_DIR.exists():
        return diseases

    for disease_dir in sorted(SAMPLES_DIR.iterdir()):
        if not disease_dir.is_dir():
            continue

        info = DISEASE_MODELS.get(disease_dir.name, {})
        images = sorted(disease_dir.glob("sample_*.jpg"))[:limit]
        if not images:
            continue

        diseases.append(
            {
                "disease": disease_dir.name,
                "specialist": info.get("specialist", ""),
                "thumbnails": [image.name for image in images],
            }
        )

    return diseases
