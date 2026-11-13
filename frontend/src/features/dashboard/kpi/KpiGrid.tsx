import type { DashboardResponse } from '@/types/api';
import { StatTile } from '@/components/ui/primitives';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';

export function KpiGrid({ data }: { data: DashboardResponse }): JSX.Element {
  const amount = data.fields.find((field) => field.field === 'amount') ?? null;
  const risk = data.fields.find((field) => field.field === 'risk_score') ?? null;
  const quality = data.dataQuality;
  const queueDepth = data.queue.waiting + data.queue.active;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Valid rows"
        value={formatNumber(quality?.validRows ?? null)}
        hint={
          quality
            ? `${formatNumber(quality.rejectedRows)} rejected · ${formatNumber(
                quality.totalRows,
              )} total`
            : 'Waiting for the first file'
        }
      />
      <StatTile
        label="Total amount"
        value={formatMoney(amount?.total ?? null)}
        hint={`Median ${formatMoney(amount?.median ?? null)}`}
      />
      <StatTile
        label="High-risk transactions"
        value={formatNumber(data.highRisk?.count ?? null)}
        hint={`risk ≥ 80 · ${formatPercent(data.highRisk?.percentageOfValidRows ?? null)} of valid`}
        tone="negative"
      />
      <StatTile
        label="Amount outliers"
        value={formatNumber(amount?.outlierCount ?? null)}
        hint={`${formatPercent(amount?.outlierPercentage ?? null)} of valid · IQR × 1.5`}
        tone="warning"
      />
      <StatTile
        label="Median risk score"
        value={formatNumber(risk?.median ?? null, 1)}
        hint={`P75 ${formatNumber(risk?.p75 ?? null, 1)} · Max ${formatNumber(
          risk?.max ?? null,
          1,
        )}`}
      />
      <StatTile
        label="Largest transaction"
        value={formatMoney(data.largestTransaction?.amount ?? null)}
        hint={data.largestTransaction?.transactionId ?? 'N/A'}
      />
      <StatTile
        label="Queue depth"
        value={formatNumber(queueDepth)}
        hint={`${formatNumber(data.queue.waiting)} waiting · ${formatNumber(
          data.queue.active,
        )} active`}
      />
      <StatTile
        label="Workers online"
        value={formatNumber(data.queue.workersOnline)}
        hint={data.queue.healthy ? 'Queue healthy' : 'Queue unavailable'}
        tone={data.queue.healthy ? 'positive' : 'negative'}
      />
    </div>
  );
}
