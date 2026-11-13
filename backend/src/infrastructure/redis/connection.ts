import Redis, { type RedisOptions } from 'ioredis';
import { config } from '../../config';
import { logger } from '../../observability/logger';

/**
 * BullMQ requires `maxRetriesPerRequest: null` on blocking connections.
 * Every worker gets its own connection; the API shares one for queues/cache.
 */
export function createRedisConnection(options: RedisOptions = {}): Redis {
  const client = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (attempt) => Math.min(attempt * 250, 5_000),
    ...options,
  });

  client.on('error', (error) => {
    logger.error({ err: error }, 'redis.error');
  });

  client.on('reconnecting', () => {
    logger.warn('redis.reconnecting');
  });

  return client;
}

let sharedClient: Redis | null = null;

export function getRedis(): Redis {
  if (!sharedClient) {
    sharedClient = createRedisConnection();
  }
  return sharedClient;
}

export async function disconnectRedis(): Promise<void> {
  if (sharedClient) {
    await sharedClient.quit().catch(() => sharedClient?.disconnect());
    sharedClient = null;
  }
}

export async function isRedisReady(): Promise<boolean> {
  try {
    const pong = await getRedis().ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

