import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

const batchFileSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    checksum: { type: String, required: true },
    gridfsId: { type: String, required: true },
    sequenceNumber: { type: Number, default: 0, index: true },
    rowCount: { type: Number, default: null },
    validRowCount: { type: Number, default: null },
    rejectedRowCount: { type: Number, default: null },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

batchFileSchema.index({ batchId: 1, sequenceNumber: 1 });
batchFileSchema.index({ batchId: 1, createdAt: 1 });

export type BatchFileDoc = HydratedDocumentFromSchema<typeof batchFileSchema>;
export const BatchFileModel = model('BatchFile', batchFileSchema);
