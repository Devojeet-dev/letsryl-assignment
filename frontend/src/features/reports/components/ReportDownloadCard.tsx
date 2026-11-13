import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import type { ReportStatus, ReportStatusInfo } from '@/types/api';
import { Button, Spinner, StatusBadge } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api/client';
import { downloadReport, fetchReportStatus, requestReport } from '@/lib/api/endpoints';
import { formatBytes, formatDateTime } from '@/lib/format';

interface ReportDownloadCardProps {
  batchId: string;
  batchStatus: string;
  initialStatus: ReportStatus;
}

const IN_PROGRESS: readonly ReportStatus[] = ['QUEUED', 'GENERATING'];

export function ReportDownloadCard({
  batchId,
  batchStatus,
  initialStatus,
}: ReportDownloadCardProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = useQuery<ReportStatusInfo>({
    queryKey: ['report-status', batchId],
    queryFn: () => fetchReportStatus(batchId),
    staleTime: 0,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? initialStatus;
      return IN_PROGRESS.includes(status) ? 1_500 : false;
    },
  });

  const report = statusQuery.data;
  const status = report?.status ?? initialStatus;
  const isReady = status === 'READY';
  const canGenerate = batchStatus === 'COMPLETED' && !isReady;

  const handleDownload = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const file = await downloadReport(batchId);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === 'REPORT_NOT_READY'
          ? 'The report is still being generated. Try again in a moment.'
          : cause instanceof Error
            ? cause.message
            : 'Download failed.',
      );
      void statusQuery.refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await requestReport(batchId);
      await statusQuery.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not enqueue the report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={status} />
        {report?.generatedAt ? (
          <span className="font-mono text-[11px] text-zinc-400">
            {formatDateTime(report.generatedAt)}
          </span>
        ) : null}
      </div>

      {report?.fileName ? (
        <p className="truncate font-mono text-[11px] text-zinc-400">
          {report.fileName}
          {report.sizeBytes !== null ? ` · ${formatBytes(report.sizeBytes)}` : ''}
        </p>
      ) : null}

      {report?.errorCode ? (
        <p className="font-mono text-xs text-rose-400">Last error: {report.errorCode}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={!isReady || busy} onClick={() => void handleDownload()}>
          {busy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          Download Excel
        </Button>
        {canGenerate ? (
          <Button
            variant="secondary"
            disabled={busy || IN_PROGRESS.includes(status)}
            onClick={() => void handleGenerate()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {status === 'FAILED' ? 'Retry report' : 'Generate report'}
          </Button>
        ) : null}
      </div>

      {IN_PROGRESS.includes(status) ? (
        <p className="font-mono text-xs text-zinc-400">Generating workbook… this panel refreshes automatically.</p>
      ) : null}

      {error ? <p className="font-mono text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
