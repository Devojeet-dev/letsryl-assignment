import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { envSchema, type Env } from '../shared';

/** How far above the working directory a `.env` may live. */
const ENV_SEARCH_DEPTH = 2;

/**
 * Resolves the active `.env` configuration file path.
 *
 * When started from `backend/`, picks up `backend/.env`; when launched from the
 * repository root (e.g. by Docker or root scripts), it searches upwards to find
 * the nearest `.env`. The `ENV_FILE` environment variable explicitly overrides this.
 *
 * @returns Absolute path to the resolved `.env` file, or undefined if none found.
 */
function resolveEnvFile(): string | undefined {
  const explicit = process.env.ENV_FILE;
  if (explicit) {
    return path.resolve(explicit);
  }

  let directory = process.cwd();
  for (let depth = 0; depth <= ENV_SEARCH_DEPTH; depth += 1) {
    const candidate = path.join(directory, '.env');
    if (fs.existsSync(candidate) && fs.existsSync(path.join(directory, 'package.json'))) {
      return candidate;
    }
    directory = path.dirname(directory);
  }
  return undefined;
}

const envFile = resolveEnvFile();
if (envFile) {
  dotenv.config({ path: envFile });
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: misconfiguration must never surface as an opaque runtime 500.
  // Only field names are printed, never values (which may be secrets).
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n- ${issues.join('\n- ')}`);
  process.exit(1);
}

const env: Env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  version: env.SERVICE_VERSION,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  corsOrigins: env.CORS_ORIGINS,
  mongo: {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB,
  },
  redis: {
    url: env.REDIS_URL,
  },
  auth: {
    supabaseUrl: env.SUPABASE_URL,
    supabaseJwksUrl: env.SUPABASE_JWKS_URL,
    audience: env.SUPABASE_JWT_AUDIENCE,
    issuer: env.SUPABASE_JWT_ISSUER,
    googleClientIds: env.GOOGLE_CLIENT_IDS,
    appJwtSecret: env.APP_JWT_SECRET,
    appJwtTtlSeconds: env.APP_JWT_TTL_SECONDS,
    demoEnabled: env.DEMO_AUTH_ENABLED,
  },
  storage: {
    uploadBucket: env.UPLOAD_BUCKET,
    reportBucket: env.REPORT_BUCKET,
    reportCacheTtlSeconds: env.REPORT_CACHE_TTL_SECONDS,
  },
  queue: {
    concurrency: env.QUEUE_CONCURRENCY,
    maxDepth: env.QUEUE_MAX_DEPTH,
  },
  rateLimit: {
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
} as const;

export type AppConfig = typeof config;
