import { describe, expect, it } from 'vitest';
import { ANALYSIS_CONSTANTS, type DataQualityReport } from '../../../shared';
import { analyzeField } from '../analysis/field.analyzer';
import { buildHistogram } from '../analysis/histogram.builder';
import { analyzeRowFields } from '../analysis/row-fields';
import type { ValidatedRow } from '../validation/row.validator';

function validatedRow(overrides: Partial<ValidatedRow> = {}): ValidatedRow {
  return {
    rowNumber: 2,
    transactionId: 'TXN-1',
    customerId: 'CUST-1',
    branchId: 'BLR001',
    transactionType: 'UPI_PAYMENT',
    amount: 100,
    balanceAfter: 1000,
    processingTimeMs: 10,
    riskScore: 40,
    transactionDate: new Date('2026-01-02T00:00:00.000Z'),
    transactionDayKey: '2026-01-02',
    ...overrides,
  };
}

describe('analyzeField', () => {
  it('computes statistics from valid values only', () => {
    const field = analyzeField({
      field: 'amount',
      values: [10, null, 20, 30],
      missingCount: 1,
      invalidCount: 2,
    });

    expect(field.noValidValues).toBe(false);
    expect(field.validCount).toBe(3);
    expect(field.missingCount).toBe(1);
    expect(field.invalidCount).toBe(2);
    expect(field.mean).toBe(20);
    expect(field.median).toBe(20);
    expect(field.total).toBe(60);
    expect(field.histogram.length).toBeGreaterThan(0);
  });

  it('returns N/A metrics when a column has no valid values', () => {
    const field = analyzeField({
      field: 'risk_score',
      values: [null, null],
      missingCount: 2,
      invalidCount: 0,
    });

    expect(field).toMatchObject({
      noValidValues: true,
      validCount: 0,
      total: null,
      mean: null,
      median: null,
      min: null,
      max: null,
      stdDev: null,
      p25: null,
      p75: null,
      iqr: null,
      outlierCount: 0,
      outlierPercentage: null,
      histogram: [],
    });
  });
});

describe('buildHistogram', () => {
  it('produces fixed-width bins whose counts sum to the sample size', () => {
    const values = Array.from({ length: 100 }, (_unused, index) => index + 1);
    const bins = buildHistogram(values);

    expect(bins).toHaveLength(ANALYSIS_CONSTANTS.HISTOGRAM_BIN_COUNT);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(values.length);
    expect(bins[0]?.lowerBound).toBe(1);
    expect(bins[bins.length - 1]?.upperBound).toBe(100);
  });

  it('collapses a degenerate range into a single bin', () => {
    expect(buildHistogram([5, 5, 5])).toEqual([
      { lowerBound: 5, upperBound: 5, count: 3 },
    ]);
    expect(buildHistogram([])).toEqual([]);
  });
});

describe('analyzeRowFields', () => {
  const quality: DataQualityReport = {
    totalRows: 3,
    validRows: 2,
    rejectedRows: 1,
    missingRequiredFieldCounts: {},
    missingNumericCounts: {
      amount: 1,
      balance_after: 0,
      processing_time_ms: 0,
      risk_score: 0,
    },
    invalidNumericCounts: {
      amount: 0,
      balance_after: 0,
      processing_time_ms: 0,
      risk_score: 1,
    },
    invalidNumericSamples: {
      amount: [],
      balance_after: [],
      processing_time_ms: [],
      risk_score: [4],
    },
    invalidDateCount: 0,
    invalidDateSamples: [],
    duplicateTransactionIdCount: 0,
    duplicateGroups: [],
    rejectedRowSamples: [],
    missingHeaders: [],
  };

  it('emits one entry per numeric column in stable order', () => {
    const fields = analyzeRowFields(
      [
        validatedRow({ amount: 100, riskScore: 40 }),
        validatedRow({ rowNumber: 3, amount: 300, riskScore: 90 }),
      ],
      quality,
    );

    expect(fields.map((field) => field.field)).toEqual([
      'amount',
      'balance_after',
      'processing_time_ms',
      'risk_score',
    ]);
  });

  it('uses persisted quality counters for missing and invalid values', () => {
    const fields = analyzeRowFields([validatedRow({ amount: 100 })], quality);
    const amount = fields.find((field) => field.field === 'amount');
    const risk = fields.find((field) => field.field === 'risk_score');

    expect(amount?.missingCount).toBe(1);
    expect(risk?.invalidCount).toBe(1);
  });
});
