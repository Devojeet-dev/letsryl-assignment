import { z } from 'zod';
import { BATCH_STATUSES } from '../constants/statuses';

export const objectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Expected a 24-character hexadecimal identifier');

export const batchIdParamSchema = z.object({
  id: objectIdSchema,
});

export const idempotencyKeySchema = z
  .string()
  .min(8, 'Idempotency-Key must be at least 8 characters')
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Idempotency-Key contains unsupported characters');

export const listBatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(BATCH_STATUSES).optional(),
});

export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>;
