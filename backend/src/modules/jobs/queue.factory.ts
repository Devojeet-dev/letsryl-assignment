import { Queue } from 'bullmq';
import { RETRY_POLICY } from '../../shared';
import { getRedis } from '../../infrastructure/redis/connection';
import { FILE_PROCESSING_QUEUE, REPORT_GENERATION_QUEUE } from './queue.names';

let fileQueue: Queue | null = null;
let reportQueue: Queue | null = null;

/**
 * Queues share the API's Redis connection. Workers create their own blocking
 * connections (BullMQ requirement) inside the worker bootstrap.
 */
export function getFileProcessingQueue(): Queue {
  if (!fileQueue) {
    fileQueue = new Queue(FILE_PROCESSING_QUEUE, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: RETRY_POLICY.MAX_ATTEMPTS,
        backoff: { type: RETRY_POLICY.BACKOFF_TYPE, delay: RETRY_POLICY.BACKOFF_BASE_MS },
        removeOnComplete: { age: RETRY_POLICY.JOB_RETENTION_MS, count: 5_000 },
        removeOnFail: { age: RETRY_POLICY.JOB_RETENTION_MS, count: 5_000 },
      },
    });
  }
  return fileQueue;
}

export function getReportGenerationQueue(): Queue {
  if (!reportQueue) {
    reportQueue = new Queue(REPORT_GENERATION_QUEUE, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: RETRY_POLICY.REPORT_MAX_ATTEMPTS,
        backoff: { type: RETRY_POLICY.BACKOFF_TYPE, delay: RETRY_POLICY.BACKOFF_BASE_MS },
        removeOnComplete: { age: RETRY_POLICY.JOB_RETENTION_MS, count: 1_000 },
        removeOnFail: { age: RETRY_POLICY.JOB_RETENTION_MS, count: 1_000 },
      },
    });
  }
  return reportQueue;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([fileQueue?.close(), reportQueue?.close()]);
  fileQueue = null;
  reportQueue = null;
}
