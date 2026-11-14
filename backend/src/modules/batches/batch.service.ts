import { createHash } from 'node:crypto';
import { RETRY_POLICY, type BatchDetail, type ListBatchesQuery } from '../../shared';
import { AppError, ERROR_CODES } from '../../shared';
import { config } from '../../config';
import { storeUpload } from '../../infrastructure/gridfs/gridfs.service';
import { enqueueFileJob, getQueueDepth } from '../jobs/producers/file-processing.producer';
import { refreshBatchState } from './batch-status.service';
import { toBatchDetail, toBatchSummary } from './mappers/batch.mapper';
import { assertOwnership, findOwnedBatch } from './policies/batch-ownership.policy';
import { hashUploadRequest } from './policies/request-hash';
import { BatchFileModel } from './models/batch-file.model';
import { BatchJobModel } from './models/batch-job.model';
import { BatchModel } from './models/batch.model';
import { IdempotencyKeyModel } from './models/idempotency-key.model';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;

/**
 * Sorts uploaded files in natural alphanumeric filename order.
 *
 * Ensures files like `transactions_02.csv` precede `transactions_10.csv`
 * consistently across storage, queries, and UI displays.
 *
 * @param files - Array of uploaded file objects with `originalname`.
 * @returns A new array sorted in natural ascending alphanumeric order.
 */
