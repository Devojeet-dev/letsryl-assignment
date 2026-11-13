# Proposal

## Why

Deploying the application to Render currently requires manually configuring multiple individual services, environment variables, health check paths, and SPA rewrites across the Render dashboard. Furthermore, running separate background workers on Render requires paid subscriptions ($7/month per worker). Providing a root `render.yaml` Blueprint enables single-click declarative deployment, and a consolidated backend execution mode allows running the Express API and BullMQ workers within a single Web Service instance, minimizing hosting costs.

## What Changes

- Add a root `render.yaml` (Render Blueprint) specifying:
  - A **Static Site** for `frontend/` with automated build commands, SPA routing rewrite fallback (`/*` -> `/index.html`), and automatic binding of `VITE_API_URL` to the backend web service via `fromService`.
  - A **Web Service** for `backend/` running the consolidated API and workers runtime, with automated health checks at `/health`.
  - A managed **Redis** instance (`databases` block) provisioned by Render, with connection strings bound to the backend service.
  - Interactive prompts (`sync: false`) for external MongoDB Atlas connection (`MONGODB_URI`) and CORS origin configuration (`CORS_ORIGINS`).
  - Automatic cryptographic secret generation for `APP_JWT_SECRET` (`generateValue: true`).
- Add a unified backend entry point (`src/main.combined.ts`) and script (`npm run start:combined`) in `backend/` that boots the Express HTTP API server alongside the file-processing and report-generation BullMQ worker runtimes with coordinated graceful shutdown.
- Update documentation and deployment instructions with the single-click Render Blueprint setup and architecture.

## Capabilities

### New Capabilities
- `render-deployment`: Declarative multi-service deployment automation using Render Blueprints (`render.yaml`) and consolidated backend runtime.

### Modified Capabilities
<!-- None: existing standalone packaging contracts remain unchanged -->

## Impact

- **Root repository**: Adds `render.yaml`.
- **Backend**: Adds `src/main.combined.ts` and updates `package.json` with `start:combined` script.
- **Frontend**: No code changes; static deployment handled declaratively in `render.yaml`.
- **Documentation**: Updated with Render Blueprint one-click instructions.

