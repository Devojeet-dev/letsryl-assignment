interface CryptoLike {
  randomUUID?: () => string;
}

/**
 * Correlation id generator usable in both Node and the browser without
 * pulling a runtime dependency into the shared package.
 */
export function createCorrelationId(prefix: string): string {
  const cryptoObj = (globalThis as { crypto?: CryptoLike }).crypto;
  const random =
    cryptoObj?.randomUUID?.().replace(/-/g, '') ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

export function newRequestId(): string {
  return createCorrelationId('req');
}

export function newIdempotencyKey(): string {
  return createCorrelationId('idem');
}
