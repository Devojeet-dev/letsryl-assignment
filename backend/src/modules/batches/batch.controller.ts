import type { NextFunction, Request, Response } from 'express';
import {
  AppError,
  ERROR_CODES,
  idempotencyKeySchema,
  type ListBatchesQuery,
} from '../../shared';
import { createBatch, getBatchDetail, listBatches } from './batch.service';
import { assertUploadConstraints } from './policies/upload-limits.policy';

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
