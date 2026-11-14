import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES, type DashboardQuery } from '../../shared';
import { getDashboard } from './dashboard.service';

/**
 * Handles requests for filtered batch analytics (`GET /batches/:id/analytics`).
 *
 * Verifies batch ownership, applies requested dashboard filters (fileId, branchId,
 * transactionType, date range), and computes real-time IQR statistics, distributions,
 * high-risk summaries, and data-quality findings across the batch rows.
 * Sets `cache-control: no-store` to prevent stale caching during active processing.
 *
 * @param req - Express request with batch ID, query filters, and auth context.
 * @param res - Express response returning HTTP 200 with the full DashboardPayload.
 * @param next - Express next error handler callback.
 */
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

    res.setHeader('cache-control', 'no-store');
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
}
