# Radisist Workspace

This folder contains the integrated application code.

## Inside This Folder

- `radisist_backend/`
  Django backend for auth, scans, reports, and integrated pipeline endpoints.
- `radisist-fixed/`
  Frontend workspace.

## Why The Frontend Path Looks Nested

The active frontend lives at:

`radisist-fixed/radisist-fixed/`

That nesting comes from the original frontend workspace layout. The inner folder is the actual Vite/React project.

If you are looking for app code, go to:

- `radisist-fixed/radisist-fixed/src/`

If you are looking for backend code, go to:

- `radisist_backend/apps/`
