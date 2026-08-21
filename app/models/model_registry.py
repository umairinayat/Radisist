import logging
from pathlib import Path

import torch
from huggingface_hub import hf_hub_download, list_repo_tree

from app.config import HF_TOKEN, HF_REPO_ID, MODELS_DIR, DISEASE_MODELS

logger = logging.getLogger(__name__)

ROUTER_REMOTE_DIR = "biomedclip_router_20260423_194004"
DISEASE_REMOTE_DIR = "disease_models"


def _download_file(repo_path: str, local_path: Path) -> Path:
    local_path.parent.mkdir(parents=True, exist_ok=True)
    if local_path.exists():
        logger.info(f"Already exists: {local_path}")
        return local_path
    logger.info(f"Downloading {repo_path} -> {local_path}")
    downloaded = hf_hub_download(
        repo_id=HF_REPO_ID,
        filename=repo_path,
        token=HF_TOKEN or None,
        local_dir=str(MODELS_DIR / "_hf_cache"),
    )
    import shutil
    shutil.move(downloaded, str(local_path))
    return local_path


def download_router_model() -> Path:
    local_path = MODELS_DIR / "biomedclip_router" / "best_biomedclip_router.pt"
    remote_path = f"{ROUTER_REMOTE_DIR}/best_biomedclip_router.pt"
    return _download_file(remote_path, local_path)


def download_disease_model(disease: str, model_type: str = "classification") -> Path:
    filename = "best_classifier.pt" if model_type == "classification" else "best_segmenter.pt"
    local_path = MODELS_DIR / "disease_models" / disease / model_type / filename
    remote_path = f"{DISEASE_REMOTE_DIR}/{disease}/{model_type}/{filename}"
    return _download_file(remote_path, local_path)


def download_metrics(disease: str, model_type: str = "classification") -> Path | None:
    local_path = MODELS_DIR / "disease_models" / disease / model_type / "metrics.json"
    remote_path = f"{DISEASE_REMOTE_DIR}/{disease}/{model_type}/metrics.json"
    try:
        return _download_file(remote_path, local_path)
    except Exception:
        logger.warning(f"No metrics.json for {disease}/{model_type}")
        return None


def detect_num_classes(checkpoint_path: Path) -> int:
    state = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model_state = state.get("model_state_dict", state)
    for key in reversed(list(model_state.keys())):
        if "weight" in key and model_state[key].dim() == 2:
            return model_state[key].shape[0]
    return 0


def download_all_models():
    logger.info("=== Downloading all models from HuggingFace ===")

    # Router
    download_router_model()

    # Disease models
    for disease, info in DISEASE_MODELS.items():
        try:
            path = download_disease_model(disease, "classification")
            download_metrics(disease, "classification")

            # Detect classes for models without predefined class lists
            if not info["classes"]:
                num_classes = detect_num_classes(path)
                logger.info(f"{disease}: detected {num_classes} classes from checkpoint")
                info["_num_classes"] = num_classes

            if info["has_segmentation"]:
                try:
                    download_disease_model(disease, "segmentation")
                    download_metrics(disease, "segmentation")
                    try:
                        download_disease_model(disease, "tanet")
                    except Exception:
                        pass
                except Exception as e:
                    logger.warning(f"Segmentation model not available for {disease}: {e}")
        except Exception as e:
            logger.error(f"Failed to download {disease}: {e}")

    logger.info("=== Model download complete ===")
