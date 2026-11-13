import multer from 'multer';
import {
  AppError,
  UPLOAD_LIMITS,
  validateUploadLimits,
  type UploadFileMeta,
} from '../../../shared';

/**
 * Files are buffered in memory only up to the per-file cap; the aggregate cap
 * is enforced before enqueue. 20 × 10 MB is the absolute worst case.
 */
const storage = multer.memoryStorage();

/**
 * Multer only knows about byte sizes and field counts. Anything that needs the
 * file name or the declared media type is decided by `validateUploadLimits`,
 * which the browser also runs so the user sees the same verdict before upload.
 */
export const uploadBatchFiles = multer({
  storage,
  limits: {
    fileSize: UPLOAD_LIMITS.MAX_FILE_BYTES,
    files: UPLOAD_LIMITS.MAX_FILES_PER_BATCH,
    fields: 10,
    parts: UPLOAD_LIMITS.MAX_FILES_PER_BATCH + 10,
  },
}).array('files', UPLOAD_LIMITS.MAX_FILES_PER_BATCH);

const toUploadFileMeta = (file: Express.Multer.File): UploadFileMeta => ({
  originalName: file.originalname,
  sizeBytes: file.size,
  mimeType: file.mimetype,
});

/**
 * Authoritative upload guard, run after multer has buffered the parts and
 * before anything is written to GridFS or enqueued. The first violation is
 * surfaced as a domain error so the response carries a stable code
 * (`EMPTY_BATCH`, `TOO_MANY_FILES`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`,
 * `BATCH_TOO_LARGE`) instead of a raw multer message.
 */
export function assertUploadConstraints(files: readonly Express.Multer.File[]): void {
  const [violation] = validateUploadLimits(files.map(toUploadFileMeta));
  if (!violation) {
    return;
  }
  throw new AppError(violation.code, violation.message, { details: violation.details });
}
