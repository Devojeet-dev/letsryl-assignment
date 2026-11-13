import http from 'node:http';
import { config } from './config';
import { createApp } from './app';
import { connectMongo, disconnectMongo } from './infrastructure/mongo/connection';
import { disconnectRedis } from './infrastructure/redis/connection';
import { closeGridFs } from './infrastructure/gridfs/gridfs.service';
import { closeQueues } from './modules/jobs/queue.factory';
import { logger } from './observability/logger';
import { FILE_PROCESSING_QUEUE, REPORT_GENERATION_QUEUE } from './modules/jobs/queue.names';
import { processFileJob } from './workers/processors/file-processing.processor';
import { processReportJob } from './workers/processors/report-generation.processor';
import { createWorkerInstance } from './workers/worker-runtime';

/**
 * Boots the consolidated backend runtime: Express HTTP server, file worker,
 * and report worker in a single process. Ideal for single-service deployments
 * (e.g. Render Web Services) to minimize compute and instance costs.
 */
async function main(): Promise<void> {
  await connectMongo();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'combined_server.api_listening');
  });

  const fileWorker = await createWorkerInstance({
    name: 'file-worker',
    queueName: FILE_PROCESSING_QUEUE,
    processor: processFileJob,
  });

  const reportWorker = await createWorkerInstance({
    name: 'report-worker',
    queueName: REPORT_GENERATION_QUEUE,
    processor: processReportJob,
  });

  logger.info('combined_server.all_services_started');

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'combined_server.shutdown_started');

    const forceExit = setTimeout(() => {
      logger.error('combined_server.shutdown_forced');
      process.exit(1);
    }, 20_000);
    forceExit.unref();

    server.close();
    await Promise.allSettled([
      fileWorker.stop(),
      reportWorker.stop(),
    ]);
    await Promise.allSettled([
      closeQueues(),
      disconnectRedis(),
      closeGridFs(),
      disconnectMongo(),
    ]);

    logger.info('combined_server.shutdown_complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'combined_server.unhandled_rejection');
  });
}

main().catch((error) => {
  logger.fatal({ err: error }, 'combined_server.bootstrap_failed');
  process.exit(1);
});

