import { describe, expect, it } from 'vitest';
import { parseStrictNumber, validateRows } from '../validation/row.validator';
import type { RawCsvRow } from '../csv/csv.parser';

const VALID_CELLS: Record<string, string> = {
  transaction_id: 'TXN-0001',
  customer_id: 'CUST-1',
  branch_id: 'BLR001',
  transaction_type: 'UPI_PAYMENT',
  amount: '100.50',
  balance_after: '1000',
  processing_time_ms: '12.5',
  risk_score: '42',
  transaction_date: '2026-01-02T03:04:05',
};

function row(rowNumber: number, overrides: Record<string, string> = {}): RawCsvRow {
  return { rowNumber, cells: { ...VALID_CELLS, ...overrides } };
}

describe('parseStrictNumber', () => {
  it('accepts plain decimals, signs and exponents', () => {
    expect(parseStrictNumber('12.5')).toEqual({ value: 12.5, state: 'ok' });
    expect(parseStrictNumber('-3')).toEqual({ value: -3, state: 'ok' });
    expect(parseStrictNumber('.5')).toEqual({ value: 0.5, state: 'ok' });
    expect(parseStrictNumber('1e3')).toEqual({ value: 1000, state: 'ok' });
  });

  it('reports blanks as missing', () => {
    expect(parseStrictNumber('   ')).toEqual({ value: null, state: 'missing' });
    expect(parseStrictNumber(undefined)).toEqual({ value: null, state: 'missing' });
  });

  it('rejects thousands separators, hex, NaN and Infinity', () => {
    for (const raw of ['1,234', '0x10', 'NaN', 'Infinity', '12px']) {
      expect(parseStrictNumber(raw)).toEqual({ value: null, state: 'invalid' });
    }
  });
});

describe('validateRows', () => {
  it('normalizes a clean row and derives its UTC day key', () => {
    const outcome = validateRows([row(2)]);

    expect(outcome.totalRows).toBe(1);
    expect(outcome.rejectedRows).toBe(0);
    expect(outcome.rows).toEqual([
      {
        rowNumber: 2,
        transactionId: 'TXN-0001',
        customerId: 'CUST-1',
        branchId: 'BLR001',
        transactionType: 'UPI_PAYMENT',
        amount: 100.5,
        balanceAfter: 1000,
        processingTimeMs: 12.5,
        riskScore: 42,
        transactionDate: new Date('2026-01-02T03:04:05.000Z'),
        transactionDayKey: '2026-01-02',
      },
    ]);
    expect(outcome.dataQuality.validRows).toBe(1);
  });

  it('rejects rows with blank mandatory text and reports the column', () => {
    const outcome = validateRows([row(5, { customer_id: '  ' })]);

    expect(outcome.rows).toHaveLength(0);
    expect(outcome.rejectedRows).toBe(1);
    expect(outcome.dataQuality.missingRequiredFieldCounts.customer_id).toBe(1);
    expect(outcome.dataQuality.rejectedRowSamples[0]).toEqual({
      rowNumber: 5,
      reason: 'MISSING_REQUIRED_FIELD:customer_id',
      transactionId: 'TXN-0001',
    });
  });

  it('keeps rows with blank or invalid numeric cells and records why', () => {
    const outcome = validateRows([
      row(3, { amount: '', risk_score: 'not-a-number' }),
    ]);

    expect(outcome.rows).toHaveLength(1);
    expect(outcome.rows[0]?.amount).toBeNull();
    expect(outcome.rows[0]?.riskScore).toBeNull();
    expect(outcome.dataQuality.missingNumericCounts.amount).toBe(1);
    expect(outcome.dataQuality.invalidNumericCounts.risk_score).toBe(1);
    expect(outcome.dataQuality.invalidNumericSamples.risk_score).toEqual([3]);
  });

  it('keeps rows with impossible dates for financial metrics but excludes them from daily keys', () => {
    const outcome = validateRows([
      row(4, { transaction_date: '2026-02-30T00:00:00' }),
    ]);

    expect(outcome.rows).toHaveLength(1);
    expect(outcome.rows[0]?.transactionDate).toBeNull();
    expect(outcome.rows[0]?.transactionDayKey).toBeNull();
    expect(outcome.dataQuality.invalidDateCount).toBe(1);
    expect(outcome.dataQuality.invalidDateSamples).toEqual([4]);
  });

  it('reports duplicate transaction ids without dropping rows', () => {
    const outcome = validateRows([
      row(2, { transaction_id: 'TXN-DUP' }),
      row(3, { transaction_id: 'TXN-DUP' }),
      row(4, { transaction_id: 'TXN-OTHER' }),
    ]);

    expect(outcome.rows).toHaveLength(3);
    expect(outcome.dataQuality.duplicateTransactionIdCount).toBe(1);
    expect(outcome.dataQuality.duplicateGroups).toEqual([
      { transactionId: 'TXN-DUP', occurrences: 2, rowNumbers: [2, 3] },
    ]);
  });

  it('caps retained invalid-field samples to keep documents bounded', () => {
    const many = Array.from({ length: 30 }, (_unused, index) =>
      row(index + 2, { amount: 'abc' }),
    );
    const outcome = validateRows(many);

    expect(outcome.dataQuality.invalidNumericCounts.amount).toBe(30);
    expect(outcome.dataQuality.invalidNumericSamples.amount).toHaveLength(20);
  });
});
