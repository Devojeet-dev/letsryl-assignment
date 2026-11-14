# Design

## Context

The system is ready for evaluation, with all core financial analytics, BullMQ queue ingestion, and React dashboard UI working. See `proposal.md` for motivation. This design details the technical choices for removing dead code, establishing dual-mounted endpoints for grading harness compatibility, introducing the required missing automated tests, implementing structured JSDoc hover documentation, and reconciling configuration.

## Goals / Non-Goals

**Goals:**
- Eliminate all unused types, unused utilities, and duplicate logic to streamline the codebase.
- Ensure the API responds identically at `/batches` and `/api/v1/batches`.
- Expand automated test coverage to include authentication and queue outage / backpressure tests as mandated by the take-home specification.
- Equip all public-facing services, controllers, and middleware with informative JSDoc/TSDoc blocks so developer tooltips render parameter descriptions, return types, and failure modes.
- Reconcile documentation (live links, port numbers, setup instructions) to eliminate evaluation ambiguity.

**Non-Goals:**
- Altering core data models (`Batch`, `BatchJob`, `TransactionRow`, `FileAnalysis`).
- Modifying mathematical algorithms (IQR fences, NumPy-style quantiles, standard deviation formulas).
- Refactoring the frontend UI layout or deleting active UI panels.

## Decisions

### Decision 1: Dual Root and Versioned Route Mounting
- **Choice**: In `backend/src/app.ts`, mount `apiV1Routes()` at both `/api/v1` and root `/`.
- **Rationale**: The assignment PDF lists endpoints as `POST /batches`, `GET /batches/:id`, `GET /batches/:id/report`, `GET /health`, `GET /ready`. Mounting the router at `/` as well as `/api/v1` ensures that automated evaluation scripts hitting `/batches` succeed, while maintaining full backward compatibility for the frontend client that uses `/api/v1`.
- **Alternatives Considered**: HTTP 307/308 redirects from `/batches` to `/api/v1/batches`. Rejected because `POST` multipart uploads over HTTP redirects can drop body buffers depending on the client library. Direct routing avoids extra network hops.

### Decision 2: Shared Module Dead-Code Pruning
- **Choice**:
  1. Remove `backend/src/shared/types/branded.ts`, `backend/src/shared/types/result.ts`, and `backend/src/shared/types/index.ts`.
  2. In `backend/src/shared/utils/guards.ts`, retain only `asTrimmedString` and remove unused `isRecord`, `asFiniteNumber`, and `isNonEmptyArray`.
  3. In `backend/src/shared/utils/money.ts`, remove unused `sumMoney`.
  4. In `backend/src/shared/utils/id.ts`, remove unused `newIdempotencyKey`.
  5. In `backend/src/shared/schemas/pagination.schema.ts`, remove unused `paginatedSchema` and `apiErrorSchema`.
  6. In `backend/src/modules/reports/excel/workbook.builder.ts`, import `formatBytes` from `../../../shared` and remove the duplicate local declaration.
- **Rationale**: Eliminates dead code that clutters autocomplete and adds cognitive load, without changing any runtime behavior.

### Decision 3: Automated Test Implementation for Auth & Queue Outage
- **Choice**:
  1. Create `backend/src/modules/auth/__tests__/auth.service.spec.ts` using Vitest to verify:
     - Demo session generation when enabled, and 403 Forbidden when disabled.
     - Token signature verification and invalid issuer rejection.
     - Expired token rejection.
  2. Create `backend/src/modules/jobs/__tests__/queue-outage.spec.ts` using Vitest to verify:
     - Fast rejection with HTTP 503 `QUEUE_UNAVAILABLE` when BullMQ queue depth exceeds `QUEUE_MAX_DEPTH`.
     - Health service readiness reporting failure (`503`) when Redis client connection drops.
- **Rationale**: The assignment PDF explicitly lists `authentication` and `queue outage` under the required automated tests criteria. Adding these test suites fulfills the evaluation rubric.

### Decision 4: JSDoc/TSDoc Documentation Standard
- **Choice**: Equip all exported functions, methods, and classes in public controllers, services, middleware, and API endpoints with JSDoc blocks (`/** ... */`) containing descriptions, `@param`, `@returns`, and `@throws`.
- **Rationale**: VS Code and IDEs automatically parse JSDoc to generate hover previews. This immediately signals code maturity and provides instant clarity to code reviewers.

### Decision 5: Configuration & Port Reconciliation
- **Choice**:
  1. In `frontend/vite.config.ts`, align dev server port or document `3000` and `5173` across `README.md` and `.env.example`.
  2. In `backend/vitest.config.ts`, remove the dead `@bfdp/shared` alias pointing to `../../packages/shared/src/index.ts`.
  3. In `.env.example`, `backend/.env.example`, and `backend/src/config/index.ts`, remove stale `apps/backend` comment remnants.
  4. In `backend/package.json`, shift `@types/*` and `typescript` from `dependencies` to `devDependencies`.
  5. In `README.md`, add a prominent top section: `## Deliverables & Live Links` with placeholders for the live Render Frontend, API, and Git repository.

## Risks / Trade-offs

- **[Risk]** Removing unused types breaks unexpected external imports.
  - *Mitigation*: Run `npm run typecheck` across both backend and frontend after pruning to guarantee 0 compiler errors.
- **[Risk]** Dual route mounting creates path conflicts.
  - *Mitigation*: Mount `/api/v1` first, followed by `/`. Since `healthRoutes()` is already mounted at `/`, mounting `apiV1Routes()` at `/` exposes `/batches` without intercepting existing routes.
- **[Risk]** Test mocks interfere with existing test suites.
  - *Mitigation*: Use isolated Vitest mocks per test file and run `npm test` across all suites to ensure total test pass rate.

## Migration Plan

1. Prune dead code and update `backend/package.json`.
2. Add routing alias in `backend/src/app.ts`.
3. Implement `auth.service.spec.ts` and `queue-outage.spec.ts`.
4. Apply JSDoc comments to core controllers, services, and middleware.
5. Update `README.md`, `vitest.config.ts`, and `.env.example`.
6. Run `npm test` and `npm run typecheck` across backend and frontend to verify complete integrity.

