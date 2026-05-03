import json
import logging
from pathlib import Path

from app.config import KNOWLEDGE_DIR, DISEASE_MODELS
from app.llm.provider import call_llm
from app.llm.prompts import REPORT_TEMPLATE, REPORT_SYSTEM_PROMPT, CRITIQUE_PROMPT, MODALITY_BODY_MAP

logger = logging.getLogger(__name__)

REQUIRED_REPORT_FIELDS = [
    "priority",
    "pipeline_applied",
    "ai_reasoning_process",
    "key_findings",
    "ai_focus_areas",
    "next_actions",
    "clinical_recommendations",
    "evidence_citations",
    "patient_context_used",
    "safety",
    "summary",
    "disclaimer",
]


def citation_url_for_source(source: str) -> str:
    """Best-effort official links for the guideline sources in knowledge JSON."""
    rules = [
        ("ACR BI-RADS", "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads"),
        ("ACR TI-RADS", "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/TI-RADS"),
        ("ACR Appropriateness", "https://acsearch.acr.org/list"),
        ("ACR Practice Parameter", "https://www.acr.org/Clinical-Resources/Practice-Parameters-and-Technical-Standards"),
        ("Fleischner", "https://pubs.rsna.org/doi/10.1148/radiol.2017161659"),
        ("BTS 2010", "https://thorax.bmj.com/content/65/Suppl_2/ii18"),
        ("ESC/ERS", "https://academic.oup.com/eurheartj/article/43/38/3618/6673929"),
        ("AAD", "https://www.aad.org/member/clinical-quality/guidelines"),
        ("BAD", "https://www.bad.org.uk/healthcare-professionals/clinical-standards/clinical-guidelines/"),
        ("AAO PPP", "https://www.aao.org/preferred-practice-pattern"),
        ("EGS", "https://www.eugs.org/eng/guidelines.asp"),
        ("ESGE", "https://www.esge.com/publications/guidelines/"),
        ("ACG", "https://gi.org/guidelines/"),
        ("ECCO", "https://academic.oup.com/ecco-jcc"),
        ("ASCO/CAP", "https://www.cap.org/protocols-and-guidelines/cap-guidelines"),
        ("CAP", "https://www.cap.org/protocols-and-guidelines/cancer-reporting-tools/cancer-protocol-templates"),
        ("WHO", "https://tumourclassification.iarc.who.int/"),
        ("ATA 2015", "https://www.liebertpub.com/doi/10.1089/thy.2015.0020"),
    ]
    for needle, url in rules:
        if needle.lower() in source.lower():
            return url
    return ""


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


def select_relevant_guidelines(guidelines: list[dict], top_prediction: str) -> tuple[str, list[dict]]:
    """Format relevant guideline passages and return citation metadata."""
    relevant = []
    for g in guidelines:
        condition = g.get("condition", "")
        if condition.lower() in top_prediction.lower() or top_prediction.lower() in condition.lower() or condition == "general":
            relevant.append(g)

    if not relevant:
        relevant = guidelines[:5]

    evidence_parts = []
    citations = []
    for i, guideline in enumerate(relevant[:5], 1):
        source = guideline.get("source", "Unknown guideline")
        citation_id = f"G{i}"
        url = guideline.get("url") or citation_url_for_source(source)
        citations.append(
            {
                "id": citation_id,
                "source": source,
                "url": url,
                "condition": guideline.get("condition", ""),
            }
        )
        for passage in guideline.get("passages", [])[:2]:
            link_text = f" {url}" if url else ""
            evidence_parts.append(f"[{citation_id}] {source}.{link_text} {passage}")

    if not evidence_parts:
        return "No specific clinical guidelines available for this condition.", citations

    return "\n".join(evidence_parts[:6]), citations


def format_evidence(guidelines: list[dict], top_prediction: str) -> str:
    evidence, _ = select_relevant_guidelines(guidelines, top_prediction)
    return evidence


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


def format_clinical_context(clinical_context: dict | None) -> str:
    if not clinical_context:
        return "No patient clinical context was provided."

    labels = {
        "clinical_notes": "Clinical notes",
        "patient_age": "Patient age",
        "patient_gender": "Patient gender",
        "symptoms": "Symptoms",
        "lifestyle": "Lifestyle",
        "previous_breast_disease": "Previous breast disease",
        "family_breast_cancer": "Family breast cancer",
        "hormonal_therapy": "Hormonal therapy",
    }
    lines = []
    for key, label in labels.items():
        value = clinical_context.get(key)
        if value not in (None, "", "OTHERS"):
            lines.append(f"{label}: {value}")
    return "\n".join(lines) if lines else "No patient clinical context was provided."


