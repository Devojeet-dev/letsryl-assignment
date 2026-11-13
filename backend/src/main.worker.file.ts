import { FILE_PROCESSING_QUEUE } from './modules/jobs/queue.names';
import { logger } from './observability/logger';
import { processFileJob } from './workers/processors/file-processing.processor';
import { runWorker } from './workers/worker-runtime';

runWorker({
  name: 'file-worker',
  queueName: FILE_PROCESSING_QUEUE,
  processor: processFileJob,
}).catch((error: unknown) => {
  logger.fatal({ err: error }, 'file_worker.bootstrap_failed');
  process.exit(1);
});
