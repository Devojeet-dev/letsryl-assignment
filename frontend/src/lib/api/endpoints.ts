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

export function exchangeSession(idToken: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

/** Only succeeds when the API runs with DEMO_AUTH_ENABLED=true. */
export function demoSession(): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/demo-session', { method: 'POST' });
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}

export function listBatches(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<BatchListResponse> {
  return apiRequest<BatchListResponse>('/batches', { query: params });
}

export function fetchBatch(batchId: string): Promise<BatchDetail> {
  return apiRequest<BatchDetail>(`/batches/${batchId}`);
}

export interface CreateBatchResponse extends BatchDetail {
  /** Present when the API replayed a previous request (idempotency). */
  replayed?: boolean;
}

/**
 * Uploads one batch. The idempotency key is required by this client so that a
 * double submit or a retried request can never create a second batch.
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

export function fetchReportStatus(batchId: string): Promise<ReportStatusInfo> {
  return apiRequest<ReportStatusInfo>(`/batches/${batchId}/report/status`);
}

export function requestReport(batchId: string): Promise<ReportStatusInfo> {
  return apiRequest<ReportStatusInfo>(`/batches/${batchId}/report`, {
    method: 'POST',
  });
}

export function downloadReport(batchId: string): Promise<DownloadedFile> {
  return apiDownload(`/batches/${batchId}/report`);
}
