import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES } from '../shared';

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(ERROR_CODES.NOT_FOUND));
}
