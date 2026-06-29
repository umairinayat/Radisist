import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import UPLOADS_DIR, DISEASE_MODELS, ROUTER_CLASSES, MODALITY_TO_DISEASE
from app.models.model_registry import download_all_models
from app.models.router import router_instance
from app.pipeline.orchestrator import analyze_image
from app.pipeline.preprocessing import load_image, preprocess_for_classification

SAMPLES_DIR = Path(__file__).parent / "static" / "samples"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Radisist - downloading models...")
    try:
        download_all_models()
    except Exception as e:
        logger.error(f"Model download failed: {e}. Models will be downloaded on first use.")
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    yield
    logger.info("Shutting down Radisist")


app = FastAPI(title="Radisist", description="Medical AI Orchestration Platform", lifespan=lifespan)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR), follow_symlink=True), name="static")


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = STATIC_DIR / "index.html"
    return HTMLResponse(content=html_path.read_text())


@app.get("/api/samples")
async def api_samples(limit: int = 5):
    """Return the flat gallery of sample images: up to `limit` per modality."""
    if not SAMPLES_DIR.exists():
        return {"diseases": []}
    diseases = []
    for disease_dir in sorted(SAMPLES_DIR.iterdir()):
        if not disease_dir.is_dir():
            continue
        if disease_dir.name not in DISEASE_MODELS:
            continue
        info = DISEASE_MODELS[disease_dir.name]
        imgs = sorted(disease_dir.glob("sample_*.jpg"))[:limit]
        if not imgs:
            continue
        diseases.append({
            "disease": disease_dir.name,
            "specialist": info.get("specialist", ""),
            "thumbnails": [f"/static/samples/{disease_dir.name}/{p.name}" for p in imgs],
        })
    return {"diseases": diseases}


@app.post("/api/analyze")
async def api_analyze(
    file: UploadFile = File(...),
    force_disease: str = Form(None),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        # Allow common medical image types
        allowed = {"image/jpeg", "image/png", "image/bmp", "image/tiff", "application/octet-stream", "application/dicom"}
        if file.content_type not in allowed:
            raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(400, "Empty file")

    try:
        result = await analyze_image(file_bytes, file.filename, force_disease)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.post("/api/route")
async def api_route(file: UploadFile = File(...)):
    file_bytes = await file.read()
    try:
        image = load_image(file_bytes)
        image = preprocess_for_classification(image)
        result = router_instance.predict(image)
        # Add disease model options
        idx = result["modality_index"]
        result["disease_models"] = MODALITY_TO_DISEASE.get(idx, [])
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Routing failed: {e}", exc_info=True)
        raise HTTPException(500, f"Routing failed: {str(e)}")


@app.get("/api/models")
async def api_models():
    models = []
    for disease, info in DISEASE_MODELS.items():
        models.append({
            "name": disease,
            "specialist": info["specialist"],
            "classes": info["classes"],
            "has_segmentation": info["has_segmentation"],
            "multilabel": info.get("multilabel", False),
        })
    return {
        "router_classes": ROUTER_CLASSES,
        "disease_models": models,
    }


@app.get("/api/health")
async def api_health():
    return {"status": "ok", "service": "Radisist"}
