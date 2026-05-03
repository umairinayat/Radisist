# Radisist Monorepo

This repository contains the Radisist medical imaging pipeline, the integrated Django backend, and the React frontend.

## Repository Layout

```text
/root/fyp
|- app/
|  Legacy standalone FastAPI pipeline implementation
|- models/
|  Downloaded model checkpoints and metrics
|- radisist/
|  Integrated application workspace
|  |- radisist_backend/
|  |  Django backend for auth, scans, reports, and pipeline endpoints
|  |- radisist-fixed/
|     |- radisist-fixed/
|        React frontend used by the integrated app
|- scripts/
|  Utility scripts for sample images
|- uploads/
|  Uploaded/generated runtime files
|- Dockerfile.django
|- Dockerfile.frontend
|- docker-compose.yml
```

## Which Parts Matter Most

- Use `radisist/radisist_backend/` when working on backend features.
- Use `radisist/radisist-fixed/radisist-fixed/` when working on frontend features.
- Use `app/` when working on the underlying standalone pipeline logic that Django now wraps.

## Current Integrated Stack

- Standalone FastAPI pipeline: `http://localhost:7004`
- Django backend: `http://localhost:7400`
- React frontend: `http://localhost:7005`

If you see something on port `8000`, that is not part of this repository's integrated stack.

## Main Integrated Flow

1. User logs in through the React app.
2. Patient opens the upload workspace.
3. Django serves modality sample images.
4. The router recommendation runs through Django.
5. Full analysis runs through Django and stores:
   - routing result
   - classification result
   - segmentation result
   - heatmap
   - audit trail
   - structured AI report
6. The analyzed page reads the stored Django scan payload.

## Important Folders

### `app/`

- Legacy FastAPI pipeline project.
- Still useful as the reference implementation for routing, classification, segmentation, XAI, and report generation.

### `radisist/radisist_backend/`

- Django project.
- Handles auth, roles, scans, reports, and the integrated pipeline endpoints.

### `radisist/radisist-fixed/radisist-fixed/`

- React frontend.
- Contains auth screens, patient dashboard, upload flow, analyzed workspace, and reports UI.

## Local Development Notes

### Django

The local development setup uses a SQLite override for convenience.

```bash
DATABASE_URL=sqlite:////root/fyp/radisist/radisist_backend/db.sqlite3 DEBUG=true /root/fyp/.venv/bin/python /root/fyp/radisist/radisist_backend/manage.py runserver 0.0.0.0:7400
```

### Frontend

The frontend toolchain expects Node 20.

```bash
cd /root/fyp/radisist/radisist-fixed/radisist-fixed
VITE_DJANGO_API_BASE=http://127.0.0.1:7400/api npx -y node@20 ./node_modules/vite/bin/vite.js --host 0.0.0.0 --port 7005
```

## Docker

- `Dockerfile.django`
- `Dockerfile.frontend`
- `docker-compose.yml`

These files are intended to run the integrated stack on the same non-`8000` ports:

- Django: `7400`
- Frontend: `7005`

## Folder-Level READMEs

See these for more detail:

- `app/README.md`
- `radisist/radisist_backend/README.md`
- `radisist/radisist-fixed/radisist-fixed/README.md`
- `PIPELINE_FLOW.md`
- `PIPELINE_ARCHITECTURE_README.md`
