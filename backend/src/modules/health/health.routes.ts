import { Router } from 'express';
import { healthController, readyController } from './health.controller';

export function healthRoutes(): Router {
  const router = Router();
  router.get('/health', healthController);
  router.get('/ready', readyController);
  return router;
}
