import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { ReportStatus } from '@/types/api';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  Spinner,
  StatusBadge,
} from '@/components/ui/primitives';
import { JobTable } from '@/features/jobs/components/JobTable';
import { ReportDownloadCard } from '@/features/reports/components/ReportDownloadCard';
import { formatBytes, formatDateTime, formatNumber } from '@/lib/format';
import {
  CategoryBarChart,
  DailyAmountChart,
  HistogramChart,
} from '../charts';
import { DashboardFiltersPanel } from '../filters/DashboardFilters';
import { useDashboard, type DashboardFilters } from '../hooks/use-dashboard';
import { KpiGrid } from '../kpi/KpiGrid';
import { DataQualityPanel, FieldStatsTable, HighRiskPanel } from '../panels';

interface SelectOptions {
  branches: string[];
  types: string[];
}

const COUNT_LABELS: Array<{ key: keyof Counts; label: string; tone: string }> = [
  { key: 'queued', label: 'Queued', tone: 'text-zinc-400' },
  { key: 'processing', label: 'Processing', tone: 'text-sky-400' },
  { key: 'retrying', label: 'Retrying', tone: 'text-amber-400' },
  { key: 'completed', label: 'Completed', tone: 'text-brand' },
  { key: 'failed', label: 'Failed', tone: 'text-rose-400' },
  { key: 'retried', label: 'Retried', tone: 'text-zinc-500' },
];

type Counts = {
  queued: number;
  processing: number;
  retrying: number;
  completed: number;
  failed: number;
  retried: number;
};

export function DashboardPage(): JSX.Element {
  const { batchId } = useParams<{ batchId: string }>();
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [options, setOptions] = useState<SelectOptions>({ branches: [], types: [] });

  const dashboard = useDashboard(batchId, filters);
  const data = dashboard.data;
  const hasFilters = Object.values(filters).some((entry) => Boolean(entry));

  // Keep stable filter options: they are learned from the unfiltered payload so
  // choosing one branch does not remove every other branch from the menu.
  useEffect(() => {
    if (!data || hasFilters) return;
    setOptions({
      branches: data.byBranch.map((row) => row.key).sort(),
      types: data.byTransactionType.map((row) => row.key).sort(),
    });
  }, [data, hasFilters]);

  if (!batchId) {
    return (
      <EmptyState
        title="Batch not found"
        description="Open a batch from the list to view its dashboard."
        action={
          <Link to="/batches">
            <Button variant="secondary">Back to batches</Button>
          </Link>
        }
      />
    );
  }

  if (dashboard.isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-slate-400">
        <Spinner /> Loading dashboard…
      </div>
    );
  }

  if (dashboard.isError || !data) {
    return (
      <EmptyState
        title="Could not load this batch"
        description={
          dashboard.error instanceof Error
            ? dashboard.error.message
            : 'The batch may not exist or may belong to another user.'
        }
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void dashboard.refetch()}>
              Retry
            </Button>
            <Link to="/batches">
              <Button variant="ghost">Back to batches</Button>
            </Link>
          </div>
        }
      />
    );
  }

  const amountField = data.fields.find((field) => field.field === 'amount');
  const riskField = data.fields.find((field) => field.field === 'risk_score');
  const counts = data.batch.counts as Counts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/batches"
            className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            All batches
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg font-semibold text-zinc-100">{data.batch.id}</h1>
            <StatusBadge status={data.batch.status} />
            {data.batch.partialFailure ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-500/30">
                Partial failure
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-400">
            {data.batch.fileCount} files · {formatBytes(data.batch.totalBytes)} · created{' '}
            {formatDateTime(data.batch.createdAt)}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => void dashboard.refetch()}
          disabled={dashboard.isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 ${dashboard.isFetching ? 'animate-spin' : ''}`}
            aria-hidden
          />
          Refresh
        </Button>
      </div>

      <KpiGrid data={data} />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader
            title="Processing progress"
            description={`${counts.completed + counts.failed}/${data.batch.counts.totalFiles} files reached a terminal state`}
          />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <ProgressBar value={data.batch.progressPercent} />
              <span className="w-10 text-right font-mono text-sm font-semibold tabular-nums text-zinc-300">
                {data.batch.progressPercent}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {COUNT_LABELS.map(({ key, label, tone }) => (
                <div
                  key={key}
                  className="rounded-lg border border-edge bg-[#151515] px-2.5 py-2"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    {label}
                  </p>
                  <p className={`text-sm font-mono font-semibold tabular-nums ${tone}`}>
                    {formatNumber(counts[key])}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Excel report" description="Full workbook for this batch" />
          <div className="p-5">
            <ReportDownloadCard
              batchId={data.batch.id}
              batchStatus={data.batch.status}
              initialStatus={data.batch.reportStatus as ReportStatus}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Filters"
          description="Every KPI, chart and table below reacts to these filters"
        />
        <div className="p-5">
          <DashboardFiltersPanel
            value={filters}
            onChange={setFilters}
            files={data.files}
            branches={options.branches}
            types={options.types}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Amount distribution"
            description={`${formatNumber(amountField?.validCount ?? null)} valid values · IQR × 1.5 fences`}
          />
          <div className="p-4">
            <HistogramChart bins={amountField?.histogram ?? []} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Risk score distribution"
            description={`High-risk threshold 80 · ${formatNumber(
              riskField?.outlierCount ?? null,
            )} risk outliers`}
          />
          <div className="p-4">
            <HistogramChart bins={riskField?.histogram ?? []} color="#F5A623" />
          </div>
        </Card>

        <Card>
          <CardHeader title="By transaction type" description="Row counts per type" />
          <div className="p-4">
            <CategoryBarChart data={data.byTransactionType} />
          </div>
        </Card>

        <Card>
          <CardHeader title="By branch" description="Row counts per branch" />
          <div className="p-4">
            <CategoryBarChart data={data.byBranch} color="#34B27B" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Daily amount"
          description="Grouped by UTC calendar day; invalid dates are excluded"
        />
        <div className="p-4">
          <DailyAmountChart data={data.daily} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Numeric statistics"
          description="Blank metrics are shown as N/A — never coerced to zero"
        />
        <FieldStatsTable fields={data.fields} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Data quality"
            description="Rejected rows are reported, never silently dropped"
          />
          <DataQualityPanel quality={data.dataQuality} />
        </Card>

        <Card>
          <CardHeader
            title="High-risk transactions"
            description="risk_score ≥ 80"
          />
          <HighRiskPanel highRisk={data.highRisk} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="File jobs"
          description="One isolated job per CSV with retry history"
        />
        <JobTable jobs={data.files} />
      </Card>
    </div>
  );
}
