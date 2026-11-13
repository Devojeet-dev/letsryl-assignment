export const UPLOAD_LIMITS = {
  MIN_FILES_PER_BATCH: 1,
  MAX_FILES_PER_BATCH: 20,
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  MAX_BATCH_BYTES: 100 * 1024 * 1024,
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

export const ALLOWED_CSV_MIME_TYPES = UPLOAD_LIMITS.ALLOWED_MIME_TYPES;

export type UploadLimits = typeof UPLOAD_LIMITS;

export interface UploadFileMeta {
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadLimitViolation {
  code: string;
  message: string;
  details?: unknown;
}

const hasAllowedExtension = (originalName: string): boolean => {
  const name = originalName.toLowerCase();
  return UPLOAD_LIMITS.ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
};

const hasAllowedMimeType = (mimeType: string): boolean => {
  const type = mimeType.trim().toLowerCase();
  if (type.length === 0) {
    return true;
  }
  return (UPLOAD_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(type);
};

export function validateUploadLimits(files: readonly UploadFileMeta[]): UploadLimitViolation[] {
  const violations: UploadLimitViolation[] = [];

  if (files.length < UPLOAD_LIMITS.MIN_FILES_PER_BATCH) {
    violations.push({ code: 'EMPTY_BATCH', message: 'Upload at least one CSV file.' });
  }
  if (files.length > UPLOAD_LIMITS.MAX_FILES_PER_BATCH) {
    violations.push({
      code: 'TOO_MANY_FILES',
      message: `A batch accepts at most ${UPLOAD_LIMITS.MAX_FILES_PER_BATCH} files.`,
      details: { maxFiles: UPLOAD_LIMITS.MAX_FILES_PER_BATCH },
    });
  }

  const oversized = files.filter((file) => file.sizeBytes > UPLOAD_LIMITS.MAX_FILE_BYTES);
  if (oversized.length > 0) {
    violations.push({
      code: 'FILE_TOO_LARGE',
      message: `Each file must be at most ${UPLOAD_LIMITS.MAX_FILE_BYTES} bytes.`,
      details: { files: oversized.map((file) => file.originalName) },
    });
  }

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  if (totalBytes > UPLOAD_LIMITS.MAX_BATCH_BYTES) {
    violations.push({
      code: 'BATCH_TOO_LARGE',
      message: `A batch must be at most ${UPLOAD_LIMITS.MAX_BATCH_BYTES} bytes.`,
      details: { totalBytes, maxBatchBytes: UPLOAD_LIMITS.MAX_BATCH_BYTES },
    });
  }

  const unsupported = files.filter(
    (file) => !hasAllowedExtension(file.originalName) || !hasAllowedMimeType(file.mimeType),
  );
  if (unsupported.length > 0) {
    violations.push({
      code: 'UNSUPPORTED_FILE_TYPE',
      message: `Only ${UPLOAD_LIMITS.ALLOWED_EXTENSIONS.join(', ')} files are supported.`,
      details: { files: unsupported.map((file) => file.originalName) },
    });
  }

  return violations;
}
