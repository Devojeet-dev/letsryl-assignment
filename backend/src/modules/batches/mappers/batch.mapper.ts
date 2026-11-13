import type {
  BatchCounts,
  BatchDetail,
  BatchFileView,
  BatchSummary,
  ErrorCode,
  JobView,
} from '../../../shared';
import type { BatchDoc } from '../models/batch.model';
import type { BatchFileDoc } from '../models/batch-file.model';
import type { BatchJobDoc } from '../models/batch-job.model';

export function toFileView(file: BatchFileDoc): BatchFileView {
  return {
    id: file._id.toString(),
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    sequenceNumber: file.sequenceNumber,
    rowCount: file.rowCount ?? null,
    validRowCount: file.validRowCount ?? null,
    rejectedRowCount: file.rejectedRowCount ?? null,
    errorCode: (file.errorCode as ErrorCode | null) ?? null,
    errorMessage: file.errorMessage ?? null,
    checksum: file.checksum ?? null,
  };
}

export function toJobView(job: BatchJobDoc, fileName: string): JobView {
  return {
    id: job._id.toString(),
    fileId: job.fileId.toString(),
    fileName,
    sequenceNumber: job.sequenceNumber,
    status: job.status as JobView['status'],
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    errorCode: (job.errorCode as ErrorCode | null) ?? null,
    errorMessage: job.errorMessage ?? null,
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
  };
}

export function toCounts(jobs: readonly BatchJobDoc[]): BatchCounts {
  const counts: BatchCounts = {
    totalFiles: jobs.length,
    queued: 0,
    processing: 0,
    retrying: 0,
    completed: 0,
    failed: 0,
    retried: 0,
  };
  for (const job of jobs) {
    switch (job.status) {
      case 'QUEUED':
        counts.queued += 1;
        break;
      case 'PROCESSING':
        counts.processing += 1;
        break;
      case 'RETRYING':
        counts.retrying += 1;
        break;
      case 'COMPLETED':
        counts.completed += 1;
        break;
      case 'FAILED':
        counts.failed += 1;
        break;
      default:
        break;
    }
    if (job.attempts > 1) {
      counts.retried += 1;
    }
  }
  return counts;
}

export function toBatchSummary(
  batch: BatchDoc,
  jobs?: readonly BatchJobDoc[],
): BatchSummary {
  let counts: BatchCounts;
  if (jobs) {
    const computed = toCounts(jobs);
    counts = {
      ...computed,
      totalFiles: Math.max(batch.fileCount, jobs.length),
      queued: computed.queued + Math.max(0, batch.fileCount - jobs.length),
    };
  } else {
    counts = {
      totalFiles: batch.counts.totalFiles,
      queued: batch.counts.queued,
      processing: batch.counts.processing,
      retrying: batch.counts.retrying,
      completed: batch.counts.completed,
      failed: batch.counts.failed,
      retried: batch.counts.retried,
    };
  }
  const terminal = counts.completed + counts.failed;
  const progressPercent =
    counts.totalFiles > 0 ? Math.round((terminal / counts.totalFiles) * 100) : 0;

  let status = batch.status as BatchSummary['status'];
  if (jobs && status !== 'COMPLETED' && status !== 'FAILED') {
    if (counts.totalFiles > 0 && terminal >= counts.totalFiles) {
      status = 'COMPLETED';
    } else if (counts.processing > 0 || counts.retrying > 0 || counts.completed > 0) {
      status = 'PROCESSING';
    }
  }

  return {
    id: batch._id.toString(),
    status,
    partialFailure: batch.partialFailure || counts.failed > 0,
    fileCount: batch.fileCount,
    totalBytes: batch.totalBytes,
    counts,
    progressPercent,
    reportStatus: batch.reportStatus as BatchSummary['reportStatus'],
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

export function toBatchDetail(
  batch: BatchDoc,
  files: readonly BatchFileDoc[],
  jobs: readonly BatchJobDoc[],
): BatchDetail {
  const names = new Map(files.map((file) => [file._id.toString(), file.originalName]));
  return {
    ...toBatchSummary(batch, jobs),
    files: files.map(toFileView),
    jobs: jobs.map((job) => toJobView(job, names.get(job.fileId.toString()) ?? 'unknown.csv')),
  };
}
