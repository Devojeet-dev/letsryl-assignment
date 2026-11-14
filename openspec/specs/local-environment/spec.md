# local-environment Specification

## Purpose
Provides local environment configuration and datastore port exposure enabling developer services running directly on the host machine to access containerized databases and communicate across local development ports without CORS restrictions.

## Requirements

### Requirement: Datastore Port Exposure
The Docker Compose orchestration configuration SHALL publish standard host ports for containerized MongoDB and Redis services to allow host-based processes to connect.

#### Scenario: Host connection to MongoDB
- **WHEN** a developer starts datastores with `docker compose up -d mongo`
- **THEN** MongoDB SHALL accept connections on host address `127.0.0.1:27017`

#### Scenario: Host connection to Redis
- **WHEN** a developer starts datastores with `docker compose up -d redis`
- **THEN** Redis SHALL accept connections on host address `127.0.0.1:6379`

### Requirement: Development CORS Permissiveness
When running in development mode (`NODE_ENV !== 'production'`), the API middleware SHALL allow cross-origin requests from any standard local development origin (including shifted Vite ports on `localhost` and `127.0.0.1`).

#### Scenario: Request from shifted Vite development port
- **WHEN** a browser makes an API request from `http://localhost:5174` or `http://127.0.0.1:5174` to the API while `NODE_ENV=development`
- **THEN** the API SHALL respond with `Access-Control-Allow-Origin` matching the requesting origin and allow the request

#### Scenario: Preflight options request with custom headers
- **WHEN** a browser issues a preflight `OPTIONS` request with `idempotency-key` and `authorization` headers from a local dev origin
- **THEN** the API SHALL approve the preflight request with HTTP 204 and expose headers including `idempotent-replayed`

### Requirement: Synchronized Development Port Configuration
The local development environment documentation and configuration SHALL accurately reflect Vite dev server port configuration and avoid references to deleted monorepo paths.

#### Scenario: Developer consults setup documentation
- **WHEN** a developer inspects `README.md` and `.env.example`
- **THEN** documented ports, CORS origins, and configuration paths SHALL match the active workspace layout without references to `apps/backend` or deleted packages
