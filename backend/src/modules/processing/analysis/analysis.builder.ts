import {
  ERROR_CODES,
  NUMERIC_COLUMNS,
  type DataQualityReport,
  type FileAnalysis,
  type FieldStatistics,
} from '../../../shared';
import { FileProcessingError } from '../errors/processing-error';
import type { ValidatedRow } from '../validation/row.validator';
import { dailyAggregates, groupAggregates, highRiskSummary, largestTransaction } from './aggregates';
import { analyzeField } from './field.analyzer';

export interface BuildAnalysisInput {
  fileId: string;
  fileName: string;
  rows: readonly ValidatedRow[];
  dataQuality: DataQualityReport;
}

export function buildFileAnalysis(input: BuildAnalysisInput): FileAnalysis {
  const { rows, dataQuality } = input;

  if (rows.length === 0) {
    throw new FileProcessingError(ERROR_CODES.NO_VALID_RECORDS, 'The file has no valid rows.');
  }

  const fields: FieldStatistics[] = NUMERIC_COLUMNS.map((column) => {
    const values = rows.map((row) => {
      switch (column) {
        case 'amount':
          return row.amount;
        case 'balance_after':
          return row.balanceAfter;
        case 'processing_time_ms':
          return row.processingTimeMs;
        case 'risk_score':
          return row.riskScore;
      }
    });

    return analyzeField({
      field: column,
      values,
      missingCount: dataQuality.missingNumericCounts[column] ?? 0,
      invalidCount: dataQuality.invalidNumericCounts[column] ?? 0,
    });
  });

  return {
    fileId: input.fileId,
    fileName: input.fileName,
    rowCount: dataQuality.totalRows,
    validRowCount: rows.length,
    rejectedRowCount: dataQuality.rejectedRows,
    fields,
    dataQuality,
    byTransactionType: groupAggregates(rows, (row) => row.transactionType, (row) => row.amount),
    byBranch: groupAggregates(rows, (row) => row.branchId, (row) => row.amount),
    daily: dailyAggregates(rows),
    largestTransaction: largestTransaction(rows),
    highRisk: highRiskSummary(rows),
    generatedAt: new Date().toISOString(),
  };
}
