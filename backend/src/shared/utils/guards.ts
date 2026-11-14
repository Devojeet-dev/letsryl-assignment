/**
 * String parsing and sanitation guards.
 */

/**
 * Trims whitespace from a value, returning null if the result is empty or not a string.
 * Never coerces non-strings.
 *
 * @param value - The raw input to inspect.
 * @returns The trimmed string, or null if empty/non-string.
 */
export function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
