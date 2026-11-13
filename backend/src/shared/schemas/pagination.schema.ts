import { z } from 'zod';
import { ERROR_CODES } from '../errors/error-codes';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(Object.values(ERROR_CODES) as [string, ...string[]]),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  });
}
