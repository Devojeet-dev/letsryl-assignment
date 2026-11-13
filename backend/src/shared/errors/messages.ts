import { ERROR_CODES, type ErrorCode } from './error-codes';

/**
 * User-facing copy only. Never includes stack traces, driver messages,
 * connection strings, tokens, or internal identifiers.
 */
export const SAFE_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  [ERROR_CODES.VALIDATION_ERROR]: 'The request did not pass validation.',
  [ERROR_CODES.UNAUTHORIZED]: 'Authentication is required.',
  [ERROR_CODES.TOKEN_INVALID]: 'Your session token is invalid. Please sign in again.',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ERROR_CODES.FORBIDDEN]: 'You do not have access to this resource.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.BATCH_NOT_FOUND]: 'The requested batch was not found.',
  [ERROR_CODES.JOB_NOT_FOUND]: 'The requested job was not found.',
  [ERROR_CODES.REPORT_NOT_READY]: 'The report is still being generated. Please retry shortly.',
  [ERROR_CODES.REPORT_GENERATION_FAILED]: 'The report could not be generated for this batch.',
  [ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED]: 'An Idempotency-Key header is required for this request.',
  [ERROR_CODES.IDEMPOTENCY_CONFLICT]:
    'This idempotency key was already used with a different request payload.',
  [ERROR_CODES.EMPTY_BATCH]: 'Upload at least one CSV file.',
  [ERROR_CODES.TOO_MANY_FILES]: 'Too many files in this batch.',
  [ERROR_CODES.FILE_TOO_LARGE]: 'One or more files exceed the per-file size limit.',
  [ERROR_CODES.BATCH_TOO_LARGE]: 'The batch exceeds the total upload size limit.',
  [ERROR_CODES.UNSUPPORTED_FILE_TYPE]: 'Only CSV files are supported.',
  [ERROR_CODES.FILE_UNREADABLE]: 'The file could not be read.',
  [ERROR_CODES.UNSUPPORTED_ENCODING]: 'The file encoding is not supported.',
  [ERROR_CODES.MISSING_REQUIRED_COLUMN]: 'The file is missing one or more required columns.',
  [ERROR_CODES.NO_VALID_RECORDS]: 'The file contains no valid transaction records.',
  [ERROR_CODES.QUEUE_UNAVAILABLE]:
    'We cannot accept new uploads right now. Please try again shortly.',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please slow down and retry shortly.',
  [ERROR_CODES.DEPENDENCY_UNAVAILABLE]: 'A required service is temporarily unavailable.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please retry shortly.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Something went wrong on our side. Please retry shortly.',
};
