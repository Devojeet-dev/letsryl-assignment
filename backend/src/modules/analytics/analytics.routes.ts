import { Router } from 'express';
import { batchIdParamSchema, dashboardQuerySchema } from '../../shared';
import { authenticate } from '../../middleware/authenticate.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getDashboardController } from './analytics.controller';

/** Dashboard polling endpoint; the client auto-refreshes while jobs run. */
export function analyticsRoutes(): Router {
  const router = Router();
  router.use(authenticate());

  router.get(
    '/:id/analytics',
    validate({ params: batchIdParamSchema, query: dashboardQuerySchema }),
    getDashboardController,
  );

  return router;
}
