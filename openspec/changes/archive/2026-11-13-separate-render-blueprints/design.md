# Design

## Context

The repository has two standalone directories: `backend/` and `frontend/`. Previously, a single root `render.yaml` was used to deploy both services together. However, deploying both at once introduces friction because the frontend requires the backend's public URL before Render has created and named the service, and mutual domain resolution can cause circular configuration issues.

See `proposal.md` for motivation and `specs/render-deployment/spec.md` for the updated requirements.

## Goals / Non-Goals

**Goals:**
- Provide `backend/render.yaml` to deploy `bfdp-api` (consolidated web service on `npm run start:combined`) on Render's Free tier with `CORS_ORIGINS: "*"`.
- Provide `frontend/render.yaml` to deploy `bfdp-frontend` (static site with SPA rewrites) on Render's Free tier with a prompt for `VITE_API_URL`.
- Remove the unified root `render.yaml` to maintain clean service boundaries.
- Document the two-stage deployment flow in `README.md`.

**Non-Goals:**
- Changing application code in `backend/` or `frontend/` (the standalone packaging and consolidated server runtime remain unchanged).

## Decisions

### 1. Dedicated Subfolder Blueprint Files

- **Choice:** Create `backend/render.yaml` and `frontend/render.yaml`.
- **Rationale:** Render's Blueprint setup interface allows specifying a custom **Blueprint Path** (e.g. `backend/render.yaml` or `frontend/render.yaml`). This decouples deployments:
  1. The operator deploys the backend first.
  2. Render provisions the service and displays its live public URL (e.g., `https://bfdp-api-xxxx.onrender.com`).
  3. The operator deploys the frontend and enters that exact URL into `VITE_API_URL`.

### 2. Backend Blueprint Structure (`backend/render.yaml`)

```yaml
version: "1"

services:
  - type: web
    name: bfdp-api
    plan: free
    runtime: node
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm run start:combined
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: MONGODB_DB
        value: bfdp
      - key: REDIS_URL
        sync: false
      - key: APP_JWT_SECRET
        generateValue: true
      - key: DEMO_AUTH_ENABLED
        value: "true"
      - key: CORS_ORIGINS
        value: "*"
```

### 3. Frontend Blueprint Structure (`frontend/render.yaml`)

```yaml
version: "1"

services:
  - type: web
    name: bfdp-frontend
    runtime: static
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_API_URL
        sync: false
```

## Risks / Trade-offs

- **[Two Setup Steps Instead of One]** The user creates two Blueprints in the Render dashboard instead of one.
  - *Mitigation:* Document the exact two steps in `README.md`. The separation eliminates guessing and deployment failures, making it far more reliable.

