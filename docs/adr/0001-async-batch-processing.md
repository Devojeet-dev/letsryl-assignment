# ADR 0001 — Asynchronous, per-file batch processing

- **Status:** Accepted
- **Date:** 2026-11-12
- **Context:** Take-home assignment: 1–20 CSVs (1,000 rows each) per batch, immediate `batchId`,
  per-file statuses including `RETRYING`, partial failure allowed, dashboard while processing,
  Excel export.

## Decision

Accept the upload synchronously and process every file as an independent BullMQ job in a separate
worker process; persist normalized rows and per-file analyses; recompute dashboard aggregates from
rows at read time.

## Drivers

1. `POST /batches` must return a `batchId` immediately, independent of file size.
2. Per-file status and retry history are first-class requirements — not batch-level afterthoughts.
3. A malformed file must not affect its siblings (partial failure is explicitly allowed).
4. Dashboard panels must all react to the same filter set.
5. Reviewers must be able to run the whole system with one command.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| Parse in the request handler | Blocks the request for seconds, no retry/status model, cannot survive a restart |
| One job per batch | Violates per-file status/retry isolation; one poison file fails everything |
| Kafka / SQS | Operational weight for a take-home; Redis is enough for 20–400 jobs and keeps compose simple |
| Pre-aggregate only, no row storage | Filters would need N pre-computed cubes; totals drift between panels |
| Stream CSV row-by-row without persisting | Dashboard needs repeatable filters and report needs drill-down after the upload |
| Server-side rendered UI | The brief asks for a Grafana-style dashboard with auto-refresh; a SPA with polling is simpler |

## Consequences

**Positive**

- Upload latency is bounded by storage + enqueue, not by parsing.
- Retries are safe: `transactionrows`/`rejectedrows` are replaced per file, so a retried job cannot
  duplicate data; `jobId = fileId` makes re-enqueues idempotent.
- The batch state machine is derived from job states, so partial failures surface naturally.
- The report worker is isolated from ingestion; a heavy workbook cannot delay CSV processing.
- Same-origin nginx proxy removes CORS complexity and gives one deployable URL.

**Negative / accepted trade-offs**

- At-least-once delivery means a job can run twice; all writes are idempotent by construction.
- Read-time aggregation scales with `batch rows × concurrent dashboards`. The 20 × 50,000 row cap
  keeps this in the low hundreds of thousands of documents; beyond that, a materialized per-filter
  aggregate collection would be the next step.
- Rows and rejected samples are retained indefinitely (no purge job yet) — deliberate, for
  auditability, and documented as a known limitation.
- The demo auth path is a convenience for reviewers, not a product feature.

## Revisit when

- Batches exceed ~1M rows or dashboards become a hot path → materialize aggregates per
  `(file, branch, type, day)` and cache by filter hash.
- More than one API instance needs shared rate-limit correctness → the fixed-window limiter is
  already Redis-backed, but consider a sliding window for fairness.
- Multi-tenant access control is required → add roles/policies at the batch-ownership layer.
