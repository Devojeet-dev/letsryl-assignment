# Proposal

## Why

The current monorepo structure with `@bfdp/shared` requires global workspace coordination, multi-stage Docker builds with root context, and linked package resolutions that complicate independent deployments on cloud platforms such as Render. Decoupling the codebase into independent `backend/` and `frontend/` directories eliminates the shared package dependency, allowing each service to be built, containerized, and deployed with standard single-directory tooling.

## What Changes

- Decouple `apps/backend` into a standalone `backend/` directory:
  - Absorb all shared domain schemas, errors, constants, types, and utility functions into `backend/src/shared/`.
  - Update internal imports across `backend/src/` from `@bfdp/shared` to local relative imports.
  - Remove `@bfdp/shared` from `backend/package.json` and standalone-align `backend/tsconfig.json`.
- Decouple `apps/frontend` into a standalone `frontend/` directory:
  - Absorb API types, status enums, and upload constraints into `frontend/src/types/api.ts` and `frontend/src/lib/limits.ts`.
  - Update internal imports across `frontend/src/` from `@bfdp/shared` to local modules.
  - Remove `@bfdp/shared` from `frontend/package.json` and standalone-align `frontend/tsconfig.json`.
- Remove `packages/shared`, monorepo root `package.json` workspace definitions, and `tsconfig.base.json` references.
- Update Docker configurations and orchestration (`docker-compose.yml`, Dockerfiles) to build directly from `backend/` and `frontend/`.
- Ensure `SumitAssignment/` and `samples/` remain preserved.

## Capabilities

### New Capabilities
- `standalone-packaging`: Defines independent packaging, dependencies, and build pipelines for backend and frontend applications without shared workspace packages.

### Modified Capabilities
<!-- None -->

## Impact

- **Builds**: `cd backend && npm run build` and `cd frontend && npm run build` operate in full isolation without needing a parent workspace install or shared build step.
- **Deployment**: Render web services, background workers, and static sites can target `backend/` or `frontend/` as standalone root directories.
- **Portability**: Enables repository splitting or independent versioning if desired.

