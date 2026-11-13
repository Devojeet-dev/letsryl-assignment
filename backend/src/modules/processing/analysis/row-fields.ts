import {
  NUMERIC_COLUMNS,
  type DataQualityReport,
  type FieldStatistics,
} from '../../../shared';
import type { ValidatedRow } from '../validation/row.validator';
import { analyzeField } from './field.analyzer';

/**
 * Computes statistics for the four numeric columns from normalized valid rows.
 * Missing/invalid counters come from the stored quality snapshot and describe
 * the unfiltered population; callers pass null once rows are narrowed.
 */
export function analyzeRowFields(
  rows: readonly ValidatedRow[],
  quality: DataQualityReport | null,
): FieldStatistics[] {
  return NUMERIC_COLUMNS.map((column) =>
    analyzeField({
      field: column,
      values: rows.map((row) => {
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
      }),
      missingCount: quality?.missingNumericCounts[column] ?? 0,
      invalidCount: quality?.invalidNumericCounts[column] ?? 0,
    }),
  );
}