export function sortFilesNaturally<T extends { originalname: string }>(files: readonly T[]): T[] {
  return [...files].sort((a, b) =>
    a.originalname.localeCompare(b.originalname, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

export interface CreateBatchInput {
  ownerId: string;
  files: Express.Multer.File[];
  idempotencyKey?: string;
}

export interface CreateBatchResult {
  batch: BatchDetail;
  replayed: boolean;
}

/**
 * Fetches the full batch aggregate including associated files and job states.
 * Enforces ownership access verification.
 *
 * @param batchId - The unique batch ID.
 * @param ownerId - The ID of the authenticated user.
 * @returns Fully populated BatchDetail aggregate.
 * @throws {AppError} If the batch is not found or owned by a different user.
 */
export async function getBatchDetail(batchId: string, ownerId: string): Promise<BatchDetail> {
  const batch = await findOwnedBatch(batchId, ownerId);
  const [files, jobs] = await Promise.all([
    BatchFileModel.find({ batchId }).sort({ sequenceNumber: 1, _id: 1 }),
    BatchJobModel.find({ batchId }).sort({ sequenceNumber: 1, _id: 1 }),
  ]);
  return toBatchDetail(batch, files, jobs);
}

async function replayIdempotentBatch(
  ownerId: string,
  key: string,
  requestHash: string,
): Promise<CreateBatchResult> {
  const record = await IdempotencyKeyModel.findOne({ ownerId, key });
  if (!record) {
    throw new AppError(ERROR_CODES.IDEMPOTENCY_CONFLICT);
  }
  if (record.requestHash !== requestHash) {
    throw new AppError(ERROR_CODES.IDEMPOTENCY_CONFLICT);
  }
  const batch = await getBatchDetail(record.batchId.toString(), ownerId);
  return { batch, replayed: true };
}

async function assertQueueAvailable(): Promise<void> {
  try {
    const depth = await getQueueDepth();
    if (depth >= config.queue.maxDepth) {
      throw new AppError(ERROR_CODES.QUEUE_UNAVAILABLE);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ERROR_CODES.QUEUE_UNAVAILABLE, undefined, { cause: error });
  }
}

/**
 * Creates the batch aggregate, persists each CSV to GridFS, and enqueues one
 * independent job per file. A failure here never leaves the caller without a
 * stable batchId once the idempotency record exists.
 */
export async function createBatch(input: CreateBatchInput): Promise<CreateBatchResult> {
  const { ownerId, files, idempotencyKey } = input;
  const sortedFiles = sortFilesNaturally(files);
  const requestHash = hashUploadRequest(sortedFiles);

  if (idempotencyKey) {
    const existing = await IdempotencyKeyModel.findOne({ ownerId, key: idempotencyKey });
    if (existing) {
      return replayIdempotentBatch(ownerId, idempotencyKey, requestHash);
    }
  }

  await assertQueueAvailable();

  const totalBytes = sortedFiles.reduce((sum, file) => sum + file.size, 0);

  const batch = await BatchModel.create({
    ownerId,
    status: 'QUEUED',
    fileCount: sortedFiles.length,
    totalBytes,
    partialFailure: false,
    counts: {
      totalFiles: sortedFiles.length,
      queued: sortedFiles.length,
      processing: 0,
      retrying: 0,
      completed: 0,
      failed: 0,
      retried: 0,
    },
    reportStatus: 'NOT_REQUESTED',
    idempotencyKey: idempotencyKey ?? null,
  });

  const batchId = batch._id.toString();

  if (idempotencyKey) {
    try {
      await IdempotencyKeyModel.create({
        ownerId,
        key: idempotencyKey,
        requestHash,
        batchId: batch._id,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      });
    } catch (error) {
      // Concurrent duplicate request won the insert race: replay its batch.
      const duplicate = error as { code?: number };
      if (duplicate.code === 11000) {
        return replayIdempotentBatch(ownerId, idempotencyKey, requestHash);
      }
      throw error;
    }
  }

  try {
    const jobsToEnqueue: Array<{
      payload: {
        batchId: string;
        fileId: string;
        ownerId: string;
        gridfsId: string;
        originalName: string;
      };
      fileId: string;
    }> = [];

    // Phase 1: Persist all uploads to GridFS and record all BatchFiles and BatchJobs
    for (let index = 0; index < sortedFiles.length; index += 1) {
      const file = sortedFiles[index];
      if (!file) continue;

      const stored = await storeUpload(file.buffer, file.originalname, {
        batchId,
        ownerId,
        mimeType: file.mimetype,
      });

      const storedFile = await BatchFileModel.create({
        batchId: batch._id,
        ownerId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
        gridfsId: stored.id,
        sequenceNumber: index,
      });

      const fileId = storedFile._id.toString();
      await BatchJobModel.create({
        batchId: batch._id,
        fileId: storedFile._id,
        ownerId,
        jobId: fileId,
        sequenceNumber: index,
        status: 'QUEUED',
        attempts: 0,
        maxAttempts: RETRY_POLICY.MAX_ATTEMPTS,
      });

      jobsToEnqueue.push({
        payload: { batchId, fileId, ownerId, gridfsId: stored.id, originalName: file.originalname },
        fileId,
      });
    }

    // Phase 2: Enqueue all file jobs only after all batch records are committed to MongoDB
    for (const job of jobsToEnqueue) {
      await enqueueFileJob(job.payload, job.fileId);
    }
  } catch (error) {
    await BatchModel.updateOne(
      { _id: batch._id },
      { $set: { status: 'FAILED' } },
    ).catch(() => undefined);
    throw new AppError(ERROR_CODES.QUEUE_UNAVAILABLE, undefined, { cause: error });
  }

  await refreshBatchState(batchId);
  return { batch: await getBatchDetail(batchId, ownerId), replayed: false };
}

/**
 * Lists batches created by a specific owner with pagination and status filters.
 *
 * @param ownerId - The ID of the authenticated user.
 * @param query - Pagination and filtering query parameters.
 * @returns Paginated list of batch summaries with total count.
 */
export async function listBatches(
  ownerId: string,
  query: ListBatchesQuery,
): Promise<{ items: ReturnType<typeof toBatchSummary>[]; total: number; page: number; limit: number; hasMore: boolean }> {
  const filter: Record<string, unknown> = { ownerId };
  if (query.status) {
    filter.status = query.status;
  }

  const [batches, total] = await Promise.all([
    BatchModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    BatchModel.countDocuments(filter),
  ]);

  return {
    items: batches.map((batch) => toBatchSummary(batch)),
    total,
    page: query.page,
    limit: query.limit,
    hasMore: query.page * query.limit < total,
  };
}

export { assertOwnership };
