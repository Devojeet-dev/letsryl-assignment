const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Strict ISO-8601 parser. Timestamps without an offset are interpreted as UTC
 * so daily aggregates are stable regardless of the worker's timezone.
 */
export function parseIsoDateTime(value: string): Date | null {
  const match = ISO_DATE_TIME.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, millis, offset] = match;
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  const h = Number(hour);
  const mi = Number(minute);
  const s = Number(second ?? '0');
  const ms = Number((millis ?? '0').padEnd(3, '0'));

  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) {
    return null;
  }

  if (offset && offset !== 'Z') {
    const parsed = Date.parse(value.trim());
    return Number.isNaN(parsed) ? null : new Date(parsed);
  }

  const utc = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms));
  // Reject impossible calendar dates such as 2026-02-30.
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== mo - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return utc;
}

export function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayKeyToRangeStart(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function dayKeyToRangeEnd(dayKey: string): Date {
  return new Date(`${dayKey}T23:59:59.999Z`);
}
