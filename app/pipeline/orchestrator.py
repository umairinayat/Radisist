import io
import time
import uuid
import logging
from datetime import datetime, timezone

from PIL import Image

from app.config import DEVICE, DISEASE_MODELS, HF_REPO_ID, MODALITY_TO_DISEASE, MODELS_DIR
from app.models.router import router_instance
from app.models.classifier import classifier_instance
from app.models.segmentor import segmentor_instance, SEGMENTATION_MODELS
from app.pipeline.preprocessing import (
    assess_image_quality,
    load_image,
    preprocess_for_classification,
    image_to_base64,
    mask_to_overlay,
)
from app.pipeline.xai import generate_gradcam
from app.pipeline.report import generate_report

logger = logging.getLogger(__name__)


def model_checkpoint_metadata(path) -> dict:
    path = path.resolve()
    metadata = {
        "checkpoint": str(path),
        "exists": path.exists(),
    }
    if path.exists():
        stat = path.stat()
        metadata["size_bytes"] = stat.st_size
        metadata["modified_at"] = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
    return metadata


def build_model_versions(disease: str | None, has_segmentation: bool) -> dict:
    versions = {
        "device": DEVICE,
        "model_repository": HF_REPO_ID,
        "router": {
            "name": "BiomedCLIP Router",
            "backbone": "microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224",
            "version": "biomedclip_router_20260423_194004",
            **model_checkpoint_metadata(MODELS_DIR / "biomedclip_router" / "best_biomedclip_router.pt"),
        },
        "reporting": {
            "name": "RAG + LLM fallback chain",
            "version": "Gemini -> GLM -> OpenRouter",
            "knowledge_base": "app/knowledge/*.json",
        },
        "xai": {
            "name": "Grad-CAM++",
            "target": "per-architecture last conv / transformer block",
        },
    }

    if disease:
        cls_arch = None
        try:
            if disease in classifier_instance.loaded_models:
                cls_arch = classifier_instance.loaded_models[disease].get("arch")
        except Exception:
            cls_arch = None
        versions["classifier"] = {
            "name": f"{cls_arch or 'BiomedCLIP'}-{disease}",
            "backbone": cls_arch or "microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224",
            "disease_model": disease,
            **model_checkpoint_metadata(
                MODELS_DIR / "disease_models" / disease / "classification" / "best_classifier.pt"
            ),
        }

    if disease and has_segmentation:
        seg_arch = "UNet++"
        try:
            if disease in segmentor_instance.loaded_models:
                seg_arch = segmentor_instance.loaded_models[disease].get("arch", "UNet++")
        except Exception:
            pass
        versions["segmentor"] = {
            "name": f"{seg_arch}-{disease}",
            "architecture": seg_arch,
            "disease_model": disease,
            **model_checkpoint_metadata(
                MODELS_DIR / "disease_models" / disease / "segmentation" / "best_segmenter.pt"
            ),
        }

    return versions


