import type {
  AuthSession,
  AuthUser,
  BatchDetail,
  BatchSummary,
  DashboardQuery,
  DashboardResponse,
  ReportStatusInfo,
} from '@/types/api';
import { apiDownload, apiRequest, type DownloadedFile } from './client';

export interface BatchListResponse {
  items: BatchSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Exchanges a third-party token (Google ID or Supabase) for an authenticated API session.
 *
 * @param idToken - The identity or access token.
 * @returns The session object with accessToken and user profile.
 */
export function exchangeSession(idToken: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

/**
 * Requests an instant session for the demo reviewer identity.
 * Only succeeds when the API runs with `DEMO_AUTH_ENABLED=true`.
 *
 * @returns The session object for the demo user.
 */
export function demoSession(): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/demo-session', { method: 'POST' });
}

/**
 * Fetches the currently authenticated user's profile details (`GET /auth/me`).
 */
export function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}

/**
 * Lists all batches uploaded by the current user with pagination and optional status filter.
 *
 * @param params - Optional pagination (page, limit) and status filters.
 * @returns Paginated batch list response.
 */
export function listBatches(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<BatchListResponse> {
  return apiRequest<BatchListResponse>('/batches', { query: params });
}

/**
 * Fetches full details, file listings, and job states for a specific batch.
 *
 * @param batchId - The unique batch ID.
 * @returns Complete BatchDetail aggregate.
 */
export function fetchBatch(batchId: string): Promise<BatchDetail> {
  return apiRequest<BatchDetail>(`/batches/${batchId}`);
}

export interface CreateBatchResponse extends BatchDetail {
  /** Present when the API replayed a previous request (idempotency). */
  replayed?: boolean;
}

/**
 * Uploads a batch of 1–20 CSV files with an idempotency key.
 *
 * The idempotency key ensures double submissions or retries return the original batch
 * without duplicating file jobs.
 *
 * @param files - Array of File objects selected for upload.
 * @param idempotencyKey - Unique client-generated idempotency key.
 * @returns The created or replayed batch summary.
 */
export async function createBatch(
  files: File[],
  idempotencyKey: string,
): Promise<CreateBatchResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file, file.name);
  }

  return apiRequest<CreateBatchResponse>('/batches', {
    method: 'POST',
    body: form,
    headers: { 'idempotency-key': idempotencyKey },
  });
}

/**
 * Fetches the real-time aggregated analytics dashboard payload for a batch with optional filters.
 *
 * @param batchId - The unique batch ID.
 * @param filters - Optional query filters (fileId, branchId, transactionType, date range).
 * @returns Calculated KPIs, IQR statistics, histograms, and data-quality findings.
 */
export function fetchDashboard(
  batchId: string,
  filters: Partial<DashboardQuery> = {},
): Promise<DashboardResponse> {
  return apiRequest<DashboardResponse>(`/batches/${batchId}/analytics`, {
    query: {
      fileId: filters.fileId,
      branchId: filters.branchId,
      transactionType: filters.transactionType,
      from: filters.from,
      to: filters.to,
    },
  });
}

/**
 * Fetches the generation status of the batch's Excel report (`GET /batches/:id/report/status`).
 *
 * @param batchId - The unique batch ID.
 * @returns Current ReportStatusInfo.
 */
export function fetchReportStatus(batchId: string): Promise<ReportStatusInfo> {
  return apiRequest<ReportStatusInfo>(`/batches/${batchId}/report/status`);
}

/**
 * Enqueues or retries background generation of the batch's Excel report (`POST /batches/:id/report`).
 *
 * @param batchId - The unique batch ID.
 * @returns Updated ReportStatusInfo.
 */
export function requestReport(batchId: string): Promise<ReportStatusInfo> {
  return apiRequest<ReportStatusInfo>(`/batches/${batchId}/report`, {
    method: 'POST',
  });
}

/**
 * Downloads the compiled multi-sheet Excel (.xlsx) workbook for a completed batch.
 *
 * @param batchId - The unique batch ID.
 * @returns The downloaded Blob and suggested file name.
 */
export function downloadReport(batchId: string): Promise<DownloadedFile> {
  return apiDownload(`/batches/${batchId}/report`);
}
