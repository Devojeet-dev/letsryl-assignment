import { z } from 'zod';
import { UPLOAD_LIMITS } from '../constants/limits';
import { ERROR_CODES, type ErrorCode } from '../errors/error-codes';

export const uploadFileMetaSchema = z.object({
  originalName: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
});

export type UploadFileMeta = z.infer<typeof uploadFileMetaSchema>;

export const batchUploadMetaSchema = z.object({
  files: z.array(uploadFileMetaSchema).min(1).max(UPLOAD_LIMITS.MAX_FILES_PER_BATCH),
});

export interface UploadLimitViolation {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

const hasAllowedExtension = (originalName: string): boolean => {
  const name = originalName.toLowerCase();
  return UPLOAD_LIMITS.ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
};

/**
 * Browsers commonly send an empty type or a generic binary type for CSVs, so
 * the MIME header is advisory: an absent type is accepted, a contradicting one
 * is not. The extension remains authoritative.
 */
const hasAllowedMimeType = (mimeType: string): boolean => {
  const type = mimeType.trim().toLowerCase();
  if (type.length === 0) {
    return true;
  }
  return (UPLOAD_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(type);
};

/**
 * Pure validation shared by the browser pre-check and the server guard.
 * Format/size/count only — content validation happens per file in the worker.
 */
export function validateUploadLimits(files: readonly UploadFileMeta[]): UploadLimitViolation[] {
  const violations: UploadLimitViolation[] = [];

  if (files.length < UPLOAD_LIMITS.MIN_FILES_PER_BATCH) {
    violations.push({ code: ERROR_CODES.EMPTY_BATCH, message: 'Upload at least one CSV file.' });
  }
  if (files.length > UPLOAD_LIMITS.MAX_FILES_PER_BATCH) {
    violations.push({
      code: ERROR_CODES.TOO_MANY_FILES,
      message: `A batch accepts at most ${UPLOAD_LIMITS.MAX_FILES_PER_BATCH} files.`,
      details: { maxFiles: UPLOAD_LIMITS.MAX_FILES_PER_BATCH },
    });
  }

  const oversized = files.filter((file) => file.sizeBytes > UPLOAD_LIMITS.MAX_FILE_BYTES);
  if (oversized.length > 0) {
    violations.push({
      code: ERROR_CODES.FILE_TOO_LARGE,
      message: `Each file must be at most ${UPLOAD_LIMITS.MAX_FILE_BYTES} bytes.`,
      details: { files: oversized.map((file) => file.originalName) },
    });
  }

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  if (totalBytes > UPLOAD_LIMITS.MAX_BATCH_BYTES) {
    violations.push({
      code: ERROR_CODES.BATCH_TOO_LARGE,
      message: `A batch must be at most ${UPLOAD_LIMITS.MAX_BATCH_BYTES} bytes.`,
      details: { totalBytes, maxBatchBytes: UPLOAD_LIMITS.MAX_BATCH_BYTES },
    });
  }

  const unsupported = files.filter(
    (file) => !hasAllowedExtension(file.originalName) || !hasAllowedMimeType(file.mimeType),
  );
  if (unsupported.length > 0) {
    violations.push({
      code: ERROR_CODES.UNSUPPORTED_FILE_TYPE,
      message: `Only ${UPLOAD_LIMITS.ALLOWED_EXTENSIONS.join(', ')} files are supported.`,
      details: { files: unsupported.map((file) => file.originalName) },
    });
  }

  return violations;
}
