# Spec Delta

## MODIFIED Requirements

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
