import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

/** Per-file analysis snapshot; the workbook and dashboard read from here. */
const fileAnalysisSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'BatchFile', required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    analysis: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false },
);

export type FileAnalysisDoc = HydratedDocumentFromSchema<typeof fileAnalysisSchema>;
export const FileAnalysisModel = model('FileAnalysis', fileAnalysisSchema);
