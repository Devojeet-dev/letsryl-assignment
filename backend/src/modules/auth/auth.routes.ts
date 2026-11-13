import { Router } from 'express';
import { sessionExchangeSchema } from '../../shared';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/authenticate.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { exchangeTokenController, demoSessionController, meController } from './auth.controller';

export function authRoutes(): Router {
  const router = Router();

  router.post(
    '/session',
    rateLimitMiddleware(),
    validate({ body: sessionExchangeSchema }),
    exchangeTokenController,
  );
  // Opt-in reviewer login; returns 403 unless DEMO_AUTH_ENABLED=true.
  router.post('/demo-session', rateLimitMiddleware(), demoSessionController);
  router.get('/me', authenticate(), meController);

  return router;
}
