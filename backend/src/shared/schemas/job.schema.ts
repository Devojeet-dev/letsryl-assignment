import { z } from 'zod';
import { objectIdSchema } from './batch.schema';

export const jobIdSchema = z.object({
  jobId: objectIdSchema,
  fileId: objectIdSchema,
  status: z.enum(['QUEUED', 'PROCESSING', 'RETRYING', 'COMPLETED', 'FAILED']),
});

export const fileProcessingPayloadSchema = z.object({
  batchId: objectIdSchema,
  fileId: objectIdSchema,
  ownerId: z.string().min(1),
  gridfsId: z.string().min(1),
  originalName: z.string().min(1),
});

export type FileProcessingPayload = z.infer<typeof fileProcessingPayloadSchema>;

export const reportGenerationPayloadSchema = z.object({
  batchId: objectIdSchema,
  ownerId: z.string().min(1),
});

export type ReportGenerationPayload = z.infer<typeof reportGenerationPayloadSchema>;
