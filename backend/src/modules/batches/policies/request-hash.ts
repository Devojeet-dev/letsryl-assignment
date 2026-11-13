import { createHash } from 'node:crypto';

/** Stable fingerprint of an upload intent, used to detect idempotency misuse. */
export function hashUploadRequest(
  files: readonly { originalname: string; size: number; buffer: Buffer }[],
): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort((a, b) => a.originalname.localeCompare(b.originalname))) {
    hash.update(file.originalname);
    hash.update(String(file.size));
    hash.update(createHash('sha256').update(file.buffer).digest());
  }
  return hash.digest('hex');
}
