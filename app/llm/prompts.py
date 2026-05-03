REPORT_SYSTEM_PROMPT = """You are a medical AI report generator. You produce structured clinical reports based on AI model outputs. Every recommendation MUST cite a specific guideline. Never speculate beyond what the models detected. Return ONLY valid JSON."""

REPORT_TEMPLATE = """<system>{system_prompt}</system>

<modality>{modality}</modality>
<body_part>{body_part}</body_part>
<specialist>{specialist} ({specialist_accuracy})</specialist>

<classification_output>
{classification_output}
</classification_output>

<segmentation_output>
{segmentation_output}
</segmentation_output>

<xai_summary>
{xai_summary}
</xai_summary>

<uncertainty>
Confidence: {confidence}
</uncertainty>

<patient_context>
{clinical_context}
</patient_context>

<image_quality>
{image_quality}
</image_quality>

<safety_gate>
{safety_gate}
</safety_gate>

<evidence>
{evidence}
</evidence>

<instructions>
Generate a JSON report with these EXACT fields. The `ai_reasoning_process` MUST contain all 5 steps shown below, each with a `tool` (the model/component used), a `lead` (a short opening phrase ending in a comma or em-dash), and a `text` paragraph (1–2 sentences of clinical reasoning).

{{
  "priority": "High/Medium/Low",
  "pipeline_applied": ["BiomedCLIP Router", "BiomedCLIP-{disease}", "UNet++", "Grad-CAM++", "RAG"],
  "ai_reasoning_process": {{
    "selecting": {{
      "tool": "ModelSelector → BiomedCLIP-{disease}",
      "lead": "Task analysis complete — routing to",
      "text": "Why this specialist model was chosen based on the routed modality."
    }},
    "observing": {{
      "tool": "ImagePreprocessor",
      "lead": "Initial scan of the image reveals",
      "text": "What anatomy is visible and notable visual qualities of the image."
    }},
    "analyzing": {{
      "tool": "GradCAM",
      "lead": "On closer examination,",
      "text": "What the classifier and Grad-CAM attention indicate; concrete visual features."
    }},
    "cross_referencing": {{
      "tool": "PatchAnalyzer",
      "lead": "Comparing against clinical patterns —",
      "text": "How findings compare to known patterns in the retrieved guidelines."
    }},
    "weighing": {{
      "tool": "SemanticReasoner",
      "lead": "Balancing the evidence,",
      "text": "Final clinical judgment weighing confidence vs uncertainty."
    }}
  }},
  "key_findings": [
    {{"finding": "specific observation", "location": "anatomic region", "confidence": 0.0, "severity": "high/medium/low"}}
  ],
  "ai_focus_areas": {{
    "legend": [
      {{"label": "High attention areas", "color": "red"}},
      {{"label": "Moderate attention", "color": "orange"}},
      {{"label": "Supporting regions", "color": "yellow"}},
      {{"label": "Contextual areas", "color": "blue"}}
    ],
    "note": "Heatmap shows areas relevant to each finding. Click on different findings to see their specific visualizations."
  }},
  "next_actions": "A clinical recommendations paragraph that cites specific guidelines.",
  "clinical_recommendations": [
    {{"recommendation": "text", "citation": "guideline source", "citation_id": "G1"}}
  ],
  "evidence_citations": [
    {{"id": "G1", "source": "guideline source", "url": "https://...", "condition": "matched condition"}}
  ],
  "patient_context_used": {{
    "clinical_notes": "summarized notes used or none provided",
    "symptoms": "symptoms/history used or none provided"
  }},
  "safety": {{
    "status": "ai_assisted/needs_radiologist_review",
    "needs_radiologist_review": false,
    "warnings": []
  }},
  "summary": "2-3 sentence clinical summary",
  "disclaimer": "AI decision support disclaimer"
}}

Return ONLY the JSON, no markdown fences or extra text.
</instructions>"""

CRITIQUE_PROMPT = """<system>You are a medical report auditor. Check the report against the provided evidence. Flag any claim not supported by the model output or retrieved guidelines. Flag any hallucination. Return a JSON with "approved": true/false and "issues": [list of issues] if any.</system>

<report>
{report}
</report>

<evidence>
{evidence}
</evidence>

<model_output>
Classification: {classification_output}
Segmentation: {segmentation_output}
</model_output>

Return ONLY valid JSON."""

MODALITY_BODY_MAP = {
    "Endoscopy": "Abdomen, gastrointestinal tract",
    "Dermatology": "Skin",
    "X-Ray": "Chest",
    "Ultrasound": "Variable (breast/thyroid)",
    "Mammography": "Breast",
    "Fundus / Retinography": "Eye, retina",
    "Microscopy": "Tissue sample (histopathology)",
}
