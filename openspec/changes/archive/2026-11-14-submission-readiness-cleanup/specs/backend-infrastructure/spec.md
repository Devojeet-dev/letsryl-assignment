# Spec Delta: backend-infrastructure

## ADDED Requirements

### Requirement: Dual Root and Versioned Endpoint Mounting
The Express application SHALL mount batch routes at both `/batches` and `/api/v1/batches` so evaluators and clients can query either endpoint path identically without routing errors.

#### Scenario: Client queries unversioned batches endpoint
- **WHEN** a client sends a request to `/batches` (or `/batches/:id`, `/batches/:id/report`)
- **THEN** the request SHALL be processed identically to `/api/v1/batches` without returning a 404 route error

### Requirement: Queue Outage Backpressure Handling
The API SHALL reject upload requests with a 503 HTTP status code when the processing queue depth exceeds the configured safety threshold or Redis is unavailable.

#### Scenario: Upload attempted while queue depth exceeds maximum
- **WHEN** a batch upload is submitted and the queue depth equals or exceeds `QUEUE_MAX_DEPTH`
- **THEN** the API SHALL reject the request with HTTP 503 and error code `QUEUE_UNAVAILABLE`

#### Scenario: Readiness probe reports queue outage
- **WHEN** `GET /ready` is called while Redis is unreachable or queue capacity is saturated
- **THEN** the response status SHALL be HTTP 503 with dependency status marked as degraded

