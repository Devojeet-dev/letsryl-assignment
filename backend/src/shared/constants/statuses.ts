export const JOB_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'RETRYING',
  'COMPLETED',
  'FAILED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ['COMPLETED', 'FAILED'];

export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

/**
 * Batch lifecycle. A batch reaches COMPLETED once every file job is terminal,
 * even when some files failed (partial failure is surfaced via `partialFailure`).
 * FAILED is reserved for batches that could not be created/processed at all.
 */
export const BATCH_STATUSES = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const REPORT_STATUSES = [
  'NOT_REQUESTED',
  'QUEUED',
  'GENERATING',
  'READY',
  'FAILED',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Allowed job transitions; invalid transitions are rejected by the lifecycle service. */
export const JOB_TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
  QUEUED: ['PROCESSING', 'FAILED'],
  PROCESSING: ['RETRYING', 'COMPLETED', 'FAILED'],
  RETRYING: ['PROCESSING', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}
