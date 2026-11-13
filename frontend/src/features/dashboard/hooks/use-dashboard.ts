import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '@/types/api';
import { fetchDashboard } from '@/lib/api/endpoints';

export interface DashboardFilters {
  fileId?: string;
  branchId?: string;
  transactionType?: string;
  from?: string;
  to?: string;
}

const ACTIVE_JOB_STATUSES = new Set(['QUEUED', 'PROCESSING', 'RETRYING']);
const ACTIVE_POLL_MS = 1_000;

export function useDashboard(
  batchId: string | undefined,
  filters: DashboardFilters,
) {
  return useQuery<DashboardResponse>({
    queryKey: ['dashboard', batchId, filters],
    queryFn: () => fetchDashboard(batchId as string, filters),
    enabled: Boolean(batchId),
    staleTime: 0,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return ACTIVE_POLL_MS;
      const isBatchTerminal =
        data.batch.status === 'COMPLETED' || data.batch.status === 'FAILED';
      const isReportTerminal =
        data.batch.reportStatus === 'READY' ||
        data.batch.reportStatus === 'FAILED' ||
        data.batch.reportStatus === 'NOT_REQUESTED';
      const hasActiveJobs = data.files.some((job) => ACTIVE_JOB_STATUSES.has(job.status));
      const allJobsLoadedAndTerminal =
        data.batch.fileCount > 0 &&
        data.files.length >= data.batch.fileCount &&
        !hasActiveJobs;

      const active = !isBatchTerminal || !allJobsLoadedAndTerminal || !isReportTerminal;
      return active ? ACTIVE_POLL_MS : false;
    },
  });
}
