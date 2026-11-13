import {
  ANALYSIS_CONSTANTS,
  MANDATORY_TEXT_COLUMNS,
  NUMERIC_COLUMNS,
  parseIsoDateTime,
  toUtcDayKey,
  type DataQualityReport,
  type DuplicateIdGroup,
  type NumericColumn,
  type RejectedRow,
} from '../../../shared';
import type { RawCsvRow } from '../csv/csv.parser';

export interface ValidatedRow {
  rowNumber: number;
  transactionId: string;
  customerId: string;
  branchId: string;
  transactionType: string;
  amount: number | null;
  balanceAfter: number | null;
  processingTimeMs: number | null;
  riskScore: number | null;
  transactionDate: Date | null;
  transactionDayKey: string | null;
}

export interface ValidationOutcome {
  rows: ValidatedRow[];
  dataQuality: DataQualityReport;
  totalRows: number;
  rejectedRows: number;
}

const STRICT_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** Strict numeric parsing: no thousands separators, no hex, no Infinity. */
export function parseStrictNumber(raw: string | undefined): { value: number | null; state: 'missing' | 'invalid' | 'ok' } {
  const trimmed = (raw ?? '').trim();
  if (trimmed.length === 0) {
    return { value: null, state: 'missing' };
  }
  if (!STRICT_NUMBER.test(trimmed)) {
    return { value: null, state: 'invalid' };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { value: null, state: 'invalid' };
  }
  return { value, state: 'ok' };
}

function zeroRecord(keys: readonly string[]): Record<string, number> {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function emptySampleRecord(keys: readonly string[]): Record<string, number[]> {
  return Object.fromEntries(keys.map((key) => [key, [] as number[]]));
}

/**
 * Applies the assignment's row rules:
 *  - mandatory text fields blank        → row rejected, counted
 *  - numeric blank                      → missing count, excluded from that field
 *  - numeric non-numeric                → invalid count + sample rows, never coerced
 *  - invalid date                       → row kept for financial metrics, excluded
 *                                         from date-wise analysis and reported
 *  - duplicate transaction_id           → reported, rows never dropped
 */
export function validateRows(rawRows: readonly RawCsvRow[]): ValidationOutcome {
  const missingRequiredFieldCounts = zeroRecord(MANDATORY_TEXT_COLUMNS);
  const missingNumericCounts = zeroRecord(NUMERIC_COLUMNS);
  const invalidNumericCounts = zeroRecord(NUMERIC_COLUMNS);
  const invalidNumericSamples = emptySampleRecord(NUMERIC_COLUMNS);
  const invalidDateSamples: number[] = [];
  const rejectedRowSamples: RejectedRow[] = [];
  const duplicateRowsById = new Map<string, number[]>();

  const rows: ValidatedRow[] = [];
  let rejectedRows = 0;
  let invalidDateCount = 0;

  for (const raw of rawRows) {
    const cells = raw.cells;

    const transactionId = (cells.transaction_id ?? '').trim();
    if (transactionId.length > 0) {
      const occurrences = duplicateRowsById.get(transactionId) ?? [];
      occurrences.push(raw.rowNumber);
      duplicateRowsById.set(transactionId, occurrences);
    }

    const missingMandatory = MANDATORY_TEXT_COLUMNS.filter(
      (column) => (cells[column] ?? '').trim().length === 0,
    );

    const numeric = {} as Record<NumericColumn, number | null>;
    for (const column of NUMERIC_COLUMNS) {
      const parsed = parseStrictNumber(cells[column]);
      numeric[column] = parsed.value;
      if (parsed.state === 'missing') {
        missingNumericCounts[column] = (missingNumericCounts[column] ?? 0) + 1;
      } else if (parsed.state === 'invalid') {
        invalidNumericCounts[column] = (invalidNumericCounts[column] ?? 0) + 1;
        const samples = invalidNumericSamples[column] ?? [];
        if (samples.length < ANALYSIS_CONSTANTS.MAX_ERROR_SAMPLES) {
          samples.push(raw.rowNumber);
          invalidNumericSamples[column] = samples;
        }
      }
    }

    if (missingMandatory.length > 0) {
      rejectedRows += 1;
      for (const column of missingMandatory) {
        missingRequiredFieldCounts[column] = (missingRequiredFieldCounts[column] ?? 0) + 1;
      }
      if (rejectedRowSamples.length < ANALYSIS_CONSTANTS.MAX_REJECTED_ROWS_RETAINED) {
        rejectedRowSamples.push({
          rowNumber: raw.rowNumber,
          reason: `MISSING_REQUIRED_FIELD:${missingMandatory.join(',')}`,
          transactionId: transactionId.length > 0 ? transactionId : null,
        });
      }
      continue;
    }

    const parsedDate = parseIsoDateTime(cells.transaction_date ?? '');
    if (!parsedDate) {
      invalidDateCount += 1;
      if (invalidDateSamples.length < ANALYSIS_CONSTANTS.MAX_ERROR_SAMPLES) {
        invalidDateSamples.push(raw.rowNumber);
      }
    }

    rows.push({
      rowNumber: raw.rowNumber,
      transactionId,
      customerId: (cells.customer_id ?? '').trim(),
      branchId: (cells.branch_id ?? '').trim(),
      transactionType: (cells.transaction_type ?? '').trim(),
      amount: numeric.amount,
      balanceAfter: numeric.balance_after,
      processingTimeMs: numeric.processing_time_ms,
      riskScore: numeric.risk_score,
      transactionDate: parsedDate,
      transactionDayKey: parsedDate ? toUtcDayKey(parsedDate) : null,
    });
  }

  const duplicateGroups: DuplicateIdGroup[] = [...duplicateRowsById.entries()]
    .filter(([, occurrences]) => occurrences.length > 1)
    .map(([transactionId, rowNumbers]) => ({
      transactionId,
      occurrences: rowNumbers.length,
      rowNumbers: rowNumbers.slice(0, ANALYSIS_CONSTANTS.MAX_ERROR_SAMPLES),
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const duplicateTransactionIdCount = duplicateGroups.reduce(
    (sum, group) => sum + (group.occurrences - 1),
    0,
  );

  return {
    rows,
    totalRows: rawRows.length,
    rejectedRows,
    dataQuality: {
      totalRows: rawRows.length,
      validRows: rows.length,
      rejectedRows,
      missingRequiredFieldCounts,
      missingNumericCounts,
      invalidNumericCounts,
      invalidNumericSamples,
      invalidDateCount,
      invalidDateSamples,
      duplicateTransactionIdCount,
      duplicateGroups,
      rejectedRowSamples,
      missingHeaders: [],
    },
  };
}
