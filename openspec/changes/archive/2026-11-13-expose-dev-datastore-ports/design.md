# Design: Datastore Port Exposure and Development CORS Permissiveness

## Context

See [proposal.md](proposal.md) for motivation. Currently:
- `docker-compose.yml` defines `mongo` (port 27017) and `redis` (port 6379) without published `ports:`.
- `apps/backend/src/main.api.ts` connects to `mongodb://127.0.0.1:27017` and `redis://127.0.0.1:6379` when launched locally with `npm run dev`.
- `apps/backend/src/middleware/security.middleware.ts` restricts CORS strictly to origins listed in `config.corsOrigins`.
- When port `5173` is occupied, Vite binds to port `5174`, which is not in `config.corsOrigins`, causing browser fetch errors.

## Goals / Non-Goals

**Goals:**
* Enable `docker compose up -d mongo redis` to publish ports accessible to host development processes (`127.0.0.1:27017` and `127.0.0.1:6379`).
* Ensure local web browsers running on shifted Vite development ports (e.g., `http://localhost:5174` or `http://127.0.0.1:5174`) can communicate with the local API at `http://localhost:4000`.
* Keep production CORS secure and restricted solely to configured origins.

**Non-Goals:**
* Change production Docker Compose deployment behavior (internal container networking through service names `mongo` and `redis` remains intact).
* Implement in-memory mock databases (the system relies on genuine MongoDB and Redis instances).

## Decisions

### Decision 1: Expose ports directly in `docker-compose.yml`
* **Choice**: Add `ports: ["27017:27017"]` under `mongo` and `ports: ["6379:6379"]` under `redis`.
* **Rationale**: The README and `.env.example` already instruct developers that `docker compose up -d mongo redis publishes both on localhost`. Adding the port bindings satisfies this documented contract without needing a separate compose override file.
* **Alternative considered**: Requiring a separate `docker-compose.dev.yml` or `docker-compose.override.yml`. Rejected because it introduces friction and diverges from the single documented command setup.

### Decision 2: Dynamic localhost CORS in non-production environments
* **Choice**: In `apps/backend/src/middleware/security.middleware.ts`, if `!config.isProduction`, allow any origin matching `/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/`.
* **Rationale**: Vite automatically increments its port when `5173` is in use (to `5174`, `5175`, etc.). Rather than forcing developers to manually update `.env` and restart the backend every time a port shifts, the development CORS policy gracefully permits local developer origins while preserving strict origin checking in production.
* **Alternative considered**: Relying solely on `CORS_ORIGINS` comma-separated values in `.env`. Rejected as the sole fix because port shifting during development leads to opaque `Failed to fetch` errors for developers.

### Decision 3: Expose `idempotent-replayed` header in CORS configuration
* **Choice**: Add `'idempotent-replayed'` to `exposedHeaders` in `cors({...})`.
* **Rationale**: When a client replays a batch upload with an identical idempotency key, the backend sets `idempotent-replayed: true`. Without exposing this header, browser JavaScript cannot inspect the replay flag.

## Risks / Trade-offs

* **[Host Port Conflicts]**: If a developer already has native `mongod` or `redis-server` running on their machine, `docker compose up -d mongo redis` will report a port bind collision.
  * *Mitigation*: This is expected behavior for local port publishing. Developers either stop their native daemon or use native datastores directly.
* **[Security Leaks via Permissive CORS]**: Allowing dynamic localhost origins could permit unauthorized local origins if enabled in production.
  * *Mitigation*: Strictly gate the localhost regex behind `!config.isProduction`. In production, only origins explicitly listed in `CORS_ORIGINS` are accepted.

