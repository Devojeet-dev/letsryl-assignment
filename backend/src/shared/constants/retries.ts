export const RETRY_POLICY = {
  /** Documented maximum attempts per file job (initial try + retries). */
  MAX_ATTEMPTS: 3,
  BACKOFF_BASE_MS: 2_000,
  BACKOFF_TYPE: 'exponential' as const,
  JOB_TIMEOUT_MS: 5 * 60 * 1_000,
  /** A job active longer than this is considered wedged and reaped. */
  STALLED_JOB_THRESHOLD_MS: 10 * 60 * 1_000,
  REPORT_MAX_ATTEMPTS: 2,
  /** Remove finished BullMQ jobs after this age to bound Redis memory. */
  JOB_RETENTION_MS: 24 * 60 * 60 * 1_000,
} as const;
