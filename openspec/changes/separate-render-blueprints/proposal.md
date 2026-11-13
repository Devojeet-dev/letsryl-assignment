# Proposal

## Why

Using a single shared root `render.yaml` forces simultaneous multi-service provisioning, creating friction where the frontend must be configured with the backend API's public URL before Render has even assigned a domain to the backend service. Providing separate Blueprint files (`backend/render.yaml` and `frontend/render.yaml`) allows deploying the backend first to receive a live domain, followed by the frontend with that exact URL, eliminating configuration guesswork and coupling.

## What Changes

- Add `backend/render.yaml` containing the declarative definition for the consolidated backend web service (`bfdp-api`) on Render's Free tier with `CORS_ORIGINS: "*"` and Upstash Redis configuration.
- Add `frontend/render.yaml` containing the declarative definition for the static site (`bfdp-frontend`) on Render's Free tier with SPA routing rewrites (`/*` -> `/index.html`) and prompt parameter `VITE_API_URL`.
- Remove the unified root `render.yaml` to prevent ambiguity.
- Update `README.md` and documentation to describe deploying via subfolder Blueprint paths.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `render-deployment`: Specify independent per-service Blueprint files (`backend/render.yaml` and `frontend/render.yaml`) instead of a single root blueprint.

## Impact

- **Root directory**: Removes `render.yaml`.
- **Backend**: Adds `backend/render.yaml`.
- **Frontend**: Adds `frontend/render.yaml`.
- **Documentation**: Updates `README.md` and architecture notes with separate Blueprint paths.

