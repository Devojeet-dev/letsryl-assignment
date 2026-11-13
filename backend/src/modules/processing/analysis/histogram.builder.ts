import { ANALYSIS_CONSTANTS, roundTo, type HistogramBin } from '../../../shared';

/**
 * Fixed-bin histogram with stable edges. Degenerate ranges (all values equal)
 * collapse to a single bin so charts never divide by zero.
 */
export function buildHistogram(values: readonly number[]): HistogramBin[] {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const bins = ANALYSIS_CONSTANTS.HISTOGRAM_BIN_COUNT;

  if (min === max) {
    return [
      {
        lowerBound: roundTo(min, 2),
        upperBound: roundTo(max, 2),
        count: values.length,
      },
    ];
  }

  const width = (max - min) / bins;
  const result: HistogramBin[] = Array.from({ length: bins }, (_unused, index) => ({
    lowerBound: roundTo(min + index * width, 2),
    upperBound: roundTo(min + (index + 1) * width, 2),
    count: 0,
  }));

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / width);
    const index = Math.min(Math.max(rawIndex, 0), bins - 1);
    const bin = result[index];
    if (bin) {
      bin.count += 1;
    }
  }

  return result;
}
