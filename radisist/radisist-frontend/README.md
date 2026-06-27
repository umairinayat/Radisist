# Radisist Frontend

This is the React frontend for the integrated Radisist application.

## Responsibilities

- login and registration
- patient dashboard
- scan upload workspace
- modality sample browsing
- router recommendation flow
- analyzed report workspace
- segmentation and heatmap display
- image expansion and crop saving

## Structure

```text
src/
|- Auth/
|  Authentication screens
|- LandingPage/
|  Public marketing/landing pages
|- Patient/
|  Patient dashboard, upload flow, analyzed view, reports
|- Radiologist/
|  Radiologist dashboard area
|- Routes/
|  App routing and protected routes
|- api/
|  Frontend API wrappers for Django
```

## Development Port

- `7005`

## Required Environment Variable

- `VITE_DJANGO_API_BASE`
  Example: `http://127.0.0.1:7400/api`

## Local Run

```bash
npm install
VITE_DJANGO_API_BASE=http://127.0.0.1:7400/api npx -y node@20 ./node_modules/vite/bin/vite.js --host 0.0.0.0 --port 7005
```

For the repository-level picture, see `/root/fyp/README.md`.
