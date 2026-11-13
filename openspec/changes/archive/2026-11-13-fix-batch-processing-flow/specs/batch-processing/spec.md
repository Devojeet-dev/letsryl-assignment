# Spec Delta

## Purpose

Provides asynchronous ingestion, deterministic sequence tracking, terminal state aggregation, and conditional report generation for multi-file financial CSV batches.

## ADDED Requirements

### Requirement: Atomic Two-Phase Batch Ingestion
The system SHALL ingest multi-file batches using a two-phase process where all files and job records are persisted to storage before any file job is enqueued into the worker queue.

#### Scenario: Full persistence prior to queue dispatch
- **WHEN** an authenticated user uploads a batch containing 1 to 20 CSV files
- **THEN** the system stores all files in GridFS and commits all file and job records to MongoDB before enqueuing any file job into BullMQ

### Requirement: Batch Terminal State Aggregation
The system SHALL transition a batch to a terminal state only when the number of terminal jobs equals the total file count of the batch.

#### Scenario: Incomplete batch remains in processing state
- **WHEN** one or more file jobs in a multi-file batch finish while other file jobs are queued or actively processing
- **THEN** the overall batch status SHALL remain PROCESSING, the total file count SHALL remain equal to the batch upload count, and report generation SHALL NOT be enqueued

#### Scenario: Full batch reaches terminal state
- **WHEN** every file job in the batch has reached a terminal state (COMPLETED or FAILED)
- **THEN** the overall batch status SHALL transition to COMPLETED, with partialFailure flagged true if any file failed

### Requirement: Deterministic File Sequence and Natural Ordering
The system SHALL sort uploaded files using natural alphanumeric filename ordering and maintain a deterministic sequence number across storage, queries, and UI displays.

#### Scenario: Unsorted upload order normalized
- **WHEN** client uploads files in arbitrary order (e.g. transactions_10.csv before transactions_02.csv)
- **THEN** the system sorts them naturally and assigns zero-based sequential numbers matching natural filename order

#### Scenario: Deterministic query presentation
- **WHEN** a client fetches batch details or dashboard analytics
- **THEN** file jobs are returned sorted strictly by sequence number regardless of creation timestamp ties or parallel processing completion order

### Requirement: Conditional Report Generation Triggering
The system SHALL enqueue report generation for a batch only once all files in that batch have reached a terminal state.

#### Scenario: Premature report generation blocked
- **WHEN** an individual file job completes while other file jobs in the batch are non-terminal
- **THEN** report generation is not requested and the batch report status remains NOT_REQUESTED

#### Scenario: Final job completion triggers report
- **WHEN** the last remaining non-terminal file job in the batch reaches a terminal state
- **THEN** report status updates to QUEUED and exactly one report generation job is enqueued

