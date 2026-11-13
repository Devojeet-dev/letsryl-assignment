import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

interface CachedJwks {
  url: string;
  jwks: JWTVerifyGetKey;
}

let cached: CachedJwks | null = null;

/**
 * One remote JWKS handle per URL. jose caches keys internally and refreshes
 * on unknown `kid`, so key rotation is handled without a restart.
 */
export function getRemoteJwks(url: string): JWTVerifyGetKey {
  if (cached?.url === url) {
    return cached.jwks;
  }
  const jwks = createRemoteJWKSet(new URL(url), {
    cacheMaxAge: 10 * 60 * 1_000,
    cooldownDuration: 30_000,
    timeoutDuration: 5_000,
  });
  cached = { url, jwks };
  return jwks;
}
