# Proposal

## Why

The backend service infrastructure layer files (`mongo/connection.ts`, `redis/connection.ts`, and `gridfs/gridfs.service.ts`) were unintentionally deleted, preventing backend compilation and failing unit tests that rely on storage and datastore services. Additionally, numerous empty placeholder directories across the repository add clutter. Restoring the infrastructure layer from existing build artifacts and cleaning obsolete directories restores backend build health and maintains repository hygiene while explicitly preserving user assignment resources.

## What Changes

- Reconstruct `batch-financial-processor/apps/backend/src/infrastructure/mongo/connection.ts` with strict query settings, connection event logging, reconnect handling, readiness checking, and lifecycle methods.
- Reconstruct `batch-financial-processor/apps/backend/src/infrastructure/redis/connection.ts` with dedicated worker connection creation (`maxRetriesPerRequest: null`), shared connection singleton, reconnect logging, readiness checking, and disconnect methods.
- Reconstruct `batch-financial-processor/apps/backend/src/infrastructure/gridfs/gridfs.service.ts` with dedicated upload and report GridFS buckets, SHA-256 integrity checksum generation on upload/report storage, streaming retrieval, deletion, and client lifecycle management.
- Remove empty/unused directory trees across backend, frontend, docker stubs, and docs that contain no files or active code.
- Explicitly retain `SumitAssignment/` (assignment brief PDF and test datasets) and `batch-financial-processor/samples/` (smoke test datasets).
- Validate backend build health with `npm run typecheck` and `npm run test`.

## Capabilities

### New Capabilities
- `backend-infrastructure`: Manages database connections (MongoDB, Redis) and object storage (GridFS) for data ingestion and report generation.

### Modified Capabilities
<!-- None -->

## Impact

- Restores `@bfdp/backend` compilation and eliminates all 15 TypeScript missing-module errors.
- Unblocks failing unit test suites (`batch.service.spec.ts`) that import GridFS service.
- Cleans 30 empty placeholder directories without touching any active application files or the preserved `SumitAssignment/` folder.