async def analyze_image(
    file_bytes: bytes,
    filename: str,
    force_disease: str | None = None,
    clinical_context: dict | None = None,
) -> dict:
    """Full pipeline: route -> classify -> segment -> XAI -> report."""
    report_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    audit_trail = []
    t0 = time.time()

    # Step 1: Load and preprocess
    image = load_image(file_bytes)
    original_size = image.size
    image_quality = assess_image_quality(image)
    image_cls = preprocess_for_classification(image)
    audit_trail.append({
        "step": "preprocess",
        "tool": "CLAHE + resize",
        "latency_ms": int((time.time() - t0) * 1000),
        "output": image_quality["status"],
    })

    # Step 2: Route
    t1 = time.time()
    route_result = router_instance.predict(image_cls)
    audit_trail.append({
        "step": "route",
        "tool": "BiomedCLIP Router",
        "latency_ms": int((time.time() - t1) * 1000),
        "output": f"{route_result['modality']} ({route_result['confidence']:.2%})",
    })

    # Step 3: Determine disease model
    modality_idx = route_result["modality_index"]
    possible_diseases = MODALITY_TO_DISEASE.get(modality_idx, [])

    if force_disease and force_disease in DISEASE_MODELS:
        disease = force_disease
    elif len(possible_diseases) == 1:
        disease = possible_diseases[0]
    elif len(possible_diseases) > 1:
        disease = possible_diseases[0]
    else:
        disease = None

    classification_result = None
    segmentation_result = None
    xai_result = None
    seg_overlay_b64 = None
    report_result = None

    safety_result = {
        "status": "ai_assisted",
        "display_label": None,
        "needs_radiologist_review": False,
        "unsupported_or_ambiguous": False,
        "warnings": [],
        "disclaimer": (
            "AI output is decision support only and must be reviewed by a qualified radiologist "
            "before clinical use."
        ),
    }

    if route_result.get("confidence", 0) < 0.75:
        safety_result["warnings"].append("Router confidence is below the review threshold.")
    if route_result.get("confidence", 0) < 0.45:
        safety_result["unsupported_or_ambiguous"] = True
        safety_result["warnings"].append("Image may be unsupported or outside the trained modality set.")
    if image_quality["status"] != "acceptable":
        safety_result["warnings"].extend(image_quality["warnings"])

    if disease:
        # Step 4: Classification
        t2 = time.time()
        classification_result = classifier_instance.predict(image_cls, disease)
        if classification_result.get("top_confidence", 0) < 0.70:
            safety_result["warnings"].append("Classifier confidence is below the review threshold.")

        audit_trail.append({
            "step": "classify",
            "tool": f"BiomedCLIP-{disease}",
            "latency_ms": int((time.time() - t2) * 1000),
            "output": f"{classification_result['top_prediction']} ({classification_result['top_confidence']:.2%})",
        })

        # Step 5: Segmentation (if available)
        if disease in SEGMENTATION_MODELS:
            try:
                t3 = time.time()
                segmentation_result = segmentor_instance.predict(image, disease, original_size)
                mask = segmentation_result.pop("mask")
                overlay = mask_to_overlay(image, mask)
                seg_overlay_b64 = image_to_base64(overlay)
                audit_trail.append({
                    "step": "segment",
                    "tool": f"UNet++-{disease}",
                    "latency_ms": int((time.time() - t3) * 1000),
                    "output": f"{segmentation_result['num_regions']} regions",
                })
            except Exception as e:
                logger.error(f"Segmentation failed: {e}")
                audit_trail.append({"step": "segment", "tool": f"UNet++-{disease}", "error": str(e)})

        # Step 6: XAI (Grad-CAM++)
        try:
            t4 = time.time()
            model, preprocess = classifier_instance.get_model_and_preprocess(disease)
            cls_arch = classifier_instance.loaded_models.get(disease, {}).get("arch", "")
            target_class = None
            if classification_result:
                classes = DISEASE_MODELS.get(disease, {}).get("classes", [])
                top = classification_result["top_prediction"]
                if top in classes:
                    target_class = classes.index(top)

            xai_result = generate_gradcam(model, preprocess, image_cls, DEVICE, target_class, arch=cls_arch)
            audit_trail.append({
                "step": "explain",
                "tool": "Grad-CAM++",
                "latency_ms": int((time.time() - t4) * 1000),
            })
        except Exception as e:
            logger.error(f"XAI failed: {e}")
            xai_result = {"heatmap_base64": None, "error": str(e)}

        if safety_result["warnings"]:
            safety_result["status"] = "needs_radiologist_review"
            safety_result["display_label"] = "Needs radiologist review"
            safety_result["needs_radiologist_review"] = True

        # Step 7: Generate report via LLM
        try:
            t5 = time.time()
            report_result = await generate_report(
                modality=route_result["modality"],
                disease=disease,
                classification_result=classification_result,
                segmentation_result=segmentation_result,
                xai_result=xai_result,
                router_confidence=route_result["confidence"],
                clinical_context=clinical_context,
                image_quality=image_quality,
                safety_result=safety_result,
            )
            audit_trail.append({
                "step": "report",
                "tool": f"LLM ({report_result.get('provider', 'none')})",
                "latency_ms": int((time.time() - t5) * 1000),
            })
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            report_result = {"report": None, "error": str(e)}

    total_ms = int((time.time() - t0) * 1000)
    if safety_result["warnings"]:
        safety_result["status"] = "needs_radiologist_review"
        safety_result["display_label"] = "Needs radiologist review"
        safety_result["needs_radiologist_review"] = True
    elif classification_result:
        safety_result["display_label"] = classification_result.get("top_prediction")
    model_versions = build_model_versions(disease, bool(segmentation_result))
    if report_result and report_result.get("provider"):
        model_versions["reporting"]["provider_used"] = report_result.get("provider")

    return {
        "report_id": report_id,
        "timestamp": timestamp,
        "total_latency_ms": total_ms,
        "routing": route_result,
        "disease_model": disease,
        "classification": classification_result,
        "segmentation": segmentation_result,
        "segmentation_overlay": seg_overlay_b64,
        "xai_heatmap": xai_result.get("heatmap_base64") if xai_result else None,
        "xai_error": xai_result.get("error") if xai_result else None,
        "report": report_result.get("report") if report_result else None,
        "report_provider": report_result.get("provider") if report_result else None,
        "report_error": report_result.get("error") if report_result else None,
        "safety": safety_result,
        "image_quality": image_quality,
        "clinical_context": clinical_context or {},
        "model_versions": model_versions,
        "original_image": image_to_base64(image),
        "audit_trail": audit_trail,
        "ultrasound_options": possible_diseases if modality_idx == 3 else None,
    }
