import json
import logging
from pathlib import Path

from app.config import KNOWLEDGE_DIR, DISEASE_MODELS
from app.llm.provider import call_llm
from app.llm.prompts import REPORT_TEMPLATE, REPORT_SYSTEM_PROMPT, CRITIQUE_PROMPT, MODALITY_BODY_MAP

logger = logging.getLogger(__name__)


def load_guidelines(disease: str) -> list[dict]:
    """Load clinical guidelines for a disease domain."""
    # Map disease folder names to knowledge file names
    name_map = {
        "thyroid_ultrasound": "thyroid",
        "fundus_retinography": "fundus",
    }
    filename = name_map.get(disease, disease)
    filepath = KNOWLEDGE_DIR / f"{filename}.json"

    if not filepath.exists():
        logger.warning(f"No guidelines file for {disease}")
        return []

    with open(filepath) as f:
        data = json.load(f)
    return data.get("guidelines", [])


def format_evidence(guidelines: list[dict], top_prediction: str) -> str:
    """Format relevant guidelines as evidence text."""
    evidence_parts = []
    for i, g in enumerate(guidelines, 1):
        condition = g.get("condition", "")
        # Include if condition matches or is general
        if condition.lower() in top_prediction.lower() or top_prediction.lower() in condition.lower() or condition == "general":
            for passage in g.get("passages", []):
                evidence_parts.append(f"[{i}] {g['source']}: {passage}")

    # If no specific match, include all guidelines
    if not evidence_parts:
        for i, g in enumerate(guidelines, 1):
            for passage in g.get("passages", [])[:1]:
                evidence_parts.append(f"[{i}] {g['source']}: {passage}")

    return "\n".join(evidence_parts[:5]) if evidence_parts else "No specific clinical guidelines available for this condition."


def format_classification(predictions: list[dict], multilabel: bool) -> str:
    lines = []
    for p in predictions:
        lines.append(f"{p['class']} ({p['probability']:.2%})")
    return ", ".join(lines)


def format_segmentation(seg_result: dict | None) -> str:
    if not seg_result or not seg_result.get("has_findings"):
        return "No segmentation performed or no regions detected."

    parts = [f"{seg_result['num_regions']} region(s) detected."]
    for r in seg_result.get("regions", [])[:5]:
        bbox = r["bbox"]
        parts.append(
            f"Region {r['id']}: {bbox['width']}x{bbox['height']}px at ({bbox['x']},{bbox['y']}), "
            f"area={r['area_pixels']}px"
        )
    return " ".join(parts)


async def generate_report(
    modality: str,
    disease: str,
    classification_result: dict,
    segmentation_result: dict | None,
    xai_result: dict | None,
    router_confidence: float,
) -> dict:
    """Generate a structured medical report using LLM + RAG context."""
    info = DISEASE_MODELS.get(disease, {})
    specialist = info.get("specialist", "General Specialist")

    # Load and format evidence
    guidelines = load_guidelines(disease)
    top_pred = classification_result.get("top_prediction", "unknown")
    evidence = format_evidence(guidelines, top_pred)

    # Format inputs
    classification_text = format_classification(
        classification_result.get("predictions", []),
        classification_result.get("multilabel", False),
    )
    segmentation_text = format_segmentation(segmentation_result)

    xai_summary = "Grad-CAM++ heatmap generated."
    if xai_result and xai_result.get("error"):
        xai_summary = f"XAI generation failed: {xai_result['error']}"

    body_part = MODALITY_BODY_MAP.get(modality, "Unknown")
    confidence_text = f"{classification_result.get('top_confidence', 0):.1%}"

    prompt = REPORT_TEMPLATE.format(
        system_prompt=REPORT_SYSTEM_PROMPT,
        modality=modality,
        body_part=body_part,
        specialist=specialist,
        specialist_accuracy="see model metrics",
        classification_output=classification_text,
        segmentation_output=segmentation_text,
        xai_summary=xai_summary,
        confidence=confidence_text,
        evidence=evidence,
        disease=disease,
    )

    # Call LLM
    llm_result = await call_llm(prompt)

    if llm_result["error"]:
        return {
            "report": None,
            "provider": None,
            "error": llm_result["error"],
            "raw_response": None,
        }

    # Parse JSON from response
    raw = llm_result["response"]
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        report = json.loads(cleaned)
    except json.JSONDecodeError:
        report = {"raw_text": raw, "parse_error": "Could not parse LLM response as JSON"}

    return {
        "report": report,
        "provider": llm_result["provider"],
        "error": None,
        "raw_response": raw,
    }
