import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';
import { BATCH_STATUSES, REPORT_STATUSES } from '../../../shared';

const countsSchema = new Schema(
  {
    totalFiles: { type: Number, default: 0 },
    queued: { type: Number, default: 0 },
    processing: { type: Number, default: 0 },
    retrying: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    retried: { type: Number, default: 0 },
  },
  { _id: false },
);

const batchSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    status: { type: String, enum: BATCH_STATUSES, default: 'QUEUED', index: true },
    fileCount: { type: Number, required: true },
    totalBytes: { type: Number, required: true },
    partialFailure: { type: Boolean, default: false },
    counts: { type: countsSchema, required: true },
    reportStatus: { type: String, enum: REPORT_STATUSES, default: 'NOT_REQUESTED' },
    reportFileId: { type: String, default: null },
    reportFileName: { type: String, default: null },
    reportSizeBytes: { type: Number, default: null },
    reportGeneratedAt: { type: Date, default: null },
    reportErrorCode: { type: String, default: null },
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

batchSchema.index({ ownerId: 1, createdAt: -1 });
batchSchema.index({ status: 1, createdAt: -1 });

export type BatchDoc = HydratedDocumentFromSchema<typeof batchSchema>;
export const BatchModel = model('Batch', batchSchema);
