import { describe, expect, it } from 'vitest';
import { quantile, summarize } from '../analysis/statistics';

describe('quantile', () => {
  it('interpolates linearly between order statistics', () => {
    const values = [1, 2, 3, 4, 5];
    expect(quantile(values, 25)).toBe(2);
    expect(quantile(values, 50)).toBe(3);
    expect(quantile(values, 75)).toBe(4);
  });

  it('matches the inclusive method for even sample sizes', () => {
    const values = [1, 2, 3, 4];
    expect(quantile(values, 25)).toBe(1.75);
    expect(quantile(values, 50)).toBe(2.5);
    expect(quantile(values, 75)).toBe(3.25);
  });

  it('returns null for an empty sample and the value for a single observation', () => {
    expect(quantile([], 50)).toBeNull();
    expect(quantile([7], 90)).toBe(7);
  });
});

describe('summarize', () => {
  it('computes the full metric set for a clean sample', () => {
    const summary = summarize([1, 2, 3, 4, 5]);
    expect(summary).not.toBeNull();
    expect(summary).toMatchObject({
      count: 5,
      total: 15,
      mean: 3,
      median: 3,
      min: 1,
      max: 5,
      stdDev: 1.58,
      p25: 2,
      p75: 4,
      iqr: 2,
      lowerFence: -1,
      upperFence: 7,
      outlierCount: 0,
      outlierPercentage: 0,
    });
    expect(summary?.outliers).toEqual([]);
  });

  it('flags values beyond the 1.5 × IQR fences as outliers', () => {
    const summary = summarize([1, 2, 3, 4, 100]);
    expect(summary?.mean).toBe(22);
    expect(summary?.stdDev).toBe(43.62);
    expect(summary?.upperFence).toBe(7);
    expect(summary?.outlierCount).toBe(1);
    expect(summary?.outlierPercentage).toBe(20);
    expect(summary?.outliers).toEqual([100]);
  });

  it('honours a custom IQR multiplier', () => {
    const strict = summarize([1, 2, 3, 4, 100], 1);
    expect(strict?.upperFence).toBe(6);
    expect(strict?.outlierCount).toBe(1);
  });

  it('uses a zero standard deviation for a single observation', () => {
    const summary = summarize([42]);
    expect(summary).toMatchObject({
      count: 1,
      total: 42,
      mean: 42,
      median: 42,
      stdDev: 0,
      iqr: 0,
      outlierCount: 0,
    });
  });

  it('returns null when there is nothing to summarize', () => {
    expect(summarize([])).toBeNull();
  });
});
