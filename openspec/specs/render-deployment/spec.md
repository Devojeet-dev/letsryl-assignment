# render-deployment Specification

## Purpose
Enables one-click multi-service deployment on Render using a declarative Blueprint specification (`render.yaml`) and provides a consolidated backend execution mode that runs the API server and BullMQ workers concurrently within a single web service.

## Requirements

### Requirement: Declarative Multi-Service Blueprint
The project SHALL provide independent per-service Blueprint specifications (`backend/render.yaml` and `frontend/render.yaml`) allowing decoupled, separate deployment of the frontend static site and consolidated backend web service without circular dependency.

#### Scenario: Blueprint defines frontend static site
- **WHEN** Render evaluates `frontend/render.yaml`
- **THEN** it SHALL set `rootDir: frontend`, `runtime: static`, `buildCommand: npm install && npm run build`, `staticPublishPath: dist`, and rewrite all routes to `/index.html`

#### Scenario: Blueprint links API URL to frontend
- **WHEN** Render evaluates `frontend/render.yaml`
- **THEN** it SHALL configure `VITE_API_URL` with `sync: false` to prompt for the backend web service URL

#### Scenario: Blueprint defines consolidated backend web service
- **WHEN** Render evaluates `backend/render.yaml`
- **THEN** it SHALL set `rootDir: backend`, `runtime: node`, `plan: free`, `buildCommand: npm install && npm run build`, `startCommand: npm run start:combined`, `CORS_ORIGINS: "*"`, and configure a health check at `/health`

#### Scenario: Blueprint configures external Redis
- **WHEN** Render evaluates `backend/render.yaml`
- **THEN** it SHALL configure `REDIS_URL` with `sync: false` to prompt for an external free Redis connection string (e.g. Upstash)

### Requirement: Consolidated Backend Execution
The backend service SHALL provide a unified entry point and npm script that boots the Express API, the file-processing BullMQ worker, and the report-generation BullMQ worker in a single process with unified lifecycle handling.

#### Scenario: Consolidated backend startup
- **WHEN** `npm run start:combined` is executed in `backend/`
- **THEN** the process SHALL connect to MongoDB and Redis, start the Express HTTP listener on `PORT`, and start BullMQ workers for both `file-processing` and `report-generation` queues

#### Scenario: Graceful shutdown of consolidated backend
- **WHEN** the consolidated backend process receives `SIGTERM` or `SIGINT`
- **THEN** it SHALL stop accepting new HTTP connections, pause worker queue consumption, finish in-flight jobs within a bounded timeout, disconnect from Redis and Mongo, and exit with code 0
