export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Trims, returns null for blank input, and never coerces non-strings. */
export function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function isNonEmptyArray<T>(value: readonly T[] | null | undefined): value is readonly T[] {
  return Array.isArray(value) && value.length > 0;
}
