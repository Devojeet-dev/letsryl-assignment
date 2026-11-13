import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

const idempotencyKeySchema = new Schema(
  {
    ownerId: { type: String, required: true },
    key: { type: String, required: true },
    requestHash: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

idempotencyKeySchema.index({ ownerId: 1, key: 1 }, { unique: true });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IdempotencyKeyDoc = HydratedDocumentFromSchema<typeof idempotencyKeySchema>;
export const IdempotencyKeyModel = model('IdempotencyKey', idempotencyKeySchema);
