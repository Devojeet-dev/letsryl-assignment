interface CryptoLike {
  randomUUID?: () => string;
}

/**
 * Correlation ID generator usable in Node runtime environments without external dependencies.
 *
 * @param prefix - Prefix applied to the generated correlation ID (e.g. 'req').
 * @returns A unique correlation identifier string.
 */
export function createCorrelationId(prefix: string): string {
  const cryptoObj = (globalThis as { crypto?: CryptoLike }).crypto;
  const random =
    cryptoObj?.randomUUID?.().replace(/-/g, '') ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

/**
 * Generates a unique request correlation ID for incoming HTTP requests.
 *
 * @returns A string starting with 'req_' followed by random hex characters.
 */
export function newRequestId(): string {
  return createCorrelationId('req');
}
