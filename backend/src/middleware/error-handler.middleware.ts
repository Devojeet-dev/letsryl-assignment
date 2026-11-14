import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ERROR_CODES, isAppError, type ApiErrorBody } from '../shared';
import { logger } from '../observability/logger';
import { getRequestId } from '../observability/request-context';

interface MongoLikeError {
  name?: string;
  code?: number;
}

function mapMulterError(error: { name?: string; code?: string; field?: string }): AppError | null {
  if (error.name !== 'MulterError') {
    return null;
  }
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError(ERROR_CODES.FILE_TOO_LARGE);
    case 'LIMIT_FILE_COUNT':
      return new AppError(ERROR_CODES.TOO_MANY_FILES);
    // `.array('files', n)` reports both "too many parts" and "wrong field
    // name" as LIMIT_UNEXPECTED_FILE; only the former is a count violation.
    case 'LIMIT_UNEXPECTED_FILE':
      return error.field === 'files'
        ? new AppError(ERROR_CODES.TOO_MANY_FILES)
        : new AppError(ERROR_CODES.VALIDATION_ERROR, 'Expected the files to be uploaded in a field named "files".', {
            details: { field: error.field ?? null },
          });
    default:
      return new AppError(ERROR_CODES.VALIDATION_ERROR);
  }
}

function mapMongoError(error: MongoLikeError): AppError | null {
  if (error.name === 'ValidationError') {
    return new AppError(ERROR_CODES.VALIDATION_ERROR);
  }
  if (error.code === 11000) {
    return new AppError(ERROR_CODES.IDEMPOTENCY_CONFLICT);
  }
  return null;
}

/**
 * Centralized terminal Express error handling middleware.
 *
 * Normalizes all domain errors, Zod validation issues, Multer upload errors,
 * and uncaught exceptions into the standard JSON error envelope:
 * `{ error: { code, message, requestId, details? } }`.
 *
 * Ensures internal database messages and stack traces never leak over the wire.
 *
 * @param error - The caught error object.
 * @param req - The Express request context.
 * @param res - The Express response object.
 * @param _next - The Express next callback.
 */
export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = getRequestId() ?? req.requestId ?? 'req_unknown';

  let appError: AppError;
  if (isAppError(error)) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = AppError.validation(
      error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  } else if (error instanceof Error && error.name === 'MulterError') {
    appError = mapMulterError(error as { name?: string; code?: string; field?: string }) ?? AppError.internal(error);
  } else if (error instanceof Error) {
    appError = mapMongoError(error) ?? AppError.internal(error);
  } else {
    appError = AppError.internal(error);
  }

  if (appError.httpStatus >= 500) {
    logger.error(
      { err: error, requestId, path: req.path, method: req.method },
      'request.failed',
    );
  } else {
    logger.warn(
      { code: appError.code, requestId, path: req.path, method: req.method },
      'request.rejected',
    );
  }

  const body: ApiErrorBody = appError.toApiErrorBody(requestId);
  res.status(appError.httpStatus).json(body);
}