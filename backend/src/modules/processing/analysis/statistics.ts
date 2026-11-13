import { roundTo } from '../../../shared';

export interface NumericSummary {
  count: number;
  total: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  /** Sample standard deviation (n − 1); documented in docs/analysis-spec.md. */
  stdDev: number;
  p25: number;
  p75: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outlierCount: number;
  outlierPercentage: number;
  outliers: number[];
}

/** Linear-interpolation percentile, equivalent to Python's `method="inclusive"`. */
export function quantile(sortedValues: readonly number[], percentile: number): number | null {
  const n = sortedValues.length;
  if (n === 0) {
    return null;
  }
  if (n === 1) {
    return sortedValues[0] ?? null;
  }

  const position = ((n - 1) * percentile) / 100;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];

  if (lower === undefined || upper === undefined) {
    return null;
  }
  if (lowerIndex === upperIndex) {
    return lower;
  }
  return lower + (upper - lower) * (position - lowerIndex);
}

export function summarize(values: readonly number[], iqrMultiplier = 1.5): NumericSummary | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const mean = total / count;

  const variance =
    count > 1
      ? sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1)
      : 0;
  const stdDev = Math.sqrt(variance);

  const median = quantile(sorted, 50) ?? 0;
  const p25 = quantile(sorted, 25) ?? 0;
  const p75 = quantile(sorted, 75) ?? 0;
  const iqr = p75 - p25;
  const lowerFence = p25 - iqrMultiplier * iqr;
  const upperFence = p75 + iqrMultiplier * iqr;

  const outliers = sorted.filter((value) => value < lowerFence || value > upperFence);

  return {
    count,
    total: roundTo(total, 2),
    mean: roundTo(mean, 2),
    median: roundTo(median, 2),
    min: roundTo(sorted[0] ?? 0, 2),
    max: roundTo(sorted[count - 1] ?? 0, 2),
    stdDev: roundTo(stdDev, 2),
    p25: roundTo(p25, 2),
    p75: roundTo(p75, 2),
    iqr: roundTo(iqr, 2),
    lowerFence: roundTo(lowerFence, 2),
    upperFence: roundTo(upperFence, 2),
    outlierCount: outliers.length,
    outlierPercentage: roundTo((outliers.length / count) * 100, 2),
    outliers: outliers.map((value) => roundTo(value, 2)),
  };
}
