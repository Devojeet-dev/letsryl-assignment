import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES, HTTP_STATUS_BY_CODE } from '../shared';
import { getRedis } from '../infrastructure/redis/connection';
import { logger } from '../observability/logger';
import { config } from '../config';

/**
 * Redis-backed fixed-window limiter. Fails open on Redis errors so a cache
 * outage degrades throughput rather than taking down the API; the outage is
 * still surfaced by /ready.
 */
export function rateLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identity = req.auth?.userId ?? req.ip ?? 'anonymous';
    const window = Math.floor(Date.now() / (config.rateLimit.windowSeconds * 1_000));
    const key = `ratelimit:${identity}:${window}`;

    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, config.rateLimit.windowSeconds);
      }

      const remaining = Math.max(config.rateLimit.maxRequests - count, 0);
      res.setHeader('x-ratelimit-limit', config.rateLimit.maxRequests);
      res.setHeader('x-ratelimit-remaining', remaining);

      if (count > config.rateLimit.maxRequests) {
        res.setHeader('retry-after', config.rateLimit.windowSeconds);
        next(new AppError(ERROR_CODES.RATE_LIMITED));
        return;
      }
      next();
    } catch (error) {
      logger.warn({ err: error }, 'ratelimit.degraded_open');
      next();
    }
  };
}

export { HTTP_STATUS_BY_CODE };
