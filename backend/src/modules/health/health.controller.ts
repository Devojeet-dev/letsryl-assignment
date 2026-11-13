import type { NextFunction, Request, Response } from 'express';
import { buildHealthReport, isReady } from './health.service';

export async function healthController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await buildHealthReport();
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
}

export async function readyController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ready = await isReady();
    const report = await buildHealthReport();
    res.status(ready ? 200 : 503).json(report);
  } catch (error) {
    next(error);
  }
}
