# Legacy Pipeline Service

This folder contains the standalone FastAPI-based Radisist pipeline.

## Purpose

- model download and loading
- modality routing
- disease classification
- segmentation
- Grad-CAM explainability
- LLM-based report generation

## Current Role In The Repo

This service is still useful as the core pipeline implementation, but the integrated application now exposes the main user-facing flow through Django in `radisist/radisist_backend/`.

In practice:

- `app/` contains the pipeline logic
- Django wraps that logic for the integrated product

## Local Port

- standalone FastAPI port: `7004`

Example:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 7004
```

## Main Files

- `main.py`
  FastAPI app entry point.
- `config.py`
  Pipeline configuration and model metadata.
- `models/`
  Router, classifier, segmentor, and model registry.
- `pipeline/`
  Orchestration, preprocessing, XAI, and report generation.
- `static/`
  Standalone demo assets and sample images.
