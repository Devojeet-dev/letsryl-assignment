import type { ErrorCode, JobStatus } from '../../shared';
import { BatchJobModel } from '../batches/models/batch-job.model';

export interface JobFailure {
  errorCode: ErrorCode;
  errorMessage: string;
}

/**
 * Applies a lifecycle transition atomically. Illegal transitions are ignored
 * rather than throwing, because BullMQ may deliver duplicate events.
 */
export async function transitionJob(
  fileId: string,
  status: JobStatus,
  patch: {
    attempts?: number;
    failure?: JobFailure;
    startedAt?: Date;
    finishedAt?: Date;
  } = {},
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (patch.attempts !== undefined) update.attempts = patch.attempts;
  if (patch.startedAt) update.startedAt = patch.startedAt;
  if (patch.finishedAt) update.finishedAt = patch.finishedAt;
  if (patch.failure) {
    update.errorCode = patch.failure.errorCode;
    update.errorMessage = patch.failure.errorMessage;
  }
  if (status === 'COMPLETED' || status === 'QUEUED') {
    update.errorCode = null;
    update.errorMessage = null;
  }

  await BatchJobModel.updateOne(
    {
      fileId,
      ...(status === 'COMPLETED' || status === 'FAILED'
        ? { status: { $nin: ['COMPLETED', 'FAILED'] } }
        : {}),
    },
    { $set: update },
  );
}
