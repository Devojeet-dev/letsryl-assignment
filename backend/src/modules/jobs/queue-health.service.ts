import type { QueueHealth } from '../../shared';
import { getRedis } from '../../infrastructure/redis/connection';
import { getFileProcessingQueue } from './queue.factory';

const WORKER_HEARTBEAT_PREFIX = 'bfdp:worker:heartbeat:';

export async function getQueueHealth(): Promise<QueueHealth> {
  try {
    const queue = getFileProcessingQueue();
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    const heartbeatKeys = await getRedis().keys(`${WORKER_HEARTBEAT_PREFIX}*`);

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      workersOnline: heartbeatKeys.length,
      healthy: true,
    };
  } catch {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      workersOnline: 0,
      healthy: false,
    };
  }
}

export async function publishWorkerHeartbeat(workerId: string): Promise<void> {
  await getRedis().set(`${WORKER_HEARTBEAT_PREFIX}${workerId}`, Date.now().toString(), 'EX', 30);
}
