import { z } from 'zod';
import { objectIdSchema } from './batch.schema';

export const jobIdParamSchema = z.object({
  id: objectIdSchema,
  jobId: objectIdSchema,
});

export const batchFileParamSchema = z.object({
  id: objectIdSchema,
  fileId: objectIdSchema,
});

const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), 'Invalid calendar date');

export const dashboardQuerySchema = z
  .object({
    fileId: objectIdSchema.optional(),
    branchId: z.string().trim().min(1).max(64).optional(),
    transactionType: z.string().trim().min(1).max(64).optional(),
    from: isoDaySchema.optional(),
    to: isoDaySchema.optional(),
  })
  .refine(
    (query) => !query.from || !query.to || query.from <= query.to,
    { message: '`from` must be on or before `to`', path: ['from'] },
  );

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
