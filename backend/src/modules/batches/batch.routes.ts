import { Router } from 'express';
import { batchIdParamSchema, listBatchesQuerySchema } from '../../shared';
import { authenticate } from '../../middleware/authenticate.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createBatchController,
  getBatchController,
  listBatchesController,
} from './batch.controller';
import { uploadBatchFiles } from './policies/upload-limits.policy';

export function batchRoutes(): Router {
  const router = Router();

  router.use(authenticate());

  router.post('/', rateLimitMiddleware(), uploadBatchFiles, createBatchController);
  router.get('/', validate({ query: listBatchesQuerySchema }), listBatchesController);
  router.get('/:id', validate({ params: batchIdParamSchema }), getBatchController);

  return router;
}
