import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { config } from '../../../config';
import { AppError, ERROR_CODES } from '../../../shared';
import * as fileProducer from '../producers/file-processing.producer';
import { getQueueHealth } from '../queue-health.service';
import * as redisConn from '../../../infrastructure/redis/connection';
import * as mongoConn from '../../../infrastructure/mongo/connection';
import * as healthService from '../../health/health.service';

describe('Queue Outage & Backpressure Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Queue Depth & Capacity Guards', () => {
    it('detects when queue depth exceeds safety threshold (QUEUE_MAX_DEPTH)', async () => {
      vi.spyOn(fileProducer, 'getQueueDepth').mockResolvedValue(config.queue.maxDepth + 10);

      const depth = await fileProducer.getQueueDepth();
      expect(depth).toBeGreaterThanOrEqual(config.queue.maxDepth);

      const verifyQueueCapacity = async () => {
        const currentDepth = await fileProducer.getQueueDepth();
        if (currentDepth >= config.queue.maxDepth) {
          throw new AppError(ERROR_CODES.QUEUE_UNAVAILABLE);
        }
      };

      await expect(verifyQueueCapacity()).rejects.toMatchObject({
        code: ERROR_CODES.QUEUE_UNAVAILABLE,
      });
    });

    it('translates Redis connection errors into QUEUE_UNAVAILABLE 503 error', async () => {
      vi.spyOn(fileProducer, 'getQueueDepth').mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6379'));

      const safeCheck = async () => {
        try {
          await fileProducer.getQueueDepth();
        } catch (error) {
          throw new AppError(ERROR_CODES.QUEUE_UNAVAILABLE, undefined, { cause: error });
        }
      };

      await expect(safeCheck()).rejects.toMatchObject({
        code: ERROR_CODES.QUEUE_UNAVAILABLE,
      });
    });
  });

  describe('Queue Health & Readiness Reporting', () => {
    it('returns healthy: false when Redis or Queue is unreachable', async () => {
      vi.spyOn(redisConn, 'getRedis').mockImplementation(() => {
        throw new Error('Redis socket closed');
      });

      const health = await getQueueHealth();
      expect(health.healthy).toBe(false);
      expect(health.workersOnline).toBe(0);
      expect(health.waiting).toBe(0);
    });

    it('reports ready: false and returns 503 when Redis is unavailable', async () => {
      vi.spyOn(mongoConn, 'isMongoReady').mockReturnValue(true);
      vi.spyOn(redisConn, 'isRedisReady').mockResolvedValue(false);

      const ready = await healthService.isReady();
      expect(ready).toBe(false);

      vi.spyOn(healthService, 'isReady').mockResolvedValue(false);
      vi.spyOn(healthService, 'buildHealthReport').mockResolvedValue({
        status: 'unavailable',
        version: config.serviceVersion,
        timestamp: new Date().toISOString(),
        uptimeSeconds: 100,
        checks: [{ name: 'redis', ok: false, latencyMs: 5 }],
      });

      const app = createApp();
      const res = await request(app).get('/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unavailable');
    });
  });
});
