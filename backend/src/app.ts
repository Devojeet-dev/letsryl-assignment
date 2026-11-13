import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { applySecurityMiddleware, contentLengthGuard } from './middleware/security.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { logger } from './observability/logger';
import { healthRoutes } from './modules/health/health.routes';
import { apiV1Routes } from './routes/v1.routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId,
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
    }),
  );
  app.use(contentLengthGuard);
  applySecurityMiddleware(app);

  // Probes are mounted at the root and deliberately bypass auth.
  app.use(healthRoutes());
  app.use('/api/v1', apiV1Routes());

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
