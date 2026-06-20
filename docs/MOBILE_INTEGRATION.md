# Radisist API — Mobile Integration Guide

The medical-imaging AI backend is a **FastAPI** service. Upload an image, get back routing → classification → segmentation → Grad-CAM heatmap → LLM radiology report, all in one JSON response.

---

## 1. Server info (Machine ID)

| Field | Value |
|---|---|
| Service name | **Radisist** |
| Framework | FastAPI + Uvicorn |
| Local bind | `http://0.0.0.0:7004` |
| Public IP | `http://65.108.253.38:7004` |
| Hostname (LAN) | `http://<server-hostname>:7004` |
| Interactive docs | `http://<host>:7004/docs` (Swagger UI) |
| OpenAPI schema | `http://<host>:7004/openapi.json` |
| Repo | `umairinayat/medical-models` (HuggingFace) |

> Replace `<host>` with `65.108.253.38` for internet access, or the LAN IP / `localhost` if the phone is on the same network as the server.

### Start the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 7004
```

On first boot it auto-downloads all model weights from HuggingFace into `models/` (one-time, ~3 GB).

---

## 2. Endpoints at a glance

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | Liveness probe |
| `GET`  | `/api/models` | List all modalities + their classes |
| `GET`  | `/api/samples` | Sample image thumbnails per modality |
| `POST` | `/api/route` | Only the modality-routing step (fast) |
| `POST` | `/api/analyze` | Full pipeline: route → classify → segment → XAI → LLM report |
| `GET`  | `/` | Web UI (HTML; ignore for mobile) |

---

## 3. `GET /api/health`

**Request**
```http
GET /api/health
```

**Response**
```json
{ "status": "ok", "service": "Radisist" }
```

---

## 4. `GET /api/models`

Returns the router's modality classes plus every disease model with its class list. Use this to build dropdowns / filter UIs.

**Response**
```json
{
  "router_classes": [
    "Endoscopy", "Dermatology", "X-Ray", "Ultrasound",
    "Mammography", "Fundus / Retinography", "Microscopy"
  ],
  "disease_models": [
    {
      "name": "endoscopy",
      "specialist": "Gastrointestinal Specialist",
      "classes": ["barretts", "esophagitis", "polyp", "ulcerative_colitis", "healthy"],
      "has_segmentation": true,
      "multilabel": false
    },
    {
      "name": "chest_xray",
      "specialist": "Pulmonary Specialist",
      "classes": ["covid", "lung_opacity", "normal", "viral_pneumonia"],
      "has_segmentation": true,
      "multilabel": false
    },
    {
      "name": "mammography",
      "specialist": "Mammography Specialist",
      "classes": ["benign", "malignant", "normal"],
      "has_segmentation": true,
      "multilabel": false
    }
    /* …breast_ultrasound, thyroid_ultrasound, dermatology,
         fundus_retinography, microscopy */
  ]
}
```

### Models + architectures (as of 2026-06-20)

| Modality | Classifier arch | Classes | Segmentation arch |
|---|---|---|---|
| `mammography` | ResNet-50 | benign / malignant / normal | SegFormer-B3 |
| `chest_xray` | DenseNet-121 | covid / lung_opacity / normal / viral_pneumonia | SMP UNet (EfficientNet-B0) |
| `endoscopy` | ConvNeXt-Small | barretts / esophagitis / polyp / ulcerative_colitis / healthy | SMP UNet++ (EfficientNet-B3) |
| `dermatology` | ConvNeXt-Small | malignant / non_malignant | SegFormer-B3 |
| `breast_ultrasound` | BiomedCLIP ViT-B/16 | benign / malignant / normal | SMP UNet++ (EfficientNet-B3) |
| `thyroid_ultrasound` | BiomedCLIP ViT-B/16 | low_risk / suspicious | SMP UNet++ (EfficientNet-B3) |
| `fundus_retinography` | BiomedCLIP ViT-B/16 | no_retinal_disease / retinal_disease | — |
| `microscopy` | BiomedCLIP ViT-B/16 | metastasis / no_metastasis | — |
| **Router** | BiomedCLIP ViT-B/16 | 7 modalities (100% acc) | — |

---

## 5. `POST /api/route`

Routes the image to one of 7 modalities only (no diagnosis). Use when you want to ask the user which sub-model to run, or to validate the upload.

**Request — `multipart/form-data`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | binary | yes | JPG / PNG / BMP / TIFF / DICOM |

**cURL**
```bash
curl -X POST http://65.108.253.38:7004/api/route \
  -F "file=@chest.jpg"
