# Tasks

## 1. Data Model & Sequence Number Support

- [x] 1.1 Add `sequenceNumber` to `BatchFileModel` and `BatchJobModel` schemas with compound index `{ batchId: 1, sequenceNumber: 1 }`, and verify typecheck passes.
- [x] 1.2 Update `@bfdp/shared` file and job view interfaces and mappers (`toFileView`, `toJobView`) to expose `sequenceNumber`, and verify shared package builds cleanly.

## 2. Two-Phase Ingestion & In-Memory Sorting

- [x] 2.1 Implement natural filename sorting (`localeCompare` with `{ numeric: true }`) in `createBatch` in `batch.service.ts`, and verify with a unit test.
- [x] 2.2 Refactor `createBatch` into two distinct phases: Phase 1 stores all files in GridFS and commits all `BatchFile` and `BatchJob` records with sequential `sequenceNumber`; Phase 2 enqueues all BullMQ jobs. Verify batch creation flow with unit tests.

## 3. Batch Completion Guard & Report Enqueueing

- [x] 3.1 Update `refreshBatchState` in `batch-status.service.ts` to evaluate `allTerminal` strictly when `jobs.length === batch.fileCount` and all jobs are terminal, preserving `counts.totalFiles = batch.fileCount`.
- [x] 3.2 Add unit test in `@bfdp/backend` verifying that when only a subset of jobs in a batch are complete, `refreshBatchState` returns `status: 'PROCESSING'` and `allTerminal: false`.
- [x] 3.3 Verify in `processing.service.ts` that `finalizeBatchIfComplete` enqueues report generation only when `snapshot.allTerminal` is true and `reportStatus` is `NOT_REQUESTED` or `FAILED`.

## 4. Deterministic Query Ordering

- [x] 4.1 Update `getBatchDetail` in `batch.service.ts` to sort `BatchFileModel` and `BatchJobModel` queries by `{ sequenceNumber: 1, _id: 1 }`.
- [x] 4.2 Update `getDashboard` in `dashboard.service.ts` and `generateReportForBatch` in `report.service.ts` to query files and jobs sorted by `{ sequenceNumber: 1, _id: 1 }`.

## 5. Frontend Natural Sorting & Resilient Polling

- [x] 5.1 Update `UploadPage.tsx` to sort incoming `files` in natural alphanumeric order when added via file picker or drag-and-drop.
- [x] 5.2 Update `use-dashboard.ts` `refetchInterval` condition to continue polling until the batch is terminal and all `batch.fileCount` jobs are confirmed terminal.

## 6. Integration Verification

- [x] 6.1 Run backend tests (`npm run test -w @bfdp/backend`) and verify all tests pass.
- [x] 6.2 Run workspace typecheck (`npm run typecheck`) and build (`npm run build`) to confirm full stack compatibility.

