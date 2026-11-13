import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { healthRoutes } from '../modules/health/health.routes';
import { batchRoutes } from '../modules/batches/batch.routes';
import { analyticsRoutes } from '../modules/analytics/analytics.routes';
import { reportRoutes } from '../modules/reports/report.routes';

/**
 * API surface (mounted at /api/v1):
 *   POST /batches            upload 1–20 CSVs, returns batchId immediately
 *   GET  /batches            owner-scoped list
 *   GET  /batches/:id        status + files + jobs
 *   GET  /batches/:id/analytics   dashboard payload
 *   GET  /batches/:id/report      xlsx download (202/409 while generating)
 *   GET  /auth/session, /auth/me
 * Health probes live at the root (/health, /ready).
 */
export function apiV1Routes(): Router {
  const router = Router();
  router.use('/auth', authRoutes());
  router.use('/batches', batchRoutes());
  router.use('/batches', analyticsRoutes());
  router.use('/batches', reportRoutes());
  router.use('/', healthRoutes());
  return router;
}
