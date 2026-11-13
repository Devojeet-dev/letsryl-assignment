# Proposal: Fix Batch Processing Flow and Premature Completion Race

## Why

When uploading a batch of CSV files (such as 20 files), the processing flow prematurely marks the batch as completed after only 1 or 2 files finish processing, immediately enqueues the Excel report with incomplete data, and causes the frontend dashboard to permanently stop polling. Furthermore, files appear in arbitrary, unstable order in the operator dashboard because files are ingested without natural alphanumeric sorting and queried using non-unique millisecond timestamps.

Resolving these issues ensures that batches reliably process all uploaded files, report generation triggers only after every file reaches a terminal state, and files are tracked and displayed in stable, deterministic order.

## What Changes

* **Two-Phase Batch Ingestion**:
  * Decouple GridFS storage and database record creation from BullMQ queue enqueuing.
  * In Phase 1, persist all uploaded CSV buffers to GridFS and create all corresponding `BatchFile` and `BatchJob` records in MongoDB.
  * In Phase 2, enqueue all file processing jobs into BullMQ only after the entire batch record set has been committed to MongoDB.
* **Accurate Batch Completion Guard**:
  * Update `refreshBatchState` and `finalizeBatchIfComplete` so that a batch is deemed terminal only when the total terminal jobs equals `batch.fileCount` (`jobs.length === batch.fileCount && jobs.every(isTerminal)`), eliminating the race where 1 or 2 finished jobs falsely complete the whole batch.
  * Ensure batch counts (`totalFiles`, `queued`, `processing`, `completed`, `failed`) accurately reflect the batch definition rather than transient partial job queries.
* **Deterministic File Sequence & Natural Sorting**:
  * Sort uploaded files naturally by filename (e.g. `transactions_01.csv` ... `transactions_20.csv`) in `UploadPage` and in `createBatch`.
  * Add a zero-based `sequenceNumber` to both `BatchFileModel` and `BatchJobModel` with an index on `{ batchId: 1, sequenceNumber: 1 }`.
  * Update queries in `getBatchDetail`, `getDashboard`, and report generation to sort deterministically by `sequenceNumber: 1` rather than unstable `createdAt: 1` ties.
* **Resilient Dashboard Polling**:
  * Ensure the frontend `useDashboard` query continues polling while any file job is in an active state (`QUEUED`, `PROCESSING`, `RETRYING`) or until the batch reaches a verified terminal state.
* **Conditional Excel Report Generation**:
  * Restrict report generation triggering so it only fires when all files in the batch have reached a terminal state (`COMPLETED` or `FAILED`).

## Capabilities

### New Capabilities
- `batch-processing`: Multi-file batch CSV ingestion, sequence assignment, asynchronous queueing, terminal batch aggregation, and report generation triggering.

### Modified Capabilities
*(None - existing spec inventory is empty).*

## Impact

* **Backend Models**: `BatchFileModel` and `BatchJobModel` gain a `sequenceNumber` integer field and index.
* **Backend Services**: `batch.service.ts`, `batch-status.service.ts`, `processing.service.ts`, and `dashboard.service.ts`.
* **Frontend**: `UploadPage.tsx` sorts files naturally prior to dispatch; `use-dashboard.ts` polling condition aligns with full-batch terminal state.
* **API / Database**: Non-breaking additions to job/file response schemas; backward-compatible MongoDB indexes.

