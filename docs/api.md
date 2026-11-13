# API reference

Base URL: `/api/v1` (mounted behind nginx at the same origin as the SPA).

All authenticated routes expect `Authorization: Bearer <token>`. Tokens are either a Supabase access
token, a Google ID token, or an app JWT issued by `POST /auth/session`.

## Error contract

Every failure — validation, auth, upstream, unexpected — is normalized:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body is invalid.",
    "requestId": "0f1c2d3e-…",
    "details": { "issues": [{ "path": ["files"], "message": "…" }] }
  }
}
```

`requestId` always matches the `x-request-id` response header and the structured log entry. Stack
traces and internal identifiers are never exposed.

| Status | Codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `IDEMPOTENCY_KEY_REQUIRED`, `EMPTY_BATCH`, `TOO_MANY_FILES` |
| 401 | `UNAUTHORIZED`, `TOKEN_INVALID`, `TOKEN_EXPIRED` |
| 403 | `FORBIDDEN` (demo login disabled) |
| 404 | `NOT_FOUND`, `BATCH_NOT_FOUND`, `JOB_NOT_FOUND` |
| 409 | `REPORT_NOT_READY`, `IDEMPOTENCY_CONFLICT` |
| 413 | `FILE_TOO_LARGE`, `BATCH_TOO_LARGE` |
| 415 | `UNSUPPORTED_FILE_TYPE` |
| 422 | `MISSING_REQUIRED_COLUMN`, `FILE_UNREADABLE`, `UNSUPPORTED_ENCODING`, `NO_VALID_RECORDS`, `REPORT_GENERATION_FAILED` |
| 429 | `RATE_LIMITED` (includes `retry-after`) |
| 503 | `SERVICE_UNAVAILABLE`, `DEPENDENCY_UNAVAILABLE`, `QUEUE_UNAVAILABLE` |
| 500 | `INTERNAL_ERROR` |

Per-file terminal failures are reported on the job/document, not as request errors:
`FILE_UNREADABLE`, `UNSUPPORTED_ENCODING`, `MISSING_REQUIRED_COLUMN`, `NO_VALID_RECORDS`,
`INTERNAL_ERROR` (retries exhausted).

---

## Auth

### `POST /auth/session`

Exchange a federated token for an API session. Supabase tokens are validated and returned as-is;
Google ID tokens are verified and swapped for a short-lived HS256 app JWT.

```json
{ "idToken": "eyJhbGciOi…" }
```

```json
{
  "accessToken": "eyJhbGciOi…",
  "expiresAt": "2026-11-12T20:00:00.000Z",
  "user": {
    "id": "8f14e45f…",
    "email": "reviewer@example.com",
    "name": "Reviewer",
    "avatarUrl": null,
    "provider": "google"
  }
}
```

### `POST /auth/demo-session`

No body. Returns the same session shape for a fixed local identity. `403 FORBIDDEN` unless
`DEMO_AUTH_ENABLED=true`; `503` when `APP_JWT_SECRET` is missing.

### `GET /auth/me`

Returns the `user` object for the current token.

---

## Batches

### `POST /batches`

`multipart/form-data` with one or more `files` parts. Optional `Idempotency-Key` header (8–128 chars
of `A-Z a-z 0-9 . _ : -`). Limits: 1–20 files, 10 MB/file, 100 MB/batch, `.csv` only.

```bash
curl -X POST http://localhost:4000/api/v1/batches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: 7b9c1f2e-demo" \
  -F "files=@transactions_01.csv" \
  -F "files=@transactions_02.csv"
