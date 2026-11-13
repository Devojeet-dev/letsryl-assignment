import { errors, SignJWT, jwtVerify } from 'jose';
import { AppError, ERROR_CODES } from '../../../shared';
import { config } from '../../../config';
import type { AuthContext } from '../auth.types';

const ISSUER = 'bfdp-api';
const AUDIENCE = 'bfdp-app';

interface AppClaims {
  sub?: string;
  email?: string;
  name?: string | null;
  picture?: string | null;
  provider?: string;
}

function secretKey(): Uint8Array {
  if (!config.auth.appJwtSecret) {
    throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE);
  }
  return new TextEncoder().encode(config.auth.appJwtSecret);
}

export interface SignedSession {
  accessToken: string;
  expiresAt: string;
}

/** Exchanges a verified federated identity for a short-lived app JWT. */
export async function signAppJwt(context: AuthContext): Promise<SignedSession> {
  const expiresAt = new Date(Date.now() + config.auth.appJwtTtlSeconds * 1_000);

  const accessToken = await new SignJWT({
    email: context.email,
    name: context.name,
    picture: context.avatarUrl,
    provider: context.provider,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(context.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
    .sign(secretKey());

  return { accessToken, expiresAt: expiresAt.toISOString() };
}

export async function verifyAppJwt(token: string): Promise<AuthContext> {
  try {
    const { payload } = await jwtVerify<AppClaims>(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (!payload.sub || !payload.email) {
      throw new AppError(ERROR_CODES.TOKEN_INVALID);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
      provider: 'app',
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
