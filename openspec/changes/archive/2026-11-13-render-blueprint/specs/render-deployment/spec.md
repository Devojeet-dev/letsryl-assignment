# Spec Delta

## Purpose

Enables one-click multi-service deployment on Render using a declarative Blueprint specification (`render.yaml`) and provides a consolidated backend execution mode that runs the API server and BullMQ workers concurrently within a single web service.

## ADDED Requirements

### Requirement: Declarative Multi-Service Blueprint
The project SHALL provide a root `render.yaml` specification that defines a static site for the frontend, a Node.js web service for the consolidated backend, and a managed Redis instance.

#### Scenario: Blueprint defines frontend static site
- **WHEN** Render evaluates `render.yaml` for the static site
- **THEN** it SHALL set `rootDir: frontend`, `runtime: static`, `buildCommand: npm install && npm run build`, `staticPublishPath: dist`, and rewrite all routes to `/index.html`

#### Scenario: Blueprint links API URL to frontend
- **WHEN** Render builds the frontend static site
- **THEN** it SHALL inject the public URL of the backend web service into `VITE_API_URL` using `fromService`

#### Scenario: Blueprint defines consolidated backend web service
- **WHEN** Render evaluates `render.yaml` for the backend service
- **THEN** it SHALL set `rootDir: backend`, `runtime: node`, `buildCommand: npm install && npm run build`, `startCommand: npm run start:combined`, and configure a health check at `/health`

#### Scenario: Blueprint provisions managed Redis
- **WHEN** Render provisions services declared in `render.yaml`
- **THEN** it SHALL provision a managed Redis datastore and inject its connection string into `REDIS_URL` for the backend service

### Requirement: Consolidated Backend Execution
The backend service SHALL provide a unified entry point and npm script that boots the Express API, the file-processing BullMQ worker, and the report-generation BullMQ worker in a single process with unified lifecycle handling.

#### Scenario: Consolidated backend startup
- **WHEN** `npm run start:combined` is executed in `backend/`
- **THEN** the process SHALL connect to MongoDB and Redis, start the Express HTTP listener on `PORT`, and start BullMQ workers for both `file-processing` and `report-generation` queues

#### Scenario: Graceful shutdown of consolidated backend
- **WHEN** the consolidated backend process receives `SIGTERM` or `SIGINT`
- **THEN** it SHALL stop accepting new HTTP connections, pause worker queue consumption, finish in-flight jobs within a bounded timeout, disconnect from Redis and Mongo, and exit with code 0

