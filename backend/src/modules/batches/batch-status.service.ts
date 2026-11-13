import { isTerminalJobStatus, type JobStatus } from '../../shared';
import { BatchJobModel } from '../batches/models/batch-job.model';
import { BatchModel } from '../batches/models/batch.model';
import { toCounts } from '../batches/mappers/batch.mapper';

export interface BatchStateSnapshot {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  allTerminal: boolean;
  counts: ReturnType<typeof toCounts>;
}

/**
 * Recomputes batch counts from the job collection. This is the single writer
 * of batch status, which keeps concurrent workers from racing the aggregate.
 */
export async function refreshBatchState(batchId: string): Promise<BatchStateSnapshot> {
  const [batch, jobs] = await Promise.all([
    BatchModel.findById(batchId),
    BatchJobModel.find({ batchId }),
  ]);

  const fileCount = batch?.fileCount ?? jobs.length;
  const rawCounts = toCounts(jobs);
  const counts = { ...rawCounts, totalFiles: fileCount };

  const allTerminal =
    fileCount > 0 &&
    jobs.length === fileCount &&
    jobs.every((job) => isTerminalJobStatus(job.status as JobStatus));

  let status: BatchStateSnapshot['status'];
  if (allTerminal) {
    status = 'COMPLETED';
  } else if (counts.processing > 0 || counts.retrying > 0 || counts.completed > 0) {
    status = 'PROCESSING';
  } else {
    status = 'QUEUED';
  }

  const partialFailure = counts.failed > 0;

  await BatchModel.updateOne(
    { _id: batchId },
    { $set: { status, counts, partialFailure } },
  );

  return { status, allTerminal, counts };
}
