import { Types } from 'mongoose';
import { ANALYSIS_CONSTANTS, type DataQualityReport, type FileAnalysis } from '../../../shared';
import { FileAnalysisModel } from './file-analysis.model';

export async function saveFileAnalysis(
  batchId: string,
  fileId: string,
  ownerId: string,
  analysis: FileAnalysis,
): Promise<void> {
  await FileAnalysisModel.updateOne(
    { fileId: new Types.ObjectId(fileId) },
    {
      $set: {
        batchId: new Types.ObjectId(batchId),
        fileId: new Types.ObjectId(fileId),
        ownerId,
        analysis,
      },
    },
    { upsert: true },
  );
}

export async function findAnalysesForBatch(batchId: string): Promise<FileAnalysis[]> {
  const docs = await FileAnalysisModel.find({ batchId: new Types.ObjectId(batchId) }).sort({
    createdAt: 1,
  });
  return docs.map((doc) => doc.analysis as FileAnalysis);
}

export async function findAnalysisForFile(fileId: string): Promise<FileAnalysis | null> {
  const doc = await FileAnalysisModel.findOne({ fileId: new Types.ObjectId(fileId) });
  return doc ? (doc.analysis as FileAnalysis) : null;
}

const NUMERIC_KEYS = ['amount', 'balance_after', 'processing_time_ms', 'risk_score'] as const;
const MANDATORY_KEYS = [
  'transaction_id',
  'customer_id',
  'branch_id',
  'transaction_type',
  'transaction_date',
] as const;

/** Rollup used by the dashboard and the Excel summary sheet. */
export function mergeDataQuality(analyses: readonly FileAnalysis[]): DataQualityReport {
  const merged: DataQualityReport = {
    totalRows: 0,
    validRows: 0,
    rejectedRows: 0,
    missingRequiredFieldCounts: Object.fromEntries(MANDATORY_KEYS.map((key) => [key, 0])),
    missingNumericCounts: Object.fromEntries(NUMERIC_KEYS.map((key) => [key, 0])),
    invalidNumericCounts: Object.fromEntries(NUMERIC_KEYS.map((key) => [key, 0])),
    invalidNumericSamples: Object.fromEntries(NUMERIC_KEYS.map((key) => [key, []])),
    invalidDateCount: 0,
    invalidDateSamples: [],
    duplicateTransactionIdCount: 0,
    duplicateGroups: [],
    rejectedRowSamples: [],
    missingHeaders: [],
  };

  for (const analysis of analyses) {
    const quality = analysis.dataQuality;
    merged.totalRows += quality.totalRows;
    merged.validRows += quality.validRows;
    merged.rejectedRows += quality.rejectedRows;
    merged.invalidDateCount += quality.invalidDateCount;
    merged.duplicateTransactionIdCount += quality.duplicateTransactionIdCount;

    for (const [key, value] of Object.entries(quality.missingRequiredFieldCounts)) {
      merged.missingRequiredFieldCounts[key] = (merged.missingRequiredFieldCounts[key] ?? 0) + value;
    }
    for (const key of NUMERIC_KEYS) {
      merged.missingNumericCounts[key] =
        (merged.missingNumericCounts[key] ?? 0) + (quality.missingNumericCounts[key] ?? 0);
      merged.invalidNumericCounts[key] =
        (merged.invalidNumericCounts[key] ?? 0) + (quality.invalidNumericCounts[key] ?? 0);
      merged.invalidNumericSamples[key] = [
        ...(merged.invalidNumericSamples[key] ?? []),
        ...(quality.invalidNumericSamples[key] ?? []),
      ].slice(0, ANALYSIS_CONSTANTS.MAX_ERROR_SAMPLES);
    }

    merged.duplicateGroups.push(...quality.duplicateGroups);
    merged.rejectedRowSamples.push(...quality.rejectedRowSamples);
    merged.invalidDateSamples.push(...quality.invalidDateSamples);
  }

  merged.duplicateGroups = merged.duplicateGroups
    .slice(0, ANALYSIS_CONSTANTS.MAX_ERROR_SAMPLES * 5)
    .sort((a, b) => b.occurrences - a.occurrences);
  merged.rejectedRowSamples = merged.rejectedRowSamples.slice(
    0,
    ANALYSIS_CONSTANTS.MAX_REJECTED_ROWS_RETAINED,
  );
  merged.invalidDateSamples = merged.invalidDateSamples.slice(
    0,
    ANALYSIS_CONSTANTS.MAX_ERROR_SAMPLES,
  );

  return merged;
}
