/**
 * Upload guardrails. These are enforced server-side (authoritative) and mirrored
 * client-side for instant feedback. Production-safe values are documented in
 * docs/limits.md; the reference dataset (1,000 rows/file) sits far below the cap.
 */
export const UPLOAD_LIMITS = {
  MIN_FILES_PER_BATCH: 1,
  MAX_FILES_PER_BATCH: 20,
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  MAX_BATCH_BYTES: 100 * 1024 * 1024,
  /** Production-safe row ceiling per file; the supplied dataset uses 1,000. */
  MAX_ROWS_PER_FILE: 50_000,
  REFERENCE_DATASET_ROWS_PER_FILE: 1_000,
  ALLOWED_EXTENSIONS: ['.csv'] as const,
  ALLOWED_MIME_TYPES: [
    'text/csv',
    'text/plain',
    'application/csv',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ] as const,
} as const;

export type UploadLimits = typeof UPLOAD_LIMITS;
