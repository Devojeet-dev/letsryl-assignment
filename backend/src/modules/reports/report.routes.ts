import { Router } from 'express';
import { batchIdParamSchema } from '../../shared';
import { authenticate } from '../../middleware/authenticate.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  downloadReportController,
  getReportStatusController,
  requestReportController,
} from './report.controller';

/**
 * Report endpoints:
 *   GET  /batches/:id/report          xlsx download (409 while generating)
 *   GET  /batches/:id/report/status   lightweight polling
 *   POST /batches/:id/report          regenerate / enqueue
 */
export function reportRoutes(): Router {
  const router = Router();
  router.use(authenticate());

  router.get(
    '/:id/report',
    validate({ params: batchIdParamSchema }),
    downloadReportController,
  );
  router.get(
    '/:id/report/status',
    validate({ params: batchIdParamSchema }),
    getReportStatusController,
  );
  router.post(
    '/:id/report',
    validate({ params: batchIdParamSchema }),
    requestReportController,
  );

  return router;
}
