import { performance } from 'node:perf_hooks';
import mongoose from 'mongoose';
import type { CheckResult, HealthReport } from '../../shared';
import { config } from '../../config';
import { isMongoReady } from '../../infrastructure/mongo/connection';
import { isRedisReady } from '../../infrastructure/redis/connection';
import { getUploadBucket } from '../../infrastructure/gridfs/gridfs.service';
import { getQueueHealth } from '../jobs/queue-health.service';

const CHECK_TIMEOUT_MS = 2_500;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('check timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function timedCheck(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  const startedAt = performance.now();
  try {
    await withTimeout(fn(), CHECK_TIMEOUT_MS);
    return { name, ok: true, latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return {
      name,
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      detail: error instanceof Error ? error.name : 'unknown',
    };
  }
}

export async function buildHealthReport(): Promise<HealthReport> {
  const checks = await Promise.all([
    timedCheck('mongo', async () => {
      if (!isMongoReady() || !mongoose.connection.db) {
        throw new Error('mongo not ready');
      }
      await mongoose.connection.db.admin().ping();
    }),
    timedCheck('redis', async () => {
      if (!(await isRedisReady())) {
        throw new Error('redis not ready');
      }
    }),
    timedCheck('gridfs', async () => {
      const bucket = await getUploadBucket();
      await bucket.find({}, { limit: 1 }).toArray();
    }),
    timedCheck('queue', async () => {
      const health = await getQueueHealth();
      if (!health.healthy) {
        throw new Error('queue unavailable');
      }
    }),
  ]);

  const status = checks.every((check) => check.ok)
    ? 'ok'
    : checks.some((check) => check.name === 'mongo' || check.name === 'redis')
      ? 'unavailable'
      : 'degraded';

  return {
    status,
    version: config.version,
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  };
}

/** Readiness requires the dependencies without which uploads cannot be accepted. */
export async function isReady(): Promise<boolean> {
  const report = await buildHealthReport();
  const required = new Set(['mongo', 'redis', 'queue']);
  return report.checks.filter((check) => required.has(check.name)).every((check) => check.ok);
}
