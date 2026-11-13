import type { Job } from 'bullmq';
import { ERROR_CODES, type FileProcessingPayload } from '../../shared';
import { readGridFile } from '../../infrastructure/gridfs/gridfs.service';
import { logger } from '../../observability/logger';
import { parseCsvBuffer } from '../../modules/processing/csv/csv.parser';
import { buildFileAnalysis } from '../../modules/processing/analysis/analysis.builder';
import { validateRows } from '../../modules/processing/validation/row.validator';
import { saveFileAnalysis } from '../../modules/processing/persistence/file-analysis.repository';
import { replaceFileRows } from '../../modules/processing/persistence/transaction-rows.repository';
import { replaceRejectedRows } from '../../modules/processing/persistence/rejected-rows.repository';
import {
  finalizeBatchIfComplete,
  markFileFailed,
  recordFileSuccess,
} from '../../modules/processing/processing.service';
import { transitionJob } from '../../modules/processing/job-lifecycle.service';
import { refreshBatchState } from '../../modules/batches/batch-status.service';
import { isFileProcessingError } from '../../modules/processing/errors/processing-error';

/**
 * Executes one CSV. Terminal data problems fail only this file; transient
 * infrastructure problems are rethrown so BullMQ applies the retry policy.
 */
export async function processFileJob(job: Job<FileProcessingPayload>): Promise<void> {
  const payload = job.data;
  const attempt = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 3;

  await transitionJob(payload.fileId, 'PROCESSING', {
    attempts: attempt,
    startedAt: new Date(),
  });
  await refreshBatchState(payload.batchId).catch(() => undefined);

  try {
    const buffer = await readGridFile(payload.gridfsId, 'uploads');
    const parsed = parseCsvBuffer(buffer);
    const outcome = validateRows(parsed.rows);
    const analysis = buildFileAnalysis({
      fileId: payload.fileId,
      fileName: payload.originalName,
      rows: outcome.rows,
      dataQuality: outcome.dataQuality,
    });

    await replaceFileRows(payload.batchId, payload.fileId, payload.ownerId, outcome.rows);
    await replaceRejectedRows(
      payload.batchId,
      payload.fileId,
      payload.ownerId,
      outcome.dataQuality.rejectedRowSamples,
    );
    await saveFileAnalysis(payload.batchId, payload.fileId, payload.ownerId, analysis);
    await recordFileSuccess(payload.fileId, {
      totalRows: outcome.totalRows,
      validRows: outcome.rows.length,
      rejectedRows: outcome.rejectedRows,
    });

    await finalizeBatchIfComplete(payload.batchId, payload.ownerId);
    logger.info(
      { batchId: payload.batchId, fileId: payload.fileId, rows: outcome.totalRows },
      'processing.file_completed',
    );
  } catch (error) {
    if (isFileProcessingError(error)) {
      await markFileFailed(payload.fileId, error.code, error.message);
      await finalizeBatchIfComplete(payload.batchId, payload.ownerId);
      logger.warn(
        { batchId: payload.batchId, fileId: payload.fileId, code: error.code },
        'processing.file_failed_terminal',
      );
      return;
    }

    const message = error instanceof Error ? error.message : 'Unexpected processing error';

    if (attempt < maxAttempts) {
      await transitionJob(payload.fileId, 'RETRYING', {
        attempts: attempt,
        failure: { errorCode: ERROR_CODES.INTERNAL_ERROR, errorMessage: message },
      });
      await refreshBatchState(payload.batchId).catch(() => undefined);
      logger.warn(
        { batchId: payload.batchId, fileId: payload.fileId, attempt, maxAttempts },
        'processing.file_retrying',
      );
      throw error;
    }

    await markFileFailed(payload.fileId, ERROR_CODES.INTERNAL_ERROR, 'Processing failed after retries.');
    await finalizeBatchIfComplete(payload.batchId, payload.ownerId);
    logger.error(
      { err: error, batchId: payload.batchId, fileId: payload.fileId },
      'processing.file_failed_exhausted',
    );
  }
}
