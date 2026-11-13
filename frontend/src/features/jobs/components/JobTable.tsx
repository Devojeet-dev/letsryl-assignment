import type { JobView } from '@/types/api';
import { StatusBadge } from '@/components/ui/primitives';
import { formatDateTime } from '@/lib/format';

export function JobTable({ jobs }: { jobs: readonly JobView[] }): JSX.Element {
  if (jobs.length === 0) {
    return (
      <p className="px-5 py-6 font-mono text-sm text-zinc-500">
        No file jobs recorded for this batch.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[760px]">
        <thead>
          <tr>
            <th>File</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Started</th>
            <th>Finished</th>
            <th>Failure</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td className="max-w-[240px] truncate font-mono text-xs text-zinc-200">
                {job.fileName}
              </td>
              <td>
                <StatusBadge status={job.status} />
              </td>
              <td className="tabular-nums font-mono text-xs text-zinc-300">
                {job.attempts}/{job.maxAttempts}
              </td>
              <td className="whitespace-nowrap font-mono text-xs text-zinc-500">
                {formatDateTime(job.startedAt)}
              </td>
              <td className="whitespace-nowrap font-mono text-xs text-zinc-500">
                {formatDateTime(job.finishedAt)}
              </td>
              <td className="max-w-[280px]">
                {job.errorCode ? (
                  <div>
                    <p className="font-mono text-[11px] text-rose-400 font-semibold">{job.errorCode}</p>
                    <p className="truncate font-mono text-xs text-zinc-400" title={job.errorMessage ?? ''}>
                      {job.errorMessage}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
