# backend-infrastructure Specification

## Purpose
Provides managed database connections (MongoDB and Redis) and GridFS object storage lifecycle methods to support batch uploads and report artifact generation.

## Requirements

### Requirement: MongoDB Connection Management
The backend service SHALL manage a persistent MongoDB connection pool with automatic reconnection and structured state reporting.

#### Scenario: MongoDB connection establishment
- **WHEN** the backend application boots and calls `connectMongo()`
- **THEN** it connects to the configured MongoDB URI using the configured database name with pool size limits and emits a connection log

#### Scenario: MongoDB readiness inquiry
- **WHEN** the health service checks database readiness via `isMongoReady()`
- **THEN** it SHALL return true if the mongoose connection readyState is 1 (connected), and false otherwise

### Requirement: Redis Connection and Client Lifecycle
The backend service SHALL provide Redis connection factories for worker instances and a shared client singleton for general cache and queue operations.

#### Scenario: BullMQ blocking worker connection creation
- **WHEN** a worker process calls `createRedisConnection()`
- **THEN** it SHALL instantiate an ioredis client configured with `maxRetriesPerRequest: null` and reconnect backoff strategy

#### Scenario: Redis readiness ping
- **WHEN** health check invokes `isRedisReady()`
- **THEN** it SHALL issue a PING command to Redis and return true only when Redis responds with PONG

### Requirement: GridFS Object Storage for Uploads and Reports
The backend infrastructure SHALL manage segregated GridFS buckets for user uploads and generated Excel reports with SHA-256 integrity verification.

#### Scenario: Upload storage with checksum
- **WHEN** a user uploads a batch CSV and `storeUpload()` is executed
- **THEN** it SHALL stream the buffer into the uploads GridFS bucket, calculate a SHA-256 checksum, and return the generated object id and size

#### Scenario: Report retrieval stream
- **WHEN** a report is downloaded via `openGridFileStream()` with the report id
- **THEN** it SHALL return a readable download stream pointing to the stored GridFS report artifact

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
