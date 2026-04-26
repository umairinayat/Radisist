# Radisist Django Backend

This Django project is the main backend for the integrated Radisist application.

## Responsibilities

- JWT authentication
- user roles
- scan persistence
- report persistence
- Django endpoints that wrap the pipeline in `/root/fyp/app/`

## Structure

```text
radisist_backend/
|- backend/
|  Django settings and root URLs
|- apps/
|  |- users/
|  |  Custom user model, serializers, auth backend
|  |- radiology/
|     Scan/report models and pipeline-facing endpoints
|- media/
|  Uploaded files and generated media
|- manage.py
```

## Important API Areas

- `/api/auth/`
- `/api/radiology/scans/`
- `/api/radiology/reports/`
- `/api/radiology/pipeline/health/`
- `/api/radiology/pipeline/samples/`
- `/api/radiology/pipeline/route/`
- `/api/radiology/pipeline/analyze/`

## Local Run

```bash
DATABASE_URL=sqlite:////root/fyp/radisist/radisist_backend/db.sqlite3 DEBUG=true /root/fyp/.venv/bin/python manage.py migrate
DATABASE_URL=sqlite:////root/fyp/radisist/radisist_backend/db.sqlite3 DEBUG=true /root/fyp/.venv/bin/python manage.py runserver 0.0.0.0:7400
```
