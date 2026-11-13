import {
  ANALYSIS_CONSTANTS,
  roundMoney,
  type DailyAggregate,
  type GroupAggregate,
  type HighRiskSummary,
  type HighRiskTransaction,
  type LargestTransaction,
} from '../../../shared';
import type { ValidatedRow } from '../validation/row.validator';

export function groupAggregates(
  rows: readonly ValidatedRow[],
  keySelector: (row: ValidatedRow) => string,
  amountSelector: (row: ValidatedRow) => number | null,
): GroupAggregate[] {
  const groups = new Map<string, { count: number; totalAmount: number }>();

  for (const row of rows) {
    const key = keySelector(row);
    const current = groups.get(key) ?? { count: 0, totalAmount: 0 };
    current.count += 1;
    const amount = amountSelector(row);
    if (amount !== null) {
      current.totalAmount += amount;
    }
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      count: value.count,
      totalAmount: roundMoney(value.totalAmount),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function dailyAggregates(rows: readonly ValidatedRow[]): DailyAggregate[] {
  const days = new Map<string, { count: number; totalAmount: number }>();

  for (const row of rows) {
    if (!row.transactionDayKey) {
      continue;
    }
    const current = days.get(row.transactionDayKey) ?? { count: 0, totalAmount: 0 };
    current.count += 1;
    if (row.amount !== null) {
      current.totalAmount += row.amount;
    }
    days.set(row.transactionDayKey, current);
  }

  return [...days.entries()]
    .map(([date, value]) => ({
      date,
      count: value.count,
      totalAmount: roundMoney(value.totalAmount),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function largestTransaction(rows: readonly ValidatedRow[]): LargestTransaction | null {
  let largest: ValidatedRow | null = null;
  for (const row of rows) {
    if (row.amount === null) {
      continue;
    }
    if (!largest || row.amount > (largest.amount ?? Number.NEGATIVE_INFINITY)) {
      largest = row;
    }
  }

  if (!largest || largest.amount === null) {
    return null;
  }

  return {
    transactionId: largest.transactionId,
    amount: roundMoney(largest.amount),
    branchId: largest.branchId,
    transactionType: largest.transactionType,
    transactionDate: largest.transactionDayKey ?? '',
  };
}

export function highRiskSummary(rows: readonly ValidatedRow[]): HighRiskSummary {
  const threshold = ANALYSIS_CONSTANTS.HIGH_RISK_SCORE_THRESHOLD;
  const highRisk = rows.filter((row) => row.riskScore !== null && row.riskScore >= threshold);

  const topTransactions: HighRiskTransaction[] = [...highRisk]
    .sort(
      (a, b) =>
        (b.riskScore ?? 0) - (a.riskScore ?? 0) || (b.amount ?? 0) - (a.amount ?? 0),
    )
    .slice(0, ANALYSIS_CONSTANTS.TOP_N)
    .map((row) => ({
      transactionId: row.transactionId,
      amount: roundMoney(row.amount ?? 0),
      riskScore: row.riskScore ?? 0,
      branchId: row.branchId,
      transactionType: row.transactionType,
      transactionDate: row.transactionDayKey ?? '',
    }));

  return {
    threshold,
    count: highRisk.length,
    totalAmount: roundMoney(highRisk.reduce((sum, row) => sum + (row.amount ?? 0), 0)),
    percentageOfValidRows:
      rows.length > 0 ? Math.round((highRisk.length / rows.length) * 10_000) / 100 : null,
    topTransactions,
  };
}
