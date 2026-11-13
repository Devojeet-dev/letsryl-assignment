# Tasks

## 1. Standalone Backend Migration

- [x] 1.1 Copy shared domain modules (`packages/shared/src/`) into `apps/backend/src/shared/` with complete re-exports; verify file existence
- [x] 1.2 Update all backend imports from `@bfdp/shared` to local `./shared` module paths; verify no `@bfdp/shared` references remain in backend src
- [x] 1.3 Update `apps/backend/package.json` to remove `@bfdp/shared` dependency and inline standalone compiler settings into `apps/backend/tsconfig.json`; verify configuration
- [x] 1.4 Move `apps/backend` to root `backend/` and verify standalone `npm run typecheck` passes with 0 errors

## 2. Standalone Frontend Migration

- [x] 2.1 Instate client API contracts and upload limits in `apps/frontend/src/types/api.ts` and `apps/frontend/src/lib/limits.ts`; verify file existence
- [x] 2.2 Update all frontend imports from `@bfdp/shared` to local types and limits; verify no `@bfdp/shared` references remain in frontend src
- [x] 2.3 Update `apps/frontend/package.json` to remove `@bfdp/shared` dependency and remove `@bfdp/shared` path alias in `apps/frontend/tsconfig.json`; verify configuration
- [x] 2.4 Move `apps/frontend` to root `frontend/` and verify standalone `npm run build` succeeds cleanly

## 3. Orchestration & Repository Cleanup

- [x] 3.1 Create self-contained `backend/Dockerfile` and `frontend/Dockerfile` that build using only their local directory context; verify build files exist
- [x] 3.2 Update `docker-compose.yml` service definitions to use `./backend` and `./frontend` build contexts; verify compose config syntax
- [x] 3.3 Remove `packages/shared`, obsolete workspace files, and empty monorepo artifacts while keeping `SumitAssignment/` and `samples/` intact; verify clean directory layout
- [x] 3.4 Run end-to-end verification: execute `npm run typecheck` and `npm run test` in `backend/` (all 8 suites passing) and `npm run build` in `frontend/`; verify 0 errors

