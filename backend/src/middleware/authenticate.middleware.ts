import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES } from '../shared';
import { verifyAccessToken } from '../modules/auth/auth-token.service';
import { getRequestContext } from '../observability/request-context';

export function authenticate() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.header('authorization');
      if (!header?.startsWith('Bearer ')) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED);
      }

      const token = header.slice('Bearer '.length).trim();
      if (token.length === 0) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED);
      }

      const context = await verifyAccessToken(token);
      req.auth = context;

      const requestContext = getRequestContext();
      if (requestContext) {
        requestContext.userId = context.userId;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
