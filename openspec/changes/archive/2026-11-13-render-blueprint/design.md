# Design

## Context

The repository has two standalone directories: `backend/` (Express API and BullMQ workers) and `frontend/` (React 18 Vite SPA). Currently, deploying to Render requires manually creating each service in the web dashboard, configuring build/start commands, setting environment variables, and configuring SPA rewrites. Furthermore, running separate Render Background Workers incurs an ongoing monthly fee ($7/mo per worker).

See `proposal.md` for the motivation and `specs/render-deployment/spec.md` for the functional requirements.

## Goals / Non-Goals

**Goals:**
- Provide a single declarative `render.yaml` Blueprint at the repository root that orchestrates the frontend static site, consolidated backend web service, and managed Redis.
- Automate frontend build configuration with SPA rewrite rules (`/*` -> `/index.html`) and link the backend's public URL into `VITE_API_URL` at build time.
- Implement an in-process consolidated backend entry point (`src/main.combined.ts`) that runs Express, the file worker, and the report worker together under a single lifecycle.
- Maintain full backward compatibility with existing separate start commands (`npm start`, `npm run start:worker`, `npm run start:worker:report`) and local `docker-compose.yml`.

**Non-Goals:**
- Hosting MongoDB directly inside Render (Render does not offer native MongoDB; an external MongoDB Atlas cluster is connected via `MONGODB_URI`).
- Deprecating multi-container production deployments (separate container commands remain available).

## Decisions

### 1. In-Process Consolidated Backend Runtime (`src/main.combined.ts`)

- **Choice:** Create `backend/src/main.combined.ts` that boots the Express HTTP server, the file-processing BullMQ worker, and the report-generation BullMQ worker in the same Node.js process.
- **Lifecycle Coordination:**
  1. Initialize shared MongoDB and Redis connections.
  2. Start Express HTTP server listening on `config.port`.
  3. Start `file-worker` and `report-worker` instances using BullMQ's worker runtime.
  4. On `SIGTERM` or `SIGINT`, run coordinated graceful shutdown: stop HTTP listener, close BullMQ workers (allowing active jobs to finish), close queues, and disconnect Redis and Mongo within a 15-second timeout.
- **Alternatives Considered:**
  - *Shell-based process manager (e.g. `concurrently` or `pm2`)*: Adds unnecessary npm dependencies, complicates signal forwarding on Linux containers, and masks individual process exit codes.
  - *Separate Render Background Workers*: Standard production setup, but incurs additional instance costs ($14/month minimum).

### 2. Render Blueprint Specification (`render.yaml`)

- **Structure:**
  ```yaml
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
          fromService:
            type: web
            name: bfdp-api
            property: url

    - type: web
      name: bfdp-api
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
          fromService:
            type: redis
            name: bfdp-redis
            property: connectionString
        - key: APP_JWT_SECRET
          generateValue: true
        - key: DEMO_AUTH_ENABLED
          value: "true"
        - key: CORS_ORIGINS
          sync: false

  databases:
    - name: bfdp-redis
      plan: starter
      ipAllowList: []
  ```
- **Circular Dependency Prevention:**
  The frontend retrieves `VITE_API_URL` from `bfdp-api`'s public URL using `fromService`. To avoid circular references during Render's initial blueprint evaluation, `CORS_ORIGINS` in `bfdp-api` is configured with `sync: false` rather than referencing `bfdp-frontend`.

### 3. Build & NPM Scripts

In `backend/package.json`:
- Add script `"start:combined": "node dist/main.combined.js"`
- Add script `"dev:combined": "tsx watch src/main.combined.ts"`

## Risks / Trade-offs

- **[Resource Sharing in Single Container]** Running API handlers and BullMQ worker jobs in the same Node.js event loop could lead to latency spikes if a worker performs heavy synchronous parsing.
  - *Mitigation:* Ingestion parsing is chunked and streamed, and BullMQ concurrency defaults to `QUEUE_CONCURRENCY=2`. For standard batches (1-20 files of 1,000 rows), CPU and memory remain well within a single 512MB/1-core instance. Users needing high throughput can switch to separate worker services at any time.
- **[Free Tier Sleep Behavior]** Render Free Web Services sleep after 15 minutes of inbound inactivity.
  - *Mitigation:* While sleeping, background jobs will not process. Document that active user uploads and dashboard polling keep the web service awake during batches, and recommend Render Starter tier for continuous background ingestion.
- **[External MongoDB Setup]** Render does not provision MongoDB.
  - *Mitigation:* Marked `sync: false` on `MONGODB_URI` so Render's Blueprint setup interface explicitly prompts the user to input their MongoDB Atlas connection string before launching.

