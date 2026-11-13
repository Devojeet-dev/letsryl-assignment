import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

/**
 * Normalized valid rows powering dashboard filters (branch/type/date range).
 * Rows are inserted in chunks; invalid rows never land here.
 */
const transactionRowSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    ownerId: { type: String, required: true },
    rowNumber: { type: Number, required: true },
    transactionId: { type: String, required: true },
    customerId: { type: String, required: true },
    branchId: { type: String, required: true },
    transactionType: { type: String, required: true },
    amount: { type: Number, default: null },
    balanceAfter: { type: Number, default: null },
    processingTimeMs: { type: Number, default: null },
    riskScore: { type: Number, default: null },
    transactionDate: { type: Date, default: null },
  },
  { timestamps: false, versionKey: false },
);

transactionRowSchema.index({ batchId: 1, branchId: 1 });
transactionRowSchema.index({ batchId: 1, transactionType: 1 });
transactionRowSchema.index({ batchId: 1, transactionDate: 1 });
transactionRowSchema.index({ batchId: 1, fileId: 1 });
transactionRowSchema.index({ batchId: 1, riskScore: -1 });
transactionRowSchema.index({ batchId: 1, amount: -1 });

export type TransactionRowDoc = HydratedDocumentFromSchema<typeof transactionRowSchema>;
export const TransactionRowModel = model('TransactionRow', transactionRowSchema);
