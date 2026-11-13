# Design

## Context

The backend service infrastructure directory `batch-financial-processor/apps/backend/src/infrastructure/` was accidentally deleted, producing 15 compilation errors in `@bfdp/backend`. However, the compiled artifacts in `apps/backend/dist/infrastructure/` preserve the exact runtime code and TypeScript `.d.ts` declarations with JSDoc comments. In addition, an exploration identified 30 empty directories across the repo. The user confirmed keeping `SumitAssignment/`.

See `proposal.md` for motivation and `specs/backend-infrastructure/spec.md` for functional requirements.

## Goals / Non-Goals

**Goals:**
- Reconstruct `mongo/connection.ts`, `redis/connection.ts`, and `gridfs/gridfs.service.ts` in `batch-financial-processor/apps/backend/src/infrastructure/` matching the exact typing and runtime semantics.
- Safely remove empty directory trees across backend, frontend, docker stubs, and docs.
- Preserve `SumitAssignment/` at the root and `batch-financial-processor/samples/`.
- Achieve 100% clean typecheck (`tsc -b`) and green Vitest test execution for the backend.

**Non-Goals:**
- Do not touch, alter, or remove `SumitAssignment/`.
- Do not touch or remove `batch-financial-processor/samples/` (`uploads/` and `reports/`).
- Do not refactor existing database connection patterns or change API contracts.

## Decisions

### Decision: Direct Reconstruction from Compiled Dist and Type Declarations
- **Rationale**: The compiled outputs `dist/infrastructure/*/*.js` and `dist/infrastructure/*/*.d.ts` provide the exact exports, function signatures, configuration properties, timeout values, and error logging signatures originally written.
- **Alternatives considered**: Writing new implementations from scratch (rejected because consumers in `apps/backend/src/` expect exact method signatures and semantics).

### Decision: Prune Only Verified Empty Directories
- **Rationale**: 30 directories across backend, frontend, docker, and docs contain 0 files and no git tracked entries. Removing them eliminates noise and confusion.
- **Alternatives considered**: Leaving empty directories (rejected because they clutter codebase navigation).

### Decision: Explicit Guard on User Resources
- **Rationale**: The user explicitly confirmed `/opsx-propose keep SumitAssignment/`. This folder contains reference PDF and 20 source CSV datasets. It must remain intact.
- **Alternatives considered**: Deleting unreferenced root files (rejected per user directive).

## Risks / Trade-offs

- [Risk: Accidental deletion of required directory] → Mitigation: Perform deletion only on directories verified to be completely empty (`find ... -type d -empty`).
- [Risk: Missing runtime dependency or import divergence] → Mitigation: Run `npm --prefix batch-financial-processor/apps/backend run typecheck` and `npm --prefix batch-financial-processor/apps/backend run test` as acceptance criteria.

