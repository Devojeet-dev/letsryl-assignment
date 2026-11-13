import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FilePlus2 } from 'lucide-react';
import type { BatchStatus } from '@/types/api';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  Spinner,
  StatusBadge,
} from '@/components/ui/primitives';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useBatches } from '../hooks/use-batches';

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ label: string; value: BatchStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
];

export function BatchesPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BatchStatus | ''>('');
  const params = useMemo(
    () => ({ page, limit: PAGE_SIZE, ...(status ? { status } : {}) }),
    [page, status],
  );

  const { data, isLoading, isError, error, isFetching } = useBatches(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Batches</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Every upload is processed as an isolated, retryable batch.
          </p>
        </div>
        <Link to="/upload">
          <Button>
            <FilePlus2 className="h-4 w-4" aria-hidden />
            New batch
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Recent batches"
          description={data ? `${formatNumber(data.total)} total` : undefined}
          actions={
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs transition ${
                    status === filter.value
                      ? 'border border-edge-light bg-[#242424] font-semibold text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:bg-[#1A1A1A] hover:text-zinc-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-3 px-2 py-10 font-mono text-sm text-zinc-400">
              <Spinner /> Loading batches…
            </div>
          ) : isError ? (
            <EmptyState
              title="Could not load batches"
              description={error instanceof Error ? error.message : 'Unexpected error'}
            />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No batches yet"
              description="Upload between 1 and 20 CSV files to start a batch."
              action={
                <Link to="/upload">
                  <Button variant="secondary">Upload files</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base min-w-[860px]">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Files</th>
                    <th>Failed</th>
                    <th>Report</th>
                    <th>Created</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <Link
                          to={`/batches/${batch.id}`}
                          className="font-mono text-xs font-semibold text-zinc-200 hover:text-brand"
                        >
                          {batch.id.slice(-8)}
                        </Link>
                        {batch.partialFailure ? (
                          <span className="ml-2 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                            PARTIAL
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="w-40">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={batch.progressPercent} />
                          <span className="w-9 text-right font-mono text-xs tabular-nums text-zinc-400">
                            {batch.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="tabular-nums font-mono text-xs">
                        {batch.counts.completed + batch.counts.failed}/
                        {batch.counts.totalFiles}
                        {batch.counts.retried > 0 ? (
                          <span className="ml-1 font-mono text-[11px] text-amber-400">
                            {batch.counts.retried} retried
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={
                          batch.counts.failed > 0
                            ? 'tabular-nums font-mono text-xs text-rose-400'
                            : 'tabular-nums font-mono text-xs text-zinc-500'
                        }
                      >
                        {batch.counts.failed}
                      </td>
                      <td>
                        <StatusBadge status={batch.reportStatus} />
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-zinc-500">
                        {formatDateTime(batch.createdAt)}
                      </td>
                      <td>
                        <Link
                          to={`/batches/${batch.id}`}
                          className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-brand"
                        >
                          Open <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 ? (
            <div className="mt-4 flex items-center justify-between font-mono text-xs text-zinc-400">
              <span>
                Page {data.page} · {formatNumber(data.items.length)} of{' '}
                {formatNumber(data.total)}
                {isFetching ? ' · refreshing…' : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={!data.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
