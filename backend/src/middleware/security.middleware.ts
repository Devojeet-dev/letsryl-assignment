import type { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { AppError, ERROR_CODES, UPLOAD_LIMITS } from '../shared';
import { config } from '../config';

const LOCAL_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function applySecurityMiddleware(app: express.Express): void {
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        if (!config.isProduction && LOCAL_ORIGIN_REGEX.test(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
      allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-request-id'],
      exposedHeaders: [
        'x-request-id',
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'idempotent-replayed',
      ],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
}

/** Rejects bodies above the batch cap before multipart parsing allocates memory. */
export function contentLengthGuard(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.header('content-length');
  const multipartOverheadBytes = 1024 * 1024;
  if (raw && Number(raw) > UPLOAD_LIMITS.MAX_BATCH_BYTES + multipartOverheadBytes) {
    next(new AppError(ERROR_CODES.BATCH_TOO_LARGE));
    return;
  }
  next();
}