```

**Response**
```json
{
  "modality": "X-Ray",
  "modality_index": 2,
  "confidence": 0.9712,
  "low_confidence": false,
  "top3": [
    { "class": "X-Ray",       "confidence": 0.9712 },
    { "class": "Microscopy",  "confidence": 0.0110 },
    { "class": "Mammography", "confidence": 0.0061 }
  ],
  "disease_models": ["chest_xray"]
}
```

`disease_models` is the list of applicable disease keys (`MODALITY_TO_DISEASE[idx]`). For Ultrasound it returns both `["breast_ultrasound", "thyroid_ultrasound"]` — let the user pick.

---

## 6. `POST /api/analyze`  ⭐ (main endpoint)

Full pipeline. **This is the call you'll use from the app.**

### Request — `multipart/form-data`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `file` | binary | yes | — | Medical image |
| `force_disease` | string | no | `null` | One of the `name` values from `/api/models` (skip auto-routing and run this specific model) |

### cURL examples

```bash
# Auto-route + full pipeline
curl -X POST http://65.108.253.38:7004/api/analyze \
  -F "file=@mammo.png"

# Force a specific model (skip router)
curl -X POST http://65.108.253.38:7004/api/analyze \
  -F "file=@mammo.png" \
  -F "force_disease=mammography"
```

### Response (trimmed; see notes below for the full shape)

```jsonc
{
  "report_id": "9d3f...",
  "timestamp": "2026-06-20T22:25:54.642000+00:00",
  "total_latency_ms": 16120,
  "routing": { "modality": "Mammography", "modality_index": 4, "confidence": 0.98, /* …top3… */ },

  "disease_model": "mammography",

  "classification": {
    "disease": "mammography",
    "predictions": [
      { "class": "malignant", "probability": 0.6624 },
      { "class": "benign",    "probability": 0.2658 },
      { "class": "normal",    "probability": 0.0718 }
    ],
    "top_prediction": "malignant",
    "top_confidence": 0.6624,
    "multilabel": false,
    "arch": "resnet50"
  },

  "segmentation": {
    "regions": [
      { "id": 1, "bbox": { "x": 122, "y": 246, "width": 22, "height": 10 }, "area_pixels": 84 }
    ],
    "num_regions": 1,
    "has_findings": true,
    "arch": "segformer_b3"
  },

  "segmentation_overlay": "data:image/png;base64,iVBORw0…",   // original image + mask overlay
  "xai_heatmap":           "data:image/png;base64,iVBORw0…",   // Grad-CAM++ heatmap
  "xai_error": null,

  "report": "FINDINGS: …\nIMPRESSION: …\nRECOMMENDATION: …",   // LLM-generated radiology-style report
  "report_provider": "Gemini",                                  // Gemini -> GLM -> OpenRouter fallback
  "report_error": null,

  "safety": {
    "status": "needs_radiologist_review",                        // "ai_assisted" | "needs_radiologist_review"
    "display_label": "Needs radiologist review",
    "needs_radiologist_review": true,
    "unsupported_or_ambiguous": false,
    "warnings": ["Classifier confidence is below the review threshold."],
    "disclaimer": "AI output is decision support only and must be reviewed by a qualified radiologist before clinical use."
  },

  "image_quality": { "status": "acceptable", "width": 256, "height": 256, "brightness": 126.7, "contrast": 49.3, "blur_score": 48720.2, "warnings": [] },

  "clinical_context": {},

  "model_versions": {
    "device": "cpu",
    "model_repository": "umairinayat/medical-models",
    "router":      { "name": "BiomedCLIP Router", /* … */ },
    "classifier":  { "name": "resnet50-mammography",    "backbone": "resnet50",    /* … */ },
    "segmentor":   { "name": "segformer_b3-mammography","architecture": "segformer_b3", /* … */ },
    "reporting":   { "name": "RAG + LLM fallback chain", "provider_used": "Gemini" },
    "xai":         { "name": "Grad-CAM++" }
  },

  "original_image": "data:image/png;base64,…",
  "audit_trail": [
    { "step": "preprocess", "tool": "CLAHE + resize",          "latency_ms": 252,  "output": "acceptable" },
    { "step": "route",      "tool": "BiomedCLIP Router",       "latency_ms": 6699, "output": "Mammography (98.0%)" },
    { "step": "classify",   "tool": "BiomedCLIP-mammography",  "latency_ms": 447,  "output": "malignant (66.24%)" },
    { "step": "segment",    "tool": "UNet++-mammography",      "latency_ms": 4641, "output": "1 regions" },
    { "step": "explain",    "tool": "Grad-CAM++",              "latency_ms": 3142 },
    { "step": "report",     "tool": "LLM (Gemini)",            "latency_ms": 939 }
  ],

  "ultrasound_options": null                                     // ["breast_ultrasound","thyroid_ultrasound"] when modality=Ultrasound
}
```

### Field-by-field guide (what to render in the app)

| Path | Use |
|---|---|
| `routing.modality` + `routing.confidence` | Top banner: "Detected: X-Ray (97%)" |
| `classification.top_prediction` + `top_confidence` | Diagnosis chip |
| `classification.predictions` | Probability bars for every class |
| `segmentation.regions` | List of bounding boxes (x, y, width, height in pixels of the **original** image) |
| `segmentation_overlay` | PNG (base64 data URI) — original image with mask colored over it |
| `xai_heatmap` | PNG (base64 data URI) — Grad-CAM++ overlay showing which pixels drove the decision |
| `report` | The multi-paragraph radiology-style report from the LLM |
| `safety.display_label` | Always show this prominently; if `needs_radiologist_review` is true, surface the warnings |
| `image_quality.warnings` | Show as alerts ("Image too dark", "Blurry", etc.) |
| `audit_trail` | Optional debug/timing panel |
| `ultrasound_options` | If non-null, show a picker (Breast vs Thyroid) and re-call `/api/analyze` with the chosen `force_disease` |

### Status codes

| HTTP | Meaning |
|---|---|
| `200` | OK |
| `400` | Bad upload (empty / unsupported type) |
| `422` | Multipart validation error (missing `file`) |
| `500` | Pipeline failure — see `detail` |

---

## 7. Mobile code snippets

### Dart (Flutter)
```dart
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

