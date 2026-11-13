# Limits, retries and backpressure

All guardrails are defined in `backend/src/shared` (`UPLOAD_LIMITS`, `RETRY_POLICY`,
`ANALYSIS_CONSTANTS`) and mirrored in `frontend/src/lib/limits.ts`. The server is authoritative.

## Upload limits

| Limit | Value | Enforcement |
| --- | --- | --- |
| Files per batch | 20 | Multer `limits.files` / `.array('files', 20)` → `TOO_MANY_FILES`; re-checked in `assertUploadConstraints` |
| Zero files | rejected | `assertUploadConstraints` → `EMPTY_BATCH` |
| Bytes per file | 10 MB | Multer `limits.fileSize` → `FILE_TOO_LARGE`; re-checked in `assertUploadConstraints` |
| Bytes per batch | 100 MB | Buffered sizes summed before persisting → `BATCH_TOO_LARGE` |
| Extension | `.csv` (case-insensitive) | `assertUploadConstraints` → `UNSUPPORTED_FILE_TYPE` |
| MIME type | csv/text/plain/octet-stream | `assertUploadConstraints` → `UNSUPPORTED_FILE_TYPE` (advisory, see below) |
| Rows per file | 50,000 | Parser; `FILE_UNREADABLE` with `maxRows`/`rows` |
| Multipart parts | 30 (`20 files + 10 fields`) | Multer `limits`; `VALIDATION_ERROR` |
| Content-Length (all requests) | 100 MB batch cap + 1 MB multipart overhead | Early `413 BATCH_TOO_LARGE` before buffering |

The reference dataset (1,000 rows × 20 files) is far below these ceilings. Limits are checked before
the batch document is created, so a rejected upload leaves no partial batch behind.

### Where the check runs

1. `Content-Length` guard (all routes) rejects an oversized body before a byte is buffered.
2. Multer enforces the per-file byte cap, the file count and the part count while streaming.
3. `assertUploadConstraints` runs the shared `validateUploadLimits` over the buffered files and throws
the first violation as a domain error, so the client receives a stable code (`EMPTY_BATCH`,
`TOO_MANY_FILES`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, `BATCH_TOO_LARGE`) rather than a multer
message. The same function powers the SPA pre-check, so browser and server agree.
4. Queue depth, then persistence, then enqueue.

The extension is authoritative. The declared media type is compared against `ALLOWED_MIME_TYPES` only
when present, because browsers routinely send `application/octet-stream` or an empty type for CSVs;
content is validated per file in the worker regardless.

### Why these numbers

- 20 × 10 MB = 200 MB, but the aggregate is capped at 100 MB so memory during multipart parsing is
  bounded well below a small container's limit.
- 50,000 rows keeps a single-file analysis well inside Mongo's 16 MB document limit after
  summarization (rows are separate documents and are bulk-inserted in chunks).
- The row ceiling is ~50× the reference file size, leaving headroom without turning the API into a
  general-purpose data warehouse.

## Queue backpressure

Before persisting an upload, the API reads BullMQ queue depth. At or above `QUEUE_MAX_DEPTH`
(default 5,000 waiting + active + delayed jobs) it responds `503 QUEUE_UNAVAILABLE` and the client
retries later. This protects Redis memory and keeps processing latency predictable instead of
accepting work the workers cannot drain.

`GET /ready` exposes queue depth plus the number of live workers (`workersOnline`), so orchestration
can alert before the hard limit is hit.

## Retry policy

| Setting | Value | Rationale |
| --- | --- | --- |
| File job attempts | 3 | Initial try + 2 retries; enough for transient Mongo/Redis/GridFS hiccups |
| Backoff | exponential, 2 s base | 2 s, 4 s between attempts — no thundering herd |
| File job lock | 5 min | A worker that dies stops renewing; the job is then detected as stalled and retried |
| Stalled check interval | 30 s | BullMQ scans for expired locks on this cadence |
| Report attempts | 2 | Workbook generation is deterministic; a second failure needs a human |
| Job retention | 24 h (max 5,000 / 1,000 completed) | Bounds Redis memory while keeping recent history |
| Idempotency TTL | 24 h | Matches typical client retry windows |

### Terminal vs transient failures

| Failure class | Examples | Behaviour |
| --- | --- | --- |
| Terminal data error | `FILE_UNREADABLE`, `UNSUPPORTED_ENCODING`, `MISSING_REQUIRED_COLUMN`, `NO_VALID_RECORDS` | Fail immediately — retrying identical bytes cannot succeed |
| Transient infrastructure | GridFS read error, Mongo write timeout, unexpected exception | Mark `RETRYING`, rethrow, let BullMQ back off; fail with `INTERNAL_ERROR` after 3 attempts |

Every transition is recorded on the job (`attempts`, `startedAt`, `finishedAt`, `errorCode`), and the
UI shows retry history per file.

## Timeouts and shutdown

| Operation | Timeout |
| --- | --- |
| Health dependency check | 2.5 s each (probe stays responsive) |
| Graceful shutdown | 15 s forced exit after drain begins |
| nginx client body / upstream read | 110 MB / 300 s (Excel streaming) |

On `SIGTERM` the API stops accepting connections, then closes queues/Redis/GridFS/Mongo; workers
finish the active job, close the BullMQ worker and exit. Anything still queued is picked up by a
replacement worker.

## Rate limiting

`RATE_LIMIT_MAX_REQUESTS` per `RATE_LIMIT_WINDOW_SECONDS`, keyed by authenticated user (or IP for
anonymous routes), stored in Redis. Uploads and auth exchange are limited; read endpoints are not
currently throttled. The limiter fails open if Redis is unreachable and the outage is reported by
`/ready`.