def _default_reasoning(disease: str, modality: str, safety_result: dict | None) -> dict:
    review_text = "Low confidence or image-quality warnings require radiologist review." if safety_result and safety_result.get("needs_radiologist_review") else "Model outputs were internally consistent enough for AI-assisted review."
    return {
        "selecting": {
            "tool": f"ModelSelector -> BiomedCLIP-{disease}",
            "lead": "Task analysis complete, routing to",
            "text": f"The routed modality was {modality}, so the {disease} specialist branch was selected.",
        },
        "observing": {
            "tool": "ImagePreprocessor",
            "lead": "Initial scan of the image reveals",
            "text": "The image was normalized with CLAHE and resized before model inference.",
        },
        "analyzing": {
            "tool": "GradCAM",
            "lead": "On closer examination,",
            "text": "The classifier output and visual explanation are treated as decision-support signals, not a final diagnosis.",
        },
        "cross_referencing": {
            "tool": "RAG Guidelines",
            "lead": "Comparing against clinical patterns,",
            "text": "The report was grounded against the retrieved guideline snippets and citation list.",
        },
        "weighing": {
            "tool": "SafetyGate",
            "lead": "Balancing the evidence,",
            "text": review_text,
        },
    }


def fallback_report(
    modality: str,
    disease: str,
    classification_result: dict,
    segmentation_result: dict | None,
    clinical_context: dict | None,
    image_quality: dict | None,
    safety_result: dict | None,
    citations: list[dict],
    reason: str = "",
) -> dict:
    top_prediction = classification_result.get("top_prediction", "unknown")
    confidence = classification_result.get("top_confidence", 0)
    needs_review = bool(safety_result and safety_result.get("needs_radiologist_review"))
    label = "Needs radiologist review" if needs_review else top_prediction
    summary = (
        f"{label}. The AI model output was {top_prediction} with {confidence:.1%} confidence. "
        "This result must be reviewed by a qualified radiologist before clinical use."
    )
    if reason:
        summary += f" Report validation note: {reason}"

    return {
        "priority": "High" if needs_review else "Medium",
        "pipeline_applied": [
            "BiomedCLIP Router",
            f"BiomedCLIP-{disease}",
            "UNet++" if segmentation_result else "Segmentation unavailable",
            "Grad-CAM++",
            "RAG",
        ],
        "ai_reasoning_process": _default_reasoning(disease, modality, safety_result),
        "key_findings": [
            {
                "finding": f"AI-assisted classification: {top_prediction}",
                "location": modality,
                "confidence": confidence,
                "severity": "high" if needs_review else "medium",
            }
        ],
        "ai_focus_areas": {
            "legend": [
                {"label": "High attention areas", "color": "red"},
                {"label": "Moderate attention", "color": "orange"},
                {"label": "Supporting regions", "color": "yellow"},
                {"label": "Contextual areas", "color": "blue"},
            ],
            "note": "Heatmap and segmentation overlays are AI explanation aids and require human review.",
        },
        "next_actions": "Radiologist review is required before communicating a final diagnosis to the patient.",
        "clinical_recommendations": [
            {
                "recommendation": "Review the original image, AI heatmap, segmentation output, and cited guidelines before finalizing.",
                "citation": citations[0]["source"] if citations else "No guideline citation available",
                "citation_id": citations[0]["id"] if citations else "",
            }
        ],
        "evidence_citations": citations,
        "patient_context_used": {
            "clinical_notes": (clinical_context or {}).get("clinical_notes") or "None provided",
            "symptoms": (clinical_context or {}).get("symptoms") or "None provided",
        },
        "safety": safety_result or {},
        "image_quality": image_quality or {},
        "summary": summary,
        "disclaimer": "AI output is decision support only and is not a substitute for radiologist interpretation.",
    }


