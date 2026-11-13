import { Types } from 'mongoose';
import { ANALYSIS_CONSTANTS } from '../../../shared';
import type { RejectedRow } from '../../../shared';
import { RejectedRowModel } from './rejected-row.model';

export async function replaceRejectedRows(
  batchId: string,
  fileId: string,
  ownerId: string,
  rows: readonly RejectedRow[],
): Promise<void> {
  const fileObjectId = new Types.ObjectId(fileId);
  await RejectedRowModel.deleteMany({ fileId: fileObjectId });

  const samples = rows.slice(0, ANALYSIS_CONSTANTS.MAX_REJECTED_ROWS_RETAINED);
  if (samples.length === 0) {
    return;
  }

  await RejectedRowModel.insertMany(
    samples.map((row) => ({
      batchId: new Types.ObjectId(batchId),
      fileId: fileObjectId,
      ownerId,
      rowNumber: row.rowNumber,
      reason: row.reason,
      transactionId: row.transactionId,
    })),
    { ordered: false },
  );
}

export async function findRejectedRowsForBatch(
  batchId: string,
): Promise<RejectedRow[]> {
  const docs = await RejectedRowModel.find({ batchId: new Types.ObjectId(batchId) })
    .sort({ fileId: 1, rowNumber: 1 })
    .lean();

  return docs.map((doc) => ({
    rowNumber: doc.rowNumber,
    reason: doc.reason,
    transactionId: doc.transactionId ?? null,
  }));
}
