import { roundTo } from './percentage';

/** Monetary values are rounded to 2 decimals at every aggregation boundary. */
export function roundMoney(value: number): number {
  return roundTo(value, 2);
}

export function sumMoney(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return roundMoney(total);
}