def parse_llm_json(raw: str | None) -> tuple[dict | None, str | None]:
    if not raw:
        return None, "Empty LLM response"

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start:end + 1]

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        return None, f"Could not parse LLM response as JSON: {exc}"

    if not isinstance(parsed, dict):
        return None, "LLM JSON root was not an object"
    return parsed, None


def validate_report_json(
    report: dict | None,
    *,
    modality: str,
    disease: str,
    classification_result: dict,
    segmentation_result: dict | None,
    clinical_context: dict | None,
    image_quality: dict | None,
    safety_result: dict | None,
    citations: list[dict],
    parse_error: str | None = None,
) -> dict:
    if report is None:
        report = fallback_report(
            modality,
            disease,
            classification_result,
            segmentation_result,
            clinical_context,
            image_quality,
            safety_result,
            citations,
            reason=parse_error or "LLM report unavailable",
        )
        report["validation"] = {"valid_json": False, "issues": [parse_error or "LLM report unavailable"]}
        return report

    fallback = fallback_report(
        modality,
        disease,
        classification_result,
        segmentation_result,
        clinical_context,
        image_quality,
        safety_result,
        citations,
    )
    issues = []
    for field in REQUIRED_REPORT_FIELDS:
        if field not in report or report[field] in (None, "", []):
            report[field] = fallback[field]
            issues.append(f"Missing or empty field repaired: {field}")

    process = report.get("ai_reasoning_process")
    if not isinstance(process, dict):
        report["ai_reasoning_process"] = fallback["ai_reasoning_process"]
        issues.append("Invalid ai_reasoning_process repaired")
    else:
        for step, value in fallback["ai_reasoning_process"].items():
            if not isinstance(process.get(step), dict):
                process[step] = value
                issues.append(f"Missing reasoning step repaired: {step}")

    if safety_result and safety_result.get("needs_radiologist_review"):
        report["priority"] = "High"
        report["safety"] = safety_result
        if "Needs radiologist review" not in report.get("summary", ""):
            report["summary"] = f"Needs radiologist review. {report.get('summary', fallback['summary'])}"

    report["evidence_citations"] = citations
    report["patient_context_used"] = fallback["patient_context_used"] | {
        **(report.get("patient_context_used") if isinstance(report.get("patient_context_used"), dict) else {})
    }
    report["image_quality"] = image_quality or {}
    report["disclaimer"] = fallback["disclaimer"]
    report["validation"] = {"valid_json": True, "issues": issues}
    return report


async def generate_report(
    modality: str,
    disease: str,
    classification_result: dict,
    segmentation_result: dict | None,
    xai_result: dict | None,
    router_confidence: float,
    clinical_context: dict | None = None,
    image_quality: dict | None = None,
    safety_result: dict | None = None,
) -> dict:
    """Generate a structured medical report using LLM + RAG context."""
    info = DISEASE_MODELS.get(disease, {})
    specialist = info.get("specialist", "General Specialist")

    # Load and format evidence
    guidelines = load_guidelines(disease)
    top_pred = classification_result.get("top_prediction", "unknown")
    evidence, citations = select_relevant_guidelines(guidelines, top_pred)

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
        clinical_context=format_clinical_context(clinical_context),
        image_quality=json.dumps(image_quality or {}, indent=2),
        safety_gate=json.dumps(safety_result or {}, indent=2),
        evidence=evidence,
        disease=disease,
    )

    # Call LLM
    llm_result = await call_llm(prompt)

    if llm_result["error"]:
        report = validate_report_json(
            None,
            modality=modality,
            disease=disease,
            classification_result=classification_result,
            segmentation_result=segmentation_result,
            clinical_context=clinical_context,
            image_quality=image_quality,
            safety_result=safety_result,
            citations=citations,
            parse_error=llm_result["error"],
        )
        return {
            "report": report,
            "provider": None,
            "error": llm_result["error"],
            "raw_response": None,
        }

    # Parse JSON from response
    raw = llm_result["response"]
    parsed, parse_error = parse_llm_json(raw)
    report = validate_report_json(
        parsed,
        modality=modality,
        disease=disease,
        classification_result=classification_result,
        segmentation_result=segmentation_result,
        clinical_context=clinical_context,
        image_quality=image_quality,
        safety_result=safety_result,
        citations=citations,
        parse_error=parse_error,
    )

    return {
        "report": report,
        "provider": llm_result["provider"],
        "error": parse_error,
        "raw_response": raw,
    }
