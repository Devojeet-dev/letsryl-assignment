import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';
import { JOB_STATUSES, RETRY_POLICY } from '../../../shared';

const batchJobSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'BatchFile', required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    jobId: { type: String, required: true },
    sequenceNumber: { type: Number, default: 0, index: true },
    status: { type: String, enum: JOB_STATUSES, default: 'QUEUED', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: RETRY_POLICY.MAX_ATTEMPTS },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    queuedAt: { type: Date, default: () => new Date() },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

batchJobSchema.index({ batchId: 1, sequenceNumber: 1 });
batchJobSchema.index({ batchId: 1, status: 1 });

export type BatchJobDoc = HydratedDocumentFromSchema<typeof batchJobSchema>;
export const BatchJobModel = model('BatchJob', batchJobSchema);
