import type { ReportGenerationPayload } from '../../../shared';
import { getReportGenerationQueue } from '../queue.factory';
import { REPORT_JOB_NAME } from '../queue.names';
import { logger } from '../../../observability/logger';

const reportJobId = (batchId: string): string => `report_${batchId}`;

/**
 * One report per batch; the batch id doubles as the idempotent job id.
 *
 * Completed/failed jobs are retained for 24 h, and BullMQ ignores `add` when a
 * job with the same id still exists — including a failed one. Retrying after a
 * failed generation therefore has to evict the terminal job first; an active or
 * waiting job is left in place so concurrent requests cannot double-enqueue.
 */
export async function enqueueReportGeneration(
  payload: ReportGenerationPayload,
): Promise<string> {
  const queue = getReportGenerationQueue();
  const jobId = reportJobId(payload.batchId);
  const existing = await queue.getJob(jobId);

  if (existing) {
    const state = await existing.getState();
    if (state === 'completed' || state === 'failed') {
      await existing.remove().catch((error: unknown) => {
        logger.warn({ err: error, batchId: payload.batchId }, 'report.job_evict_failed');
      });
    }
  }

  const job = await queue.add(REPORT_JOB_NAME, payload, { jobId });
  return job.id ?? payload.batchId;
}
