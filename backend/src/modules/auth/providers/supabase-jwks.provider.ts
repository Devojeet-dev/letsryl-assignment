import { errors, jwtVerify } from 'jose';
import { AppError, ERROR_CODES } from '../../../shared';
import { config } from '../../../config';
import type { AuthContext } from '../auth.types';
import { getRemoteJwks } from '../tokens/jwks-cache';

interface SupabaseClaims {
  sub?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

function jwksUrl(): string {
  if (config.auth.supabaseJwksUrl) {
    return config.auth.supabaseJwksUrl;
  }
  if (!config.auth.supabaseUrl) {
    throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE);
  }
  return `${config.auth.supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
}

export async function verifySupabaseToken(token: string): Promise<AuthContext> {
  if (!config.auth.supabaseUrl && !config.auth.supabaseJwksUrl) {
    throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE);
  }

  try {
    const issuer = config.auth.issuer ?? `${config.auth.supabaseUrl?.replace(/\/$/, '')}/auth/v1`;
    const { payload } = await jwtVerify<SupabaseClaims>(token, getRemoteJwks(jwksUrl()), {
      audience: config.auth.audience,
      issuer,
    });

    const userId = payload.sub;
    const email = payload.email;
    if (!userId || !email) {
      throw new AppError(ERROR_CODES.TOKEN_INVALID);
    }

    return {
      userId,
      email,
      name: payload.user_metadata?.full_name ?? payload.user_metadata?.name ?? null,
      avatarUrl: payload.user_metadata?.avatar_url ?? payload.user_metadata?.picture ?? null,
      provider: 'supabase',
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
