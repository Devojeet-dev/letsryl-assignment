import http from 'node:http';
import { config } from './config';
import { createApp } from './app';
import { connectMongo, disconnectMongo } from './infrastructure/mongo/connection';
import { disconnectRedis } from './infrastructure/redis/connection';
import { closeGridFs } from './infrastructure/gridfs/gridfs.service';
import { closeQueues } from './modules/jobs/queue.factory';
import { logger } from './observability/logger';

async function main(): Promise<void> {
  await connectMongo();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'api.listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'api.shutdown_started');

    const forceExit = setTimeout(() => {
      logger.error('api.shutdown_forced');
      process.exit(1);
    }, 15_000);
    forceExit.unref();

    server.close();
    await Promise.allSettled([closeQueues(), disconnectRedis(), closeGridFs(), disconnectMongo()]);
    logger.info('api.shutdown_complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'process.unhandled_rejection');
  });
}

main().catch((error) => {
  logger.fatal({ err: error }, 'api.bootstrap_failed');
  process.exit(1);
});
