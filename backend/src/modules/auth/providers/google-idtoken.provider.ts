import { errors, jwtVerify } from 'jose';
import { AppError, ERROR_CODES } from '../../../shared';
import { config } from '../../../config';
import type { AuthContext } from '../auth.types';
import { getRemoteJwks } from '../tokens/jwks-cache';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

interface GoogleClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Verifies a Google ID token directly against Google's public certs, so the
 * backend never trusts an unverified `sub` sent by the browser.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<AuthContext> {
  if (config.auth.googleClientIds.length === 0) {
    throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE);
  }

  try {
    const { payload } = await jwtVerify<GoogleClaims>(idToken, getRemoteJwks(GOOGLE_JWKS_URL), {
      audience: [...config.auth.googleClientIds],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });

    if (!payload.sub || !payload.email || payload.email_verified === false) {
      throw new AppError(ERROR_CODES.TOKEN_INVALID);
    }

    return {
      userId: `google:${payload.sub}`,
      email: payload.email,
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
      provider: 'google',
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof errors.JWTExpired) {
      throw new AppError(ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AppError(ERROR_CODES.TOKEN_INVALID);
  }
}
