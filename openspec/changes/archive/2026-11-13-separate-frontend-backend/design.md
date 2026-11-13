# Design

## Context

The repository currently houses a monorepo under `batch-financial-processor/` with npm workspaces linking `packages/shared`, `apps/backend`, and `apps/frontend`. Cloud deployment platforms (like Render, Vercel, or Netlify) work best when given a single service root with its own `package.json` and build scripts, without needing parent directory context or workspace coordination.

See `proposal.md` for motivation and `specs/standalone-packaging/spec.md` for functional requirements.

## Goals / Non-Goals

**Goals:**
- Promote `apps/backend` to a top-level standalone `backend/` service.
- Promote `apps/frontend` to a top-level standalone `frontend/` service.
- Absorb shared domain logic, Zod schemas, errors, and constants into `backend/src/shared/`.
- Absorb required UI DTOs, interfaces, and validation limits into `frontend/src/types/api.ts` and `frontend/src/lib/limits.ts`.
- Eliminate `packages/shared`, root `package.json` workspaces, and root `tsconfig.base.json` coupling.
- Provide simple single-context Dockerfiles in `backend/` and `frontend/`.
- Verify independent builds and test passes in both folders.

**Non-Goals:**
- No alteration or removal of `SumitAssignment/`.
- No modification of REST API routes, schemas, or wire contract semantics.
- No changes to frontend UI design, Tailwind themes, or state management.

## Decisions

### Decision: Inlining and Absorbing Shared Modules Separately
- **Rationale**: Backend requires all domain schemas, models, and worker payloads. Frontend only requires a small set of TypeScript interfaces (`BatchDetail`, `DashboardResponse`, `JobView`, etc.) and basic upload limits (`UPLOAD_LIMITS`, `ALLOWED_CSV_MIME_TYPES`). Copying the full shared suite into `backend/src/shared/` and extracting only the client contracts into `frontend/src/types/api.ts` keeps the frontend bundle small and eliminates the shared package link entirely.
- **Alternatives considered**: Publishing `@bfdp/shared` to npm (rejected: adds operational overhead and private registry requirement); Git submodules (rejected: complicated developer workflow).

### Decision: Standalone Root Directories (`backend/` and `frontend/`)
- **Rationale**: Moving from `batch-financial-processor/apps/backend` to `backend/` and `batch-financial-processor/apps/frontend` to `frontend/` matches standard multi-repo or multi-service conventions. In Render, setting the Root Directory to `backend` or `frontend` works out of the box without subfolder nestings.
- **Alternatives considered**: Keeping `apps/` folders inside `batch-financial-processor/` (rejected: retains unnecessary nesting and confusion).

### Decision: Standalone tsconfig and package.json Configuration
- **Rationale**: Removing `"extends": "../../tsconfig.base.json"` and inlining the standard compiler options directly into each project's `tsconfig.json` makes each project completely self-contained. Each project's `package.json` manages its own dependencies without workspace links.

## Risks / Trade-offs

- [Risk: Contract drift between API and UI] → Mitigation: The absorbed contracts directly reflect the current verified types; both projects are TypeScript-strict.
- [Risk: Import path regressions during migration] → Mitigation: Full compilation validation (`npm run typecheck` and `npm run test` in backend, `npm run build` in frontend).

