import {
  ANALYSIS_CONSTANTS,
  type FieldStatistics,
  type NumericFieldKey,
} from '../../../shared';
import { buildHistogram } from './histogram.builder';
import { summarize } from './statistics';

export interface FieldInput {
  field: NumericFieldKey;
  values: readonly (number | null)[];
  missingCount: number;
  invalidCount: number;
}

/**
 * Produces the full metric set for one numeric column. When no valid values
 * exist every metric is null (rendered as N/A) — never zero.
 */
export function analyzeField(input: FieldInput): FieldStatistics {
  const validValues = input.values.filter((value): value is number => value !== null);
  const summary = summarize(validValues, ANALYSIS_CONSTANTS.IQR_MULTIPLIER);

  if (!summary) {
    return {
      field: input.field,
      noValidValues: true,
      validCount: 0,
      missingCount: input.missingCount,
      invalidCount: input.invalidCount,
      total: null,
      mean: null,
      median: null,
      min: null,
      max: null,
      stdDev: null,
      p25: null,
      p75: null,
      iqr: null,
      lowerFence: null,
      upperFence: null,
      outlierCount: 0,
      outlierPercentage: null,
      histogram: [],
    };
  }

  return {
    field: input.field,
    noValidValues: false,
    validCount: summary.count,
    missingCount: input.missingCount,
    invalidCount: input.invalidCount,
    total: summary.total,
    mean: summary.mean,
    median: summary.median,
    min: summary.min,
    max: summary.max,
    stdDev: summary.stdDev,
    p25: summary.p25,
    p75: summary.p75,
    iqr: summary.iqr,
    lowerFence: summary.lowerFence,
    upperFence: summary.upperFence,
    outlierCount: summary.outlierCount,
    outlierPercentage: summary.outlierPercentage,
    histogram: buildHistogram(validValues),
  };
}
