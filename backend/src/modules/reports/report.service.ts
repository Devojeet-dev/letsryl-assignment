import type { Readable } from 'node:stream';
import {
  AppError,
  ERROR_CODES,
  type ErrorCode,
  type ReportStatus,
  type ReportStatusInfo,
} from '../../shared';
import {
  deleteGridFile,
  openGridFileStream,
  storeReport,
} from '../../infrastructure/gridfs/gridfs.service';
import { logger } from '../../observability/logger';
import { BatchFileModel } from '../batches/models/batch-file.model';
import { BatchJobModel } from '../batches/models/batch-job.model';
import { BatchModel, type BatchDoc } from '../batches/models/batch.model';
import { toBatchDetail } from '../batches/mappers/batch.mapper';
import { findOwnedBatch } from '../batches/policies/batch-ownership.policy';
import { enqueueReportGeneration } from '../jobs/producers/report-generation.producer';
import { analyzeRowFields } from '../processing/analysis/row-fields';
import {
  findAnalysesForBatch,
  mergeDataQuality,
} from '../processing/persistence/file-analysis.repository';
import { findRejectedRowsForBatch } from '../processing/persistence/rejected-rows.repository';
import { fetchBatchRows } from '../processing/persistence/transaction-rows.repository';
import { buildReportWorkbook } from './excel/workbook.builder';

const REPORT_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function reportFileName(batchId: string): string {
  return `bfdp-batch-${batchId}-report.xlsx`;
}

export interface ReportDownload {
  stream: Readable;
  fileName: string;
  sizeBytes: number | null;
  contentType: string;
}

export async function getReportStatus(
  batchId: string,
  ownerId: string,
): Promise<ReportStatusInfo> {
  const batch = await findOwnedBatch(batchId, ownerId);
  const status = batch.reportStatus as ReportStatus;

  return {
    status,
    fileName: batch.reportFileName ?? null,
    sizeBytes: batch.reportSizeBytes ?? null,
    generatedAt: batch.reportGeneratedAt ? batch.reportGeneratedAt.toISOString() : null,
    downloadUrl: status === 'READY' ? `/api/v1/batches/${batch._id.toString()}/report` : null,
    errorCode: (batch.reportErrorCode as ErrorCode | null) ?? null,
  };
}

/**
 * Moves a completed batch's report into QUEUED at most once, then hands the
 * work to BullMQ. The conditional update makes concurrent requests idempotent.
 */
async function claimAndEnqueue(batch: BatchDoc): Promise<void> {
  const updated = await BatchModel.updateOne(
    { _id: batch._id, reportStatus: { $in: ['NOT_REQUESTED', 'FAILED'] } },
    { $set: { reportStatus: 'QUEUED', reportErrorCode: null } },
  );

  if (updated.modifiedCount === 0) {
    return;
  }

  try {
    await enqueueReportGeneration({ batchId: batch._id.toString(), ownerId: batch.ownerId });
  } catch (error) {
    await BatchModel.updateOne(
      { _id: batch._id },
      { $set: { reportStatus: 'FAILED', reportErrorCode: ERROR_CODES.QUEUE_UNAVAILABLE } },
    );
    throw new AppError(ERROR_CODES.QUEUE_UNAVAILABLE, undefined, { cause: error });
  }
}

/**
 * Explicit regeneration trigger. Returns the current state after the request
 * so the client can keep polling without guessing.
 */
export async function requestReportGeneration(
  batchId: string,
  ownerId: string,
): Promise<ReportStatusInfo> {
  const batch = await findOwnedBatch(batchId, ownerId);

  if (batch.status !== 'COMPLETED') {
    throw new AppError(ERROR_CODES.REPORT_NOT_READY, undefined, {
      details: { status: batch.reportStatus, batchStatus: batch.status },
    });
  }

  if (batch.reportStatus !== 'READY' && batch.reportStatus !== 'GENERATING') {
    await claimAndEnqueue(batch);
  }

  return getReportStatus(batchId, ownerId);
}

export async function openReportDownload(
  batchId: string,
  ownerId: string,
): Promise<ReportDownload> {
  const batch = await findOwnedBatch(batchId, ownerId);

  if (batch.reportStatus === 'READY' && batch.reportFileId) {
    return {
      stream: await openGridFileStream(batch.reportFileId, 'reports'),
      fileName: batch.reportFileName ?? reportFileName(batch._id.toString()),
      sizeBytes: batch.reportSizeBytes ?? null,
      contentType: REPORT_MIME,
    };
  }

  // A finished batch whose artefact is missing (expired, failed, or never
  // requested) is re-queued transparently; the client simply retries.
  let status = batch.reportStatus as ReportStatus;
  if (batch.status === 'COMPLETED' && (status === 'NOT_REQUESTED' || status === 'FAILED')) {
    await claimAndEnqueue(batch);
    status = 'QUEUED';
  }

  throw new AppError(ERROR_CODES.REPORT_NOT_READY, undefined, {
    details: { status, batchStatus: batch.status },
  });
}

/** Worker entry point: builds, stores and publishes the workbook. */
export async function generateReportForBatch(
  batchId: string,
  ownerId: string,
): Promise<void> {
  const batch = await findOwnedBatch(batchId, ownerId);

  if (batch.reportStatus === 'READY' && batch.reportFileId) {
    logger.info({ batchId }, 'report.already_ready');
    return;
  }

  await BatchModel.updateOne(
    { _id: batch._id },
    { $set: { reportStatus: 'GENERATING', reportErrorCode: null } },
  );

  try {
    const [analyses, rows, rejectedRows, fileDocs, jobDocs] = await Promise.all([
      findAnalysesForBatch(batchId),
      fetchBatchRows(batchId, {}),
      findRejectedRowsForBatch(batchId),
      BatchFileModel.find({ batchId }).sort({ sequenceNumber: 1, _id: 1 }),
      BatchJobModel.find({ batchId }).sort({ sequenceNumber: 1, _id: 1 }),
    ]);

    const detail = toBatchDetail(batch, fileDocs, jobDocs);
    const quality = mergeDataQuality(analyses);
    const generatedAt = new Date();

    const buffer = await buildReportWorkbook({
      batch: detail,
      files: analyses,
      rows,
      fields: analyzeRowFields(rows, quality),
      quality,
      rejectedRows,
      generatedAt,
    });

    const fileName = reportFileName(batchId);
    const stored = await storeReport(buffer, fileName);
    const supersededFileId = batch.reportFileId;

    await BatchModel.updateOne(
      { _id: batch._id },
      {
        $set: {
          reportStatus: 'READY',
          reportFileId: stored.id,
          reportFileName: fileName,
          reportSizeBytes: stored.sizeBytes,
          reportGeneratedAt: generatedAt,
          reportErrorCode: null,
        },
      },
    );

    if (supersededFileId) {
      await deleteGridFile(supersededFileId, 'reports');
    }

    logger.info({ batchId, sizeBytes: stored.sizeBytes, rows: rows.length }, 'report.generated');
  } catch (error) {
    await BatchModel.updateOne(
      { _id: batch._id },
      { $set: { reportStatus: 'FAILED', reportErrorCode: ERROR_CODES.REPORT_GENERATION_FAILED } },
    );
    logger.error({ err: error, batchId }, 'report.generation_failed');
    throw error;
  }
}