Future<Map<String, dynamic>> analyze(File image, {String? forceDisease}) async {
  final req = http.MultipartRequest(
    'POST', Uri.parse('http://65.108.253.38:7004/api/analyze'));
  req.files.add(await http.MultipartFile.fromPath('file', image.path,
      contentType: MediaType('image', 'png')));
  if (forceDisease != null) req.fields['force_disease'] = forceDisease;
  final res = await req.send();
  return json.decode(await res.stream.bytesToString());
}
```

### Kotlin (Android)
```kotlin
val body = MultipartBody.Builder().setType(MultipartBody.FORM)
    .addFormDataPart("file", "img.png",
        RequestBody.create("image/png".toMediaType(), file))
    .addFormDataPart("force_disease", "mammography")   // optional
    .build()
val req = Request.Builder()
    .url("http://65.108.253.38:7004/api/analyze")
    .post(body).build()
client.newCall(req).execute().use { resp ->
    val json = resp.body!!.string()
}
```

### Swift (iOS)
```swift
var req = URLRequest(url: URL(string: "http://65.108.253.38:7004/api/analyze")!)
req.httpMethod = "POST"
let boundary = "Boundary-\(UUID().uuidString)"
req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
var data = Data()
data.append("--\(boundary)\r\n".data(using: .utf8)!)
data.append("Content-Disposition: form-data; name=\"file\"; filename=\"img.png\"\r\n".data(using: .utf8)!)
data.append("Content-Type: image/png\r\n\r\n".data(using: .utf8)!)
data.append(imageData); data.append("\r\n".data(using: .utf8)!)
data.append("--\(boundary)--\r\n".data(using: .utf8)!)
req.httpBody = data
URLSession.shared.dataTask(with: req) { d, _, _ in /* parse JSON */ }.resume()
```

> Android: allow cleartext traffic. Add `<application android:usesCleartextTraffic="true">` in `AndroidManifest.xml`, or better — put the server behind HTTPS.

---

## 8. Latency expectations (CPU)

| Step | Typical |
|---|---|
| Router | 5–7 s |
| Classification | 0.3–1 s |
| Segmentation | 3–5 s (SegFormer-B3) / 0.5 s (UNet) |
| Grad-CAM++ | 2–3 s |
| LLM report | 1–3 s |
| **Total** | **10–20 s per image** |

First request after startup is slower (~30 s) because weights load into RAM. On GPU, divide by ~10×.

---

## 9. Notes / gotchas

- **Always send `force_disease` if the user picked a modality manually.** Otherwise the router may pick a different one.
- **Ultrasound images are ambiguous** — `routing.modality_index == 3` returns `ultrasound_options: ["breast_ultrasound","thyroid_ultrasound"]`. Show a picker and re-call with `force_disease`.
- **DICOM is supported** — send as `application/dicom`; the server decodes via `pydicom`.
- **Base64 images** are large. Don't log them. Consider rendering them via `Image.memory` (Flutter) / `Glide` (Android) directly from bytes.
- **Safety flag** — `safety.status == "needs_radiologist_review"` should be the default expectation for any real-world image; treat the AI output strictly as decision support.
