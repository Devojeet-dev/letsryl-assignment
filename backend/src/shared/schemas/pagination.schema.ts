import { z } from 'zod';

/**
 * Standard pagination query schema enforcing page numbers and per-page limits.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
