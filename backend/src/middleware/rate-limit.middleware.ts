import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES, HTTP_STATUS_BY_CODE } from '../shared';
import { getRedis } from '../infrastructure/redis/connection';
import { logger } from '../observability/logger';
import { config } from '../config';

/**
 * Creates Redis-backed fixed-window rate limiting middleware.
 *
 * Tracks request counts per user (or client IP for unauthenticated routes).
 * Sets `x-ratelimit-limit` and `x-ratelimit-remaining` response headers.
 * Fails open on Redis connectivity issues to ensure API availability during cache hiccups
 * (with warnings logged and readiness degraded).
 *
 * @returns Express rate limiting middleware function.
 * @throws {AppError} 429 RATE_LIMITED with `retry-after` header when the window cap is exceeded.
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
