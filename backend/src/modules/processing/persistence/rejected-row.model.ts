import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

/** Capped sample of rejected rows, retained for dashboard/report drill-down. */
const rejectedRowSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    ownerId: { type: String, required: true },
    rowNumber: { type: Number, required: true },
    reason: { type: String, required: true },
    transactionId: { type: String, default: null },
  },
  { timestamps: false, versionKey: false },
);

rejectedRowSchema.index({ batchId: 1, fileId: 1 });

export type RejectedRowDoc = HydratedDocumentFromSchema<typeof rejectedRowSchema>;
export const RejectedRowModel = model('RejectedRow', rejectedRowSchema);
