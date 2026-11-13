# Tasks: Datastore Port Exposure and Development CORS Permissiveness

## 1. Infrastructure & Compose Configuration

- [x] 1.1 Add host port mapping `27017:27017` to the `mongo` service in `docker-compose.yml` and verify with `docker compose config` (or YAML syntax check)
- [x] 1.2 Add host port mapping `6379:6379` to the `redis` service in `docker-compose.yml` and verify with `docker compose config` (or YAML syntax check)

## 2. CORS and Development Middleware

- [x] 2.1 Update `apps/backend/src/middleware/security.middleware.ts` to permit dynamic localhost / 127.0.0.1 origins on any port when `!config.isProduction` and expose the `idempotent-replayed` header
- [x] 2.2 Update default `CORS_ORIGINS` in `apps/backend/.env` and `apps/backend/.env.example` to include `http://localhost:5174` and `http://127.0.0.1:5173,http://127.0.0.1:5174`

## 3. Verification & Testing

- [x] 3.1 Run `npm run typecheck` and `npm test` across the monorepo to verify TypeScript compilation and test suite health
- [x] 3.2 Verify that an HTTP preflight `OPTIONS` request from origin `http://localhost:5174` to `/api/v1/auth/demo-session` receives successful CORS response headers

