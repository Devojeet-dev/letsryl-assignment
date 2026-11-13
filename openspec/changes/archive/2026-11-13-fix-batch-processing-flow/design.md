# Design: Robust Batch Ingestion, Sequence Tracking, and Completion Aggregation

## Context

See `proposal.md` for background and motivation.

Currently, `createBatch` in `batch.service.ts` uploads each file to GridFS, creates a `BatchFile` and `BatchJob`, and immediately enqueues the job to BullMQ within a single sequential loop. Because BullMQ workers execute jobs concurrently and complete in ~30ms, the first finished job triggers `finalizeBatchIfComplete` -> `refreshBatchState` while subsequent files are still being uploaded. Because `refreshBatchState` checks `jobs.every(isTerminal)` over the current (incomplete) query result from `BatchJobModel`, it erroneously flags the whole batch as `COMPLETED`, overrides `totalFiles`, and enqueues Excel report generation with only 1 or 2 files.

Furthermore, files are not naturally sorted on upload, and database queries sort by non-unique `createdAt: 1` timestamps, causing unstable, jumbled ordering in the UI.

## Goals / Non-Goals

**Goals:**
* Ensure a batch is only marked `COMPLETED` and report generation is only enqueued once every file in `fileCount` has reached a terminal state.
* Prevent premature dashboard polling termination in the client.
* Sort files naturally by filename on upload (`transactions_01.csv` ... `transactions_20.csv`) and maintain deterministic zero-based sequence numbers across storage and queries.
* Maintain parallel worker processing capability (`QUEUE_CONCURRENCY=2`) without race conditions or display disorder.

**Non-Goals:**
* Strict sequential single-thread worker execution (user confirmed execution order does not matter as long as all files process and report generation triggers at the end).
* Changing financial analytics algorithms, IQR outlier calculations, or Excel report layout structure.

## Decisions

### 1. Two-Phase Ingestion in `createBatch`
* **Approach**:
  1. **Phase 1 (Storage & Metadata)**: Sort the incoming `files` array naturally by filename. In a loop, write each file to GridFS, create `BatchFileModel` with `sequenceNumber: index`, and create `BatchJobModel` with `sequenceNumber: index`.
  2. **Phase 2 (Queue Dispatch)**: After all files and jobs are persisted in MongoDB, iterate and call `enqueueFileJob` for each file.
* **Why**: Completely isolates database initialization from worker execution. Workers cannot observe an incomplete batch because jobs are only placed on the queue after the full batch aggregate is in place.
* **Alternatives Considered**:
  * *Chained job execution*: Unnecessarily forces sequential processing and slows throughput.
  * *Single aggregate batch job*: Violates the take-home requirement for independent per-file status, retries, and failure isolation.

### 2. Strict Batch Completion Guard in `refreshBatchState`
* **Approach**:
  * In `refreshBatchState(batchId: string)`, fetch the batch document to read `batch.fileCount`.
  * Compute `allTerminal` strictly as:
    ```ts
    const allTerminal = jobs.length === batch.fileCount && jobs.every((job) => isTerminalJobStatus(job.status as JobStatus));
    ```
  * Maintain `counts.totalFiles = batch.fileCount` so counts never downscale to partial queries.
* **Why**: Even if network lag or retry delays occur, `allTerminal` will never be true until all `fileCount` jobs exist and have completed or failed.
* **Alternatives Considered**:
  * Relying on Redis queue depth: Unreliable because delayed retry jobs are not in the active set.

### 3. Deterministic Natural Sorting & Sequence Numbers
* **Approach**:
  * Natural sort comparison: `(a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })`.
  * Applied in `UploadPage.tsx` when adding files to the upload queue.
  * Applied in `createBatch()` in `batch.service.ts` before writing records.
  * Add `sequenceNumber: { type: Number, default: 0, index: true }` to both `batchFileSchema` and `batchJobSchema`.
  * Create compound index: `{ batchId: 1, sequenceNumber: 1 }`.
  * Update queries in `getBatchDetail`, `getDashboard`, and `generateReportForBatch` to sort by `{ sequenceNumber: 1, _id: 1 }`.
* **Why**: Guarantees deterministic display and stable UI tables across polling updates without tie-breaking instability.

### 4. Client Polling State Guard
* **Approach**:
  * Update `useDashboard` refetch interval condition:
    ```ts
    const isTerminal = data.batch.status === 'COMPLETED' || data.batch.status === 'FAILED';
    const hasActiveJobs = data.files.some((job) => ACTIVE_JOB_STATUSES.has(job.status));
    const allJobsTerminal = data.files.length === data.batch.fileCount && !hasActiveJobs;
    const shouldPoll = !isTerminal || !allJobsTerminal;
    return shouldPoll ? ACTIVE_POLL_MS : false;
    ```
* **Why**: Protects the client against any edge-case transient status mismatch and ensures polling continues until the entire batch and all jobs are demonstrably terminal.

## Risks / Trade-offs

* **[Risk: Legacy documents without sequenceNumber]** → **Mitigation**: Models default `sequenceNumber` to `0`, and sort uses `{ sequenceNumber: 1, createdAt: 1, _id: 1 }` as a stable fallback.
* **[Risk: Upload latency for multi-file batches in Phase 1]** → **Mitigation**: Storing 20 CSV files (~2 MB total) takes under 1 second. Immediate `batchId` is returned immediately after Phase 2 enqueuing, satisfying latency requirements.

