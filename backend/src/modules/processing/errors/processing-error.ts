import type { ErrorCode } from '../../../shared';

/** Terminal, file-scoped processing failure. Carries a client-safe code only. */
export class FileProcessingError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'FileProcessingError';
    this.code = code;
    this.details = details;
  }
}

export function isFileProcessingError(error: unknown): error is FileProcessingError {
  return error instanceof FileProcessingError;
}
