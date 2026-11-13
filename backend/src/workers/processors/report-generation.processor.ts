import type { Job } from 'bullmq';
import type { ReportGenerationPayload } from '../../shared';
import { generateReportForBatch } from '../../modules/reports/report.service';

/**
 * Report jobs are keyed by `report_<batchId>`, so at most one workbook is built
 * per batch. Generation is idempotent and safe to retry.
 */
export async function processReportJob(job: Job<ReportGenerationPayload>): Promise<void> {
  await generateReportForBatch(job.data.batchId, job.data.ownerId);
}
