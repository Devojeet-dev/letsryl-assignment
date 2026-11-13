import { HTTP_STATUS_BY_CODE } from './http-status.map';
import { ERROR_CODES, type ErrorCode } from './error-codes';
import { SAFE_MESSAGES } from './messages';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface AppErrorOptions {
  details?: unknown;
  /** Preserve the original error for server-side logging only. */
  cause?: unknown;
}

/**
 * Domain error. `details` is client-visible and must contain no internals;
 * `cause` is logged server-side and never serialised.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(code: ErrorCode, message?: string, options: AppErrorOptions = {}) {
    super(message ?? SAFE_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
    this.details = options.details;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  toApiErrorBody(requestId: string): ApiErrorBody {
    const body: ApiErrorBody = {
      error: {
        code: this.code,
        message: this.message,
        requestId,
      },
    };
    if (this.details !== undefined) {
      body.error.details = this.details;
    }
    return body;
  }

  static validation(details?: unknown): AppError {
    return new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, { details });
  }

  static unauthorized(): AppError {
    return new AppError(ERROR_CODES.UNAUTHORIZED);
  }

  static forbidden(): AppError {
    return new AppError(ERROR_CODES.FORBIDDEN);
  }

  static notFound(code: ErrorCode = ERROR_CODES.NOT_FOUND): AppError {
    return new AppError(code);
  }

  static internal(cause?: unknown): AppError {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, undefined, { cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
