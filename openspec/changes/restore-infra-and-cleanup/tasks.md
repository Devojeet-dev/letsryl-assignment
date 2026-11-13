# Tasks

## 1. Reconstruct Infrastructure Layer

- [x] 1.1 Reconstruct `batch-financial-processor/apps/backend/src/infrastructure/mongo/connection.ts` with connection event handling and readiness checks; verify via TypeScript compilation
- [x] 1.2 Reconstruct `batch-financial-processor/apps/backend/src/infrastructure/redis/connection.ts` with BullMQ worker connection options and shared client singleton; verify via TypeScript compilation
- [x] 1.3 Reconstruct `batch-financial-processor/apps/backend/src/infrastructure/gridfs/gridfs.service.ts` with GridFS upload and report buckets, checksum hashing, and stream readers; verify via TypeScript compilation

## 2. Directory Hygiene & Resource Retention

- [x] 2.1 Remove empty placeholder directories in backend (`observability/models`, `workers/lifecycle`, `workers/errors`, `modules/reports/excel/sheets`, `modules/reports/__tests__`, `modules/jobs/options`, `modules/jobs/events`, `modules/jobs/__tests__`, `modules/jobs/consumers`, `modules/jobs/payloads`, `bootstrap`) and verify directory removal
- [x] 2.2 Remove empty placeholder directories in frontend (`src/hooks`, `src/stores`, `features/dashboard/{layout,states,lib}`, `features/reports/hooks`, `features/jobs/hooks`, `features/upload/{hooks,workers,components,lib}`, `features/auth/{hooks,components}`, `features/batches/components`, `public/brand`, `dist/brand`, `e2e`) and verify directory removal
- [x] 2.3 Remove empty placeholder directories in `docker/redis`, `docker/mongo`, `docs/diagrams`, and `packages/shared/src/__tests__` and verify directory removal
- [x] 2.4 Verify `SumitAssignment/` (assignment brief PDF and test CSVs) and `batch-financial-processor/samples/` remain completely intact and unmodified

## 3. Verification & Build Validation

- [x] 3.1 Run backend typecheck (`npm --prefix batch-financial-processor/apps/backend run typecheck`) and verify 0 TypeScript errors
- [x] 3.2 Run backend unit test suites (`npm --prefix batch-financial-processor/apps/backend run test`) and verify all 8 test suites (including `batch.service.spec.ts`) pass cleanly
- [x] 3.3 Run backend build (`npm --prefix batch-financial-processor/apps/backend run build`) to verify clean production compile

