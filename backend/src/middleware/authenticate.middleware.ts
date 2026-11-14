import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES } from '../shared';
import { verifyAccessToken } from '../modules/auth/auth-token.service';
import { getRequestContext } from '../observability/request-context';

/**
 * Express middleware that authenticates inbound HTTP requests using Bearer JWT tokens.
 *
 * Extracts the Bearer token from the `Authorization` header, verifies its cryptographic signature
 * and expiration (supporting Supabase JWTs, Google ID tokens, and internal app JWTs), and attaches
 * the authenticated user identity to `req.auth` and logging request context.
 *
 * @returns Express middleware function.
 * @throws {AppError} 401 UNAUTHORIZED if the header is missing, malformed, expired, or invalid.
 */
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
