import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES } from '../../shared';
import { logger } from '../../observability/logger';
import {
  getReportStatus,
  openReportDownload,
  requestReportGeneration,
} from './report.service';

function requireUserId(req: Request): string {
  if (!req.auth) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED);
  }
  return req.auth.userId;
}

export async function getReportStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.validated?.params as { id: string };
    const status = await getReportStatus(id, requireUserId(req));
    res.setHeader('cache-control', 'no-store');
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
}

export async function requestReportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.validated?.params as { id: string };
    const status = await requestReportGeneration(id, requireUserId(req));
    res.setHeader('cache-control', 'no-store');
    res.status(202).json(status);
  } catch (error) {
    next(error);
  }
}

export async function downloadReportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.validated?.params as { id: string };
    const download = await openReportDownload(id, requireUserId(req));

    res.setHeader('content-type', download.contentType);
    res.setHeader(
      'content-disposition',
      `attachment; filename="${download.fileName}"`,
    );
    if (download.sizeBytes !== null) {
      res.setHeader('content-length', String(download.sizeBytes));
    }
    res.setHeader('cache-control', 'private, max-age=300');

    // Once streaming starts the error handler can no longer emit a JSON body.
    download.stream.once('error', (error) => {
      logger.error({ err: error, batchId: id }, 'report.stream_failed');
      res.destroy(error);
    });
    download.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}
