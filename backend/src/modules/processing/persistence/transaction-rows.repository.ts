import { Types, type FilterQuery } from 'mongoose';
import { dayKeyToRangeEnd, dayKeyToRangeStart, toUtcDayKey } from '../../../shared';
import type { DashboardQuery } from '../../../shared';
import type { ValidatedRow } from '../validation/row.validator';
import { TransactionRowModel } from './transaction-row.model';

const INSERT_CHUNK_SIZE = 500;

/** Replacement is idempotent so a BullMQ retry cannot duplicate rows. */
export async function replaceFileRows(
  batchId: string,
  fileId: string,
  ownerId: string,
  rows: readonly ValidatedRow[],
): Promise<void> {
  await TransactionRowModel.deleteMany({ fileId: new Types.ObjectId(fileId) });
  if (rows.length === 0) {
    return;
  }

  const batchObjectId = new Types.ObjectId(batchId);
  const fileObjectId = new Types.ObjectId(fileId);

  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE).map((row) => ({
      batchId: batchObjectId,
      fileId: fileObjectId,
      ownerId,
      rowNumber: row.rowNumber,
      transactionId: row.transactionId,
      customerId: row.customerId,
      branchId: row.branchId,
      transactionType: row.transactionType,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      processingTimeMs: row.processingTimeMs,
      riskScore: row.riskScore,
      transactionDate: row.transactionDate,
    }));
    await TransactionRowModel.insertMany(chunk, { ordered: true });
  }
}

function buildFilter(batchId: string, filters: DashboardQuery): FilterQuery<unknown> {
  const query: FilterQuery<unknown> = { batchId: new Types.ObjectId(batchId) };

  if (filters.fileId) {
    query.fileId = new Types.ObjectId(filters.fileId);
  }
  if (filters.branchId) {
    query.branchId = filters.branchId;
  }
  if (filters.transactionType) {
    query.transactionType = filters.transactionType;
  }
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = dayKeyToRangeStart(filters.from);
    if (filters.to) range.$lte = dayKeyToRangeEnd(filters.to);
    query.transactionDate = range;
  }

  return query;
}

export async function fetchBatchRows(
  batchId: string,
  filters: DashboardQuery,
): Promise<ValidatedRow[]> {
  const docs = await TransactionRowModel.find(buildFilter(batchId, filters))
    .sort({ rowNumber: 1 })
    .lean();

  return docs.map((doc) => ({
    rowNumber: doc.rowNumber,
    transactionId: doc.transactionId,
    customerId: doc.customerId,
    branchId: doc.branchId,
    transactionType: doc.transactionType,
    amount: doc.amount ?? null,
    balanceAfter: doc.balanceAfter ?? null,
    processingTimeMs: doc.processingTimeMs ?? null,
    riskScore: doc.riskScore ?? null,
    transactionDate: doc.transactionDate ?? null,
    transactionDayKey: doc.transactionDate ? toUtcDayKey(doc.transactionDate) : null,
  }));
}

export async function countRowsForBatch(batchId: string): Promise<number> {
  return TransactionRowModel.countDocuments({ batchId: new Types.ObjectId(batchId) });
}
