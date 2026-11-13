import { Worker, type Processor } from 'bullmq';
import { RETRY_POLICY } from '../shared';
import { config } from '../config';
import { closeGridFs } from '../infrastructure/gridfs/gridfs.service';
import { connectMongo, disconnectMongo } from '../infrastructure/mongo/connection';
import { createRedisConnection } from '../infrastructure/redis/connection';
import { closeQueues } from '../modules/jobs/queue.factory';
import { publishWorkerHeartbeat } from '../modules/jobs/queue-health.service';
import { logger } from '../observability/logger';

const HEARTBEAT_INTERVAL_MS = 10_000;

export interface WorkerRuntimeOptions {
  /** Stable label used for logs and the heartbeat key. */
  name: string;
  queueName: string;
  processor: Processor;
}

export interface ActiveWorker {
  worker: Worker;
  connection: ReturnType<typeof createRedisConnection>;
  stop: () => Promise<void>;
}

/**
 * Creates and starts a BullMQ worker instance with its dedicated Redis connection,
 * periodic heartbeats for /ready checks, and an idempotent stop handler.
 */
export async function createWorkerInstance(options: WorkerRuntimeOptions): Promise<ActiveWorker> {
  const workerId = `${options.name}-${process.pid}`;
  const connection = createRedisConnection();
  const worker = new Worker(options.queueName, options.processor, {
    connection,
    concurrency: config.queue.concurrency,
    // A job whose worker dies holds its lock until it expires; BullMQ then marks
    // it stalled and retries it. Renewal happens automatically while alive.
    lockDuration: RETRY_POLICY.JOB_TIMEOUT_MS,
    stalledInterval: 30_000,
  });

  worker.on('completed', (job) => {
    logger.info({ queue: options.queueName, jobId: job.id }, 'worker.job_completed');
  });
  worker.on('failed', (job, error) => {
    logger.error(
      { queue: options.queueName, jobId: job?.id, err: error },
      'worker.job_failed',
    );
  });
  worker.on('error', (error) => {
    logger.error({ queue: options.queueName, err: error }, 'worker.connection_error');
  });

  const heartbeat = setInterval(() => {
    void publishWorkerHeartbeat(workerId).catch((error: unknown) => {
      logger.warn({ err: error }, 'worker.heartbeat_failed');
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();
  await publishWorkerHeartbeat(workerId).catch(() => undefined);

  logger.info(
    { workerId, queue: options.queueName, concurrency: config.queue.concurrency },
    'worker.started',
  );

  const stop = async (): Promise<void> => {
    clearInterval(heartbeat);
    await worker.close();
    await connection.quit().catch(() => connection.disconnect());
  };

  return { worker, connection, stop };
}

/**
 * Boots a standalone worker process: its own Redis connection (BullMQ requires
 * blocking connections to be exclusive), Mongo access, a heartbeat visible to
 * /ready, and graceful drain on SIGTERM.
 */
export async function runWorker(options: WorkerRuntimeOptions): Promise<void> {
  await connectMongo();
  const instance = await createWorkerInstance(options);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal, queue: options.queueName }, 'worker.shutdown_started');

    const forceExit = setTimeout(() => {
      logger.error('worker.shutdown_forced');
      process.exit(1);
    }, 20_000);
    forceExit.unref();

    await instance.stop();
    await Promise.allSettled([
      closeQueues(),
      closeGridFs(),
      disconnectMongo(),
    ]);

    logger.info('worker.shutdown_complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'process.unhandled_rejection');
  });
}
