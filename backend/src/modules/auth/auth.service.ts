import { decodeJwt } from 'jose';
import { AppError, ERROR_CODES, type AuthSession, type AuthUser } from '../../shared';
import { config } from '../../config';
import type { AuthContext } from './auth.types';
import { signAppJwt } from './tokens/app-jwt.service';
import { verifyGoogleIdToken } from './providers/google-idtoken.provider';
import { verifySupabaseToken } from './providers/supabase-jwks.provider';

function toAuthUser(context: AuthContext): AuthUser {
  return {
    id: context.userId,
    email: context.email,
    name: context.name,
    avatarUrl: context.avatarUrl,
    provider: context.provider,
  };
}

const DEMO_IDENTITY: AuthContext = {
  userId: 'demo-reviewer',
  email: 'demo@bfdp.local',
  name: 'Demo Reviewer',
  avatarUrl: null,
  provider: 'app',
};

/**
 * Opt-in session for reviewers who run the stack without a Supabase project.
 * Gated by DEMO_AUTH_ENABLED and still requires APP_JWT_SECRET to sign tokens.
 */
export async function createDemoSession(): Promise<AuthSession> {
  if (!config.auth.demoEnabled) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Demo sign-in is disabled on this deployment.');
  }
  if (!config.auth.appJwtSecret) {
    throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE, 'APP_JWT_SECRET is not configured.');
  }

  const session = await signAppJwt(DEMO_IDENTITY);
  return {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    user: toAuthUser(DEMO_IDENTITY),
  };
}

/**
 * Accepts either a Google ID token (exchanged for an app JWT) or a Supabase
 * access token (returned as-is, already verifiable by this API).
 */
export async function exchangeSessionToken(idToken: string): Promise<AuthSession> {
  let issuer = '';
  try {
    issuer = decodeJwt(idToken).iss ?? '';
  } catch {
    issuer = '';
  }

  if (issuer.includes('supabase')) {
    const context = await verifySupabaseToken(idToken);
    const exp = decodeJwt(idToken).exp;
    return {
      accessToken: idToken,
      expiresAt: new Date((exp ?? 0) * 1_000).toISOString(),
      user: toAuthUser(context),
    };
  }

  const context = await verifyGoogleIdToken(idToken);
  const session = await signAppJwt(context);
  return {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    user: toAuthUser(context),
  };
}