```

`202 Accepted` with a `BatchDetail`:

```json
{
  "id": "6712ab34cd56ef7890123456",
  "status": "QUEUED",
  "partialFailure": false,
  "fileCount": 2,
  "totalBytes": 214381,
  "counts": {
    "totalFiles": 2, "queued": 2, "processing": 0, "retrying": 0,
    "completed": 0, "failed": 0, "retried": 0
  },
  "progressPercent": 0,
  "reportStatus": "NOT_REQUESTED",
  "createdAt": "2026-11-12T18:00:00.000Z",
  "updatedAt": "2026-11-12T18:00:00.000Z",
  "files": [
    {
      "id": "6712ab34cd56ef7890123457",
      "originalName": "transactions_01.csv",
      "sizeBytes": 107190,
      "rowCount": null,
      "validRowCount": null,
      "rejectedRowCount": null,
      "errorCode": null,
      "errorMessage": null,
      "checksum": "9f2c…"
    }
  ],
  "jobs": [
    {
      "id": "6712ab34cd56ef7890123458",
      "fileId": "6712ab34cd56ef7890123457",
      "fileName": "transactions_01.csv",
      "status": "QUEUED",
      "attempts": 0,
      "maxAttempts": 3,
      "errorCode": null,
      "errorMessage": null,
      "startedAt": null,
      "finishedAt": null
    }
  ]
}
```

Replay behaviour: same owner + key + identical bytes returns the original batch with
`idempotent-replayed: true`. Same key, different bytes → `409 IDEMPOTENCY_CONFLICT`.

### `GET /batches`

Query: `page` (≥1, default 1), `limit` (1–100, default 20), `status` (batch status).

```json
{ "items": [], "total": 0, "page": 1, "limit": 20, "hasMore": false }
```

### `GET /batches/:id`

Returns the same `BatchDetail` shape with current file/job progress. Another user's batch returns
`404` (ownership is indistinguishable from absence).

---

## Dashboard

### `GET /batches/:id/analytics`

Query filters (all optional): `fileId` (24-hex), `branchId`, `transactionType`, `from`, `to`
(`YYYY-MM-DD`, inclusive; `from <= to`).

```json
{
  "batch": { "id": "…", "status": "COMPLETED", "progressPercent": 100, "…": "…" },
  "files": [ { "id": "…", "fileName": "transactions_01.csv", "status": "COMPLETED", "…": "…" } ],
  "fields": [
    {
      "field": "amount",
      "noValidValues": false,
      "validCount": 998,
      "missingCount": 1,
      "invalidCount": 1,
      "total": 1048732.55,
      "mean": 1050.83,
      "median": 1042.31,
      "min": 1.02,
      "max": 4998.9,
      "stdDev": 577.41,
      "p25": 521.4,
      "p75": 1583.77,
      "iqr": 1062.37,
      "lowerFence": -1072.16,
      "upperFence": 4177.33,
      "outlierCount": 12,
      "outlierPercentage": 1.2,
      "histogram": [ { "lowerBound": 1.02, "upperBound": 250.91, "count": 57 } ]
    }
  ],
  "dataQuality": {
    "totalRows": 1000,
    "validRows": 998,
    "rejectedRows": 2,
    "missingRequiredFieldCounts": { "customer_id": 1 },
    "missingNumericCounts": { "amount": 1, "risk_score": 0, "…": 0 },
    "invalidNumericCounts": { "amount": 1, "…": 0 },
    "invalidNumericSamples": { "amount": [412], "…": [] },
    "invalidDateCount": 1,
    "invalidDateSamples": [777],
    "duplicateTransactionIdCount": 3,
    "duplicateGroups": [
      { "transactionId": "TXN-…", "occurrences": 3, "rowNumbers": [12, 490, 881] }
    ],
    "rejectedRowSamples": [
      { "rowNumber": 88, "reason": "MISSING_REQUIRED_FIELD:customer_id", "transactionId": "TXN-…" }
    ],
    "missingHeaders": []
  },
  "byTransactionType": [ { "key": "UPI_PAYMENT", "count": 301, "totalAmount": 312345.67 } ],
  "byBranch": [ { "key": "BLR023", "count": 64, "totalAmount": 66421.1 } ],
  "daily": [ { "date": "2026-01-02", "count": 5, "totalAmount": 6123.4 } ],
  "largestTransaction": {
    "transactionId": "TXN-…",
    "amount": 4998.9,
    "branchId": "DEL001",
    "transactionType": "CARD_PAYMENT",
    "transactionDate": "2026-03-14T09:12:00.000Z"
  },
  "highRisk": {
    "threshold": 80,
    "count": 41,
    "totalAmount": 51234.5,
    "percentageOfValidRows": 4.11,
    "topTransactions": []
  },
  "queue": { "waiting": 0, "active": 0, "completed": 40, "failed": 0, "delayed": 0, "workersOnline": 2, "healthy": true }
}
```

`null` metrics mean "no valid values" and must be rendered as `N/A`, never `0`. The SPA polls this
endpoint while the batch is `QUEUED`/`PROCESSING` and stops once terminal.

---

## Reports

### `GET /batches/:id/report`

| Situation | Response |
| --- | --- |
| Report `READY` | `200`, `content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `content-disposition: attachment; filename="batch-<id>-<timestamp>.xlsx"` |
| Batch terminal, report not generated | `409 REPORT_NOT_READY`; one caller claims generation, others observe `status=QUEUED` |
| Batch still running | `409 REPORT_NOT_READY` with `details.status` / `details.batchStatus` |
| Report `FAILED` | re-queued once, then `409` until ready |

The download stream is piped directly from GridFS; a mid-stream failure destroys the connection
rather than returning a truncated 200.

### `GET /batches/:id/report/status`

```json
{
  "status": "READY",
  "fileName": "batch-6712ab34-20261112T181500.xlsx",
  "sizeBytes": 412345,
  "generatedAt": "2026-11-12T18:15:00.000Z",
  "downloadUrl": "/api/v1/batches/6712ab34/report",
  "errorCode": null
}
```

`status ∈ NOT_REQUESTED | QUEUED | GENERATING | READY | FAILED`.

### `POST /batches/:id/report`

Enqueues generation (or retries after `FAILED`). `202` with `ReportStatusInfo`. Returns `409` while
the batch is not terminal, and never queues duplicate work (`jobId = report_<batchId>`).

---

## Health

`GET /health` — liveness plus dependency snapshot; always `200` unless the process itself fails.

`GET /ready` — `200` when Mongo, Redis, GridFS and the queue are reachable, otherwise `503`.

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptimeSeconds": 812,
  "checks": [
    { "name": "mongo", "ok": true, "latencyMs": 2 },
    { "name": "redis", "ok": true, "latencyMs": 1 },
    { "name": "gridfs", "ok": true, "latencyMs": 3 },
    { "name": "queue", "ok": true, "latencyMs": 1 }
  ]
}
```

Both probes are unauthenticated and excluded from access logs.

---

## Rate limiting

Redis-backed sliding window per identity/IP: `RATE_LIMIT_MAX_REQUESTS` per
`RATE_LIMIT_WINDOW_SECONDS` (default 60/min). Exceeding it returns `429 RATE_LIMITED` with
`retry-after`. The limiter fails open if Redis is unavailable — availability over strictness — while
`/ready` still reports the dependency as down.
