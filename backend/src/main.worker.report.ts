import { REPORT_GENERATION_QUEUE } from './modules/jobs/queue.names';
import { logger } from './observability/logger';
import { processReportJob } from './workers/processors/report-generation.processor';
import { runWorker } from './workers/worker-runtime';

runWorker({
  name: 'report-worker',
  queueName: REPORT_GENERATION_QUEUE,
  processor: processReportJob,
}).catch((error: unknown) => {
  logger.fatal({ err: error }, 'report_worker.bootstrap_failed');
  process.exit(1);
});
