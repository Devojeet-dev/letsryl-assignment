# Proposal

## Why

The project is entering its final submission phase for the take-home assignment. While the core async processing, financial analytics, and React dashboard are fully functional, an audit against the assignment specification revealed code complexity (unused types and utilities), missing test suites required by the rubric (authentication and queue outage), unaliased root endpoints (`/batches` returning 404 outside `/api/v1`), stale monorepo comments/aliases, and documentation gaps (missing public deployment links and port discrepancies). Addressing these issues ensures 100% compliance with evaluation criteria, clean developer experience, and professional documentation.

## What Changes

- **Code Simplification & Dead Code Removal**:
  - Delete unused branded types (`Brand`, `BatchId`, `FileId`, `UserId`) and unused `Result<T, E>` monad in `backend/src/shared/types/`.
  - Remove unused utility functions (`isRecord`, `asFiniteNumber`, `isNonEmptyArray` in `guards.ts`, `sumMoney` in `money.ts`, `newIdempotencyKey` in `id.ts`, and unused schemas in `pagination.schema.ts`).
  - Eliminate duplicate `formatBytes` logic in `workbook.builder.ts` in favor of the shared helper in `file-size.ts`.
  - Move `@types/*` and `typescript` from `dependencies` to `devDependencies` in `backend/package.json`.
- **API Route Aliasing**:
  - Expose root-level `/batches` endpoints in `backend/src/app.ts` as aliases to `/api/v1/batches`, guaranteeing that automated evaluation scripts hitting `/batches` without the `/api/v1` prefix succeed.
- **Automated Test Suite Expansion**:
  - Add test suite for **Authentication** covering token validation, expired token rejection, invalid signatures, and demo login.
  - Add test suite for **Queue Outage & Backpressure** verifying `503 QUEUE_UNAVAILABLE` error responses under queue overload and Redis connection failure.
- **Hover Documentation (JSDoc/TSDoc)**:
  - Add descriptive JSDoc markdown documentation blocks on all exported public controllers, services, middleware, and API client methods for rich IDE hover support.
  - Remove leftover informal comments and stale monorepo references (`apps/backend`, `packages/shared`).
- **Documentation & Configuration Alignment**:
  - Add a dedicated "Submission Deliverables & Live URLs" section at the top of `README.md`.
  - Align Vite dev port (`3000` vs `5173`) and CORS configurations across `README.md`, `docker-compose.yml`, and `.env.example`.
  - Clean up phantom path alias (`packages/shared`) in `backend/vitest.config.ts`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `backend-infrastructure`: Modified to mandate dual endpoint path mounting (`/batches` alongside `/api/v1/batches`) and queue outage error simulation.
- `local-environment`: Modified to reconcile dev port configuration, clean up phantom aliases, and purge stale monorepo path assumptions.

## Impact

- **Backend**: `backend/src/app.ts`, `backend/src/shared/`, `backend/package.json`, `backend/vitest.config.ts`, and new test suites under `backend/src/`.
- **Frontend**: `frontend/src/` comments and documentation alignment.
- **Documentation & Docker**: `README.md`, `.env.example`, `docker-compose.yml`.
- **Breaking Changes**: None. All existing API contracts under `/api/v1` and frontend features remain backward compatible.

