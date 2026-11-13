import {
  AppError,
  ERROR_CODES,
  type DashboardQuery,
  type DashboardResponse,
} from '../../shared';
import { BatchFileModel } from '../batches/models/batch-file.model';
import { BatchJobModel } from '../batches/models/batch-job.model';
import { toBatchSummary, toJobView } from '../batches/mappers/batch.mapper';
import { findOwnedBatch } from '../batches/policies/batch-ownership.policy';
import { getQueueHealth } from '../jobs/queue-health.service';
import {
  dailyAggregates,
  groupAggregates,
  highRiskSummary,
  largestTransaction,
} from '../processing/analysis/aggregates';
import { analyzeRowFields } from '../processing/analysis/row-fields';
import {
  findAnalysesForBatch,
  mergeDataQuality,
} from '../processing/persistence/file-analysis.repository';
import { fetchBatchRows } from '../processing/persistence/transaction-rows.repository';

/**
 * Dashboard values are recomputed from the persisted valid rows so that every
 * filter combination (file, branch, type, date window) yields exact numbers.
 * A batch carries at most ~20k rows, so this stays well within API latency
 * budgets; larger installs can move the same reducers behind a Mongo pipeline.
 */
export async function getDashboard(
  batchId: string,
  ownerId: string,
  filters: DashboardQuery,
): Promise<DashboardResponse> {
  const batch = await findOwnedBatch(batchId, ownerId);

  const [files, jobs, analyses, queue] = await Promise.all([
    BatchFileModel.find({ batchId }).sort({ sequenceNumber: 1, _id: 1 }),
    BatchJobModel.find({ batchId }).sort({ sequenceNumber: 1, _id: 1 }),
    findAnalysesForBatch(batchId),
    getQueueHealth(),
  ]);

  if (filters.fileId && !files.some((file) => file._id.toString() === filters.fileId)) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'File does not belong to this batch.');
  }

  const scopedAnalyses = filters.fileId
    ? analyses.filter((analysis) => analysis.fileId === filters.fileId)
    : analyses;
  const quality = scopedAnalyses.length > 0 ? mergeDataQuality(scopedAnalyses) : null;

  const rows = await fetchBatchRows(batchId, filters);
  const names = new Map(files.map((file) => [file._id.toString(), file.originalName]));

  return {
    batch: toBatchSummary(batch, jobs),
    files: jobs.map((job) =>
      toJobView(job, names.get(job.fileId.toString()) ?? 'unknown.csv'),
    ),
    fields: analyzeRowFields(rows, quality),
    dataQuality: quality,
    byTransactionType: groupAggregates(rows, (row) => row.transactionType, (row) => row.amount),
    byBranch: groupAggregates(rows, (row) => row.branchId, (row) => row.amount),
    daily: dailyAggregates(rows),
    largestTransaction: largestTransaction(rows),
    highRisk: rows.length > 0 ? highRiskSummary(rows) : null,
    queue,
  };
}
