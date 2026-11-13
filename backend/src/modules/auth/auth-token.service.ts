import { decodeJwt } from 'jose';
import { AppError, ERROR_CODES } from '../../shared';
import { config } from '../../config';
import type { AuthContext } from './auth.types';
import { verifyAppJwt } from './tokens/app-jwt.service';
import { verifyGoogleIdToken } from './providers/google-idtoken.provider';
import { verifySupabaseToken } from './providers/supabase-jwks.provider';

/**
 * Single entry point used by the auth middleware. The issuer is used only for
 * routing to the correct verifier — signature validation always follows.
 */
export async function verifyAccessToken(token: string): Promise<AuthContext> {
  let issuer = '';
  try {
    issuer = decodeJwt(token).iss ?? '';
  } catch {
    throw new AppError(ERROR_CODES.TOKEN_INVALID);
  }

  if (issuer === 'bfdp-api') {
    return verifyAppJwt(token);
  }
  if (issuer === 'https://accounts.google.com' || issuer === 'accounts.google.com') {
    return verifyGoogleIdToken(token);
  }
  if (issuer.includes('supabase') || config.auth.supabaseUrl) {
    return verifySupabaseToken(token);
  }

  throw new AppError(ERROR_CODES.TOKEN_INVALID);
}
