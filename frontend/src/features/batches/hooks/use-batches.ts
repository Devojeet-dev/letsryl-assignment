import { useQuery } from '@tanstack/react-query';
import type { BatchDetail } from '@/types/api';
import { fetchBatch, listBatches } from '@/lib/api/endpoints';

const ACTIVE_POLL_MS = 1_500;

function isBatchActive(
  batch: Pick<BatchDetail, 'status'> & { reportStatus?: string | null },
): boolean {
  return (
    batch.status === 'QUEUED' ||
    batch.status === 'PROCESSING' ||
    batch.reportStatus === 'QUEUED' ||
    batch.reportStatus === 'GENERATING'
  );
}

export function useBatches(params: { page: number; limit: number; status?: string }) {
  return useQuery({
    queryKey: ['batches', params],
    queryFn: () => listBatches(params),
    staleTime: 0,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return ACTIVE_POLL_MS;
      const items = data.items ?? [];
      return items.some(isBatchActive) ? ACTIVE_POLL_MS : false;
    },
  });
}

export function useBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => fetchBatch(batchId as string),
    enabled: Boolean(batchId),
    staleTime: 0,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const batch = query.state.data;
      if (!batch) return ACTIVE_POLL_MS;
      return isBatchActive(batch) ? ACTIVE_POLL_MS : false;
    },
  });
}
