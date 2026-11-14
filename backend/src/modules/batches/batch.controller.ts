import type { NextFunction, Request, Response } from 'express';
import {
  AppError,
  ERROR_CODES,
  idempotencyKeySchema,
  type ListBatchesQuery,
} from '../../shared';
import { createBatch, getBatchDetail, listBatches } from './batch.service';
import { assertUploadConstraints } from './policies/upload-limits.policy';

/**
 * Handles batch upload requests (`POST /batches`).
 *
 * Validates uploaded multipart files against upload limits (file count, size, extension),
 * enforces idempotency keys if provided, persists files to GridFS, and enqueues individual
 * file-processing jobs asynchronously.
 *
 * @param req - Express request containing uploaded files and auth context.
 * @param res - Express response returning HTTP 202 with the initial BatchDetail payload.
 * @param next - Express next error handler callback.
 */
export async function createBatchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED);
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    assertUploadConstraints(files);

    const rawKey = req.header('idempotency-key');
    const idempotencyKey = rawKey ? idempotencyKeySchema.parse(rawKey) : undefined;

    const { batch, replayed } = await createBatch({
      ownerId: req.auth.userId,
      files,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

    if (replayed) {
      res.setHeader('idempotent-replayed', 'true');
    }
    res.status(202).json(batch);
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the status, file details, and processing job states for a specific batch (`GET /batches/:id`).
 *
 * Enforces owner-scoped batch isolation, returning 404 NOT_FOUND if the batch does not exist or
 * belongs to another user.
 *
 * @param req - Express request containing batch ID parameter and auth context.
 * @param res - Express response returning HTTP 200 with complete BatchDetail.
 * @param next - Express next error handler callback.
 */
export async function getBatchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED);
    }
    const { id } = req.validated?.params as { id: string };
    const batch = await getBatchDetail(id, req.auth.userId);
    res.status(200).json(batch);
  } catch (error) {
    next(error);
  }
}

/**
 * Lists all batches belonging to the authenticated user with pagination and status filters (`GET /batches`).
 *
 * @param req - Express request with pagination query parameters (page, limit, status).
 * @param res - Express response returning HTTP 200 with paginated batch summaries.
 * @param next - Express next error handler callback.
 */
export async function listBatchesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED);
    }
    const query = req.validated?.query as ListBatchesQuery;
    const result = await listBatches(req.auth.userId, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
