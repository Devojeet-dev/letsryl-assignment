import { roundTo } from './percentage';

/**
 * Rounds a financial value to two decimal places.
 * Monetary values are rounded to 2 decimals at every aggregation boundary.
 *
 * @param value - The numerical monetary value.
 * @returns The value rounded to 2 decimal places.
 */
export function roundMoney(value: number): number {
  return roundTo(value, 2);
}
