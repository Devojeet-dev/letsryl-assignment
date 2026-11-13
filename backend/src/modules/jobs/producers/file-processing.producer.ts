import type { FileProcessingPayload } from '../../../shared';
import { getFileProcessingQueue } from '../queue.factory';
import { FILE_JOB_NAME } from '../queue.names';

export interface EnqueuedFileJob {
  jobId: string;
  queueName: string;
}

/**
 * One BullMQ job per CSV. `jobId` is the file id, which makes enqueueing
 * idempotent: a replayed request can never create a second processing job.
 */
export async function enqueueFileJob(
  payload: FileProcessingPayload,
  fileId: string,
): Promise<EnqueuedFileJob> {
  const queue = getFileProcessingQueue();
  const job = await queue.add(FILE_JOB_NAME, payload, { jobId: fileId });
  return { jobId: job.id ?? fileId, queueName: queue.name };
}

export async function getQueueDepth(): Promise<number> {
  const counts = await getFileProcessingQueue().getJobCounts('waiting', 'active', 'delayed');
  return (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
}

export async function isQueueWritable(): Promise<boolean> {
  try {
    await getFileProcessingQueue().getJobCounts('waiting');
    return true;
  } catch {
    return false;
  }
}
