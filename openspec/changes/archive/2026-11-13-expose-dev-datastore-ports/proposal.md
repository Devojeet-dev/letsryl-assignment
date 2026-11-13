# Proposal: Expose Datastore Ports and Relax Dev CORS for Local Development

## Why

When developing locally with `npm run dev` on the host machine, the backend API process (`apps/backend`) crashes at startup with `connect ECONNREFUSED 127.0.0.1:27017` because `docker-compose.yml` does not publish container ports for MongoDB or Redis to the host interface. Furthermore, when the frontend dev server shifts from port `5173` to `5174` (due to port collisions), the backend rejects frontend API calls with CORS errors because `CORS_ORIGINS` strictly permits only `http://localhost:5173`. Exposing the datastore ports and supporting standard local development origins unblocks host-based development workflows.

## What Changes

* **Expose MongoDB and Redis host ports in `docker-compose.yml`**:
  * Map `27017:27017` for the `mongo` service.
  * Map `6379:6379` for the `redis` service.
* **Support dynamic localhost origins in development**:
  * Update `apps/backend/src/middleware/security.middleware.ts` to allow standard `localhost` and `127.0.0.1` origins on any port when running in development mode (`NODE_ENV !== 'production'`).
  * Expose `idempotent-replayed` header in CORS configuration.
* **Update development configuration**:
  * Expand default `CORS_ORIGINS` in `apps/backend/.env` and `apps/backend/.env.example` to include `http://localhost:5174` and `http://127.0.0.1:*`.

## Capabilities

### New Capabilities
- `local-environment`: Configuration and port exposure enabling host development processes (`npm run dev`) to connect to containerized MongoDB and Redis services with seamless browser CORS support.

### Modified Capabilities
*(None - existing business logic specifications are unchanged).*

## Impact

* **Infrastructure**: `docker-compose.yml` now publishes ports `27017` and `6379`. (Does not affect container-to-container networking within Compose networks).
* **Backend**: `apps/backend/src/middleware/security.middleware.ts` allows local browser clients on shifted Vite ports during development.
* **Configuration**: `apps/backend/.env` and `apps/backend/.env.example` include expanded local dev origins.

