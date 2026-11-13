import { ERROR_CODES, type ErrorCode } from '../../shared';
import { BatchFileModel } from '../batches/models/batch-file.model';
import { BatchModel } from '../batches/models/batch.model';
import { refreshBatchState } from '../batches/batch-status.service';
import { enqueueReportGeneration } from '../jobs/producers/report-generation.producer';
import { transitionJob } from './job-lifecycle.service';

export interface FileOutcome {
  status: 'COMPLETED' | 'FAILED';
  errorCode: ErrorCode | null;
}

async function markFileFailed(
  fileId: string,
  code: ErrorCode,
  message: string,
): Promise<void> {
  await BatchFileModel.updateOne(
    { _id: fileId },
    { $set: { errorCode: code, errorMessage: message, processedAt: new Date() } },
  );
  await transitionJob(fileId, 'FAILED', {
    failure: { errorCode: code, errorMessage: message },
    finishedAt: new Date(),
  });
}

export async function recordFileSuccess(
  fileId: string,
  counts: { totalRows: number; validRows: number; rejectedRows: number },
): Promise<void> {
  await BatchFileModel.updateOne(
    { _id: fileId },
    {
      $set: {
        rowCount: counts.totalRows,
        validRowCount: counts.validRows,
        rejectedRowCount: counts.rejectedRows,
        errorCode: null,
        errorMessage: null,
        processedAt: new Date(),
      },
    },
  );
  await transitionJob(fileId, 'COMPLETED', { finishedAt: new Date() });
}

/**
 * Called by workers after every terminal file outcome. Refreshes the batch
 * aggregate and, once every file is terminal, enqueues the Excel report.
 */
export async function finalizeBatchIfComplete(
  batchId: string,
  ownerId: string,
): Promise<void> {
  const snapshot = await refreshBatchState(batchId);
  if (!snapshot.allTerminal) {
    return;
  }

  const updated = await BatchModel.updateOne(
    { _id: batchId, reportStatus: { $in: ['NOT_REQUESTED', 'FAILED'] } },
    { $set: { reportStatus: 'QUEUED', reportErrorCode: null } },
  );

  if (updated.modifiedCount === 0) {
    return;
  }

  try {
    await enqueueReportGeneration({ batchId, ownerId });
  } catch {
    await BatchModel.updateOne(
      { _id: batchId },
      { $set: { reportStatus: 'FAILED', reportErrorCode: ERROR_CODES.QUEUE_UNAVAILABLE } },
    );
  }
}

export { markFileFailed };
