import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES, type SessionExchangeInput } from '../../shared';
import { getRequestContext } from '../../observability/request-context';
import { createDemoSession, exchangeSessionToken } from './auth.service';

/**
 * Exchanges a third-party token (Google ID token or Supabase access token) for an API session (`POST /auth/session`).
 *
 * @param req - Express request containing the `idToken` payload.
 * @param res - Express response returning HTTP 200 with an `AuthSession` object.
 * @param next - Express next error handler callback.
 */
export async function exchangeTokenController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.validated?.body as SessionExchangeInput;
    const session = await exchangeSessionToken(input.idToken);
    res.status(200).json(session);
  } catch (error) {
    next(error);
  }
}

/**
 * Issues an instant review session for the demo reviewer identity (`POST /auth/demo-session`).
 * Gated by `DEMO_AUTH_ENABLED=true`. Returns 403 Forbidden if disabled.
 *
 * @param _req - Express request.
 * @param res - Express response returning HTTP 200 with demo reviewer credentials.
 * @param next - Express next error handler callback.
 */
export async function demoSessionController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await createDemoSession();
    res.status(200).json(session);
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the currently authenticated user's profile context (`GET /auth/me`).
 *
 * @param req - Express request with auth context attached.
 * @param res - Express response returning user metadata.
 * @param next - Express next error handler callback.
 */
export function meController(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(new AppError(ERROR_CODES.UNAUTHORIZED));
    return;
  }
  const context = getRequestContext();
  if (context) {
    context.userId = req.auth.userId;
  }
  res.status(200).json({
    id: req.auth.userId,
    email: req.auth.email,
    name: req.auth.name,
    avatarUrl: req.auth.avatarUrl,
    provider: req.auth.provider === 'app' ? 'google' : req.auth.provider,
  });
}
