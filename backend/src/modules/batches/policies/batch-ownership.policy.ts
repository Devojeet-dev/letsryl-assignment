import { AppError, ERROR_CODES } from '../../../shared';
import type { BatchDoc } from '../models/batch.model';
import { BatchModel } from '../models/batch.model';

/**
 * Ownership is enforced as 404 rather than 403 so an attacker cannot probe
 * for the existence of another tenant's batch id.
 */
export async function findOwnedBatch(batchId: string, ownerId: string): Promise<BatchDoc> {
  const batch = await BatchModel.findOne({ _id: batchId, ownerId });
  if (!batch) {
    throw new AppError(ERROR_CODES.BATCH_NOT_FOUND);
  }
  return batch;
}

export function assertOwnership(batch: BatchDoc, ownerId: string): void {
  if (batch.ownerId !== ownerId) {
    throw new AppError(ERROR_CODES.BATCH_NOT_FOUND);
  }
}
