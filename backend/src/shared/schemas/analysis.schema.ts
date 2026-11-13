import { z } from 'zod';

export const histogramBinSchema = z.object({
  lowerBound: z.number(),
  upperBound: z.number(),
  count: z.number().int().nonnegative(),
});

export const fieldStatisticsSchema = z.object({
  field: z.enum(['amount', 'balance_after', 'processing_time_ms', 'risk_score']),
  noValidValues: z.boolean(),
  validCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  invalidCount: z.number().int().nonnegative(),
  total: z.number().nullable(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  stdDev: z.number().nullable(),
  p25: z.number().nullable(),
  p75: z.number().nullable(),
  iqr: z.number().nullable(),
  lowerFence: z.number().nullable(),
  upperFence: z.number().nullable(),
  outlierCount: z.number().int().nonnegative(),
  outlierPercentage: z.number().nullable(),
  histogram: z.array(histogramBinSchema),
});

export const groupAggregateSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
  totalAmount: z.number(),
});

export const dailyAggregateSchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
  totalAmount: z.number(),
});
