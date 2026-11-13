import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES, type DashboardQuery } from '../../shared';
import { getDashboard } from './dashboard.service';

export async function getDashboardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED);
    }

    const { id } = req.validated?.params as { id: string };
    const filters = (req.validated?.query ?? {}) as DashboardQuery;
    const dashboard = await getDashboard(id, req.auth.userId, filters);

    // Live operational data must never be served from a stale intermediary.
    res.setHeader('cache-control', 'no-store');
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
}
