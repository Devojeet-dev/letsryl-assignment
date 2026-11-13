import { z } from 'zod';

/**
 * Optional integrations are usually provisioned as empty strings by compose
 * (`${VAR:-}`). Treat blank as "not configured" so boot does not abort.
 */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    schema.optional(),
  );
}

const csvOrigins = z
  .string()
  .default('http://localhost:5173')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

/**
 * Runtime environment contract. Parsed once at boot; failure aborts start-up
 * instead of surfacing as a confusing 500 later.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  SERVICE_VERSION: z.string().default('0.1.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().default('bfdp'),
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required')
    .transform((val) => {
      let cleaned = val.trim().replace(/^["']|["']$/g, '');
      const lastRedisIdx = Math.max(cleaned.lastIndexOf('rediss://'), cleaned.lastIndexOf('redis://'));
      if (lastRedisIdx > 0) {
        cleaned = cleaned.slice(lastRedisIdx);
      }
      if (val.includes('--tls') && cleaned.startsWith('redis://')) {
        cleaned = 'rediss://' + cleaned.slice('redis://'.length);
      }
      return cleaned;
    }),

  SUPABASE_URL: optional(z.string().url()),
  SUPABASE_JWKS_URL: optional(z.string().url()),
  SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
  SUPABASE_JWT_ISSUER: optional(z.string().min(1)),

  GOOGLE_CLIENT_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  APP_JWT_SECRET: optional(z.string().min(32, 'APP_JWT_SECRET must be at least 32 characters')),
  APP_JWT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  /**
   * Issues a session for a fixed demo identity without a federated login.
   * Opt-in only; see docs/security.md before enabling it anywhere public.
   */
  DEMO_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  CORS_ORIGINS: csvOrigins,

  UPLOAD_BUCKET: z.string().default('uploads'),
  REPORT_BUCKET: z.string().default('reports'),
  REPORT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),

  QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
  QUEUE_MAX_DEPTH: z.coerce.number().int().positive().default(5_000),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;
