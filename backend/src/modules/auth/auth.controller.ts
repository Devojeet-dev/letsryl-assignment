import type { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES, type SessionExchangeInput } from '../../shared';
import { getRequestContext } from '../../observability/request-context';
import { createDemoSession, exchangeSessionToken } from './auth.service';

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
