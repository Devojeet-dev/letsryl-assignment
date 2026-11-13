import type {
  DataQualityReport,
  FieldStatistics,
  HighRiskSummary,
} from '@/types/api';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';

export function FieldStatsTable({
  fields,
}: {
  fields: readonly FieldStatistics[];
}): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[980px]">
        <thead>
          <tr>
            <th>Field</th>
            <th>Valid</th>
            <th>Missing</th>
            <th>Invalid</th>
            <th>Total</th>
            <th>Mean</th>
            <th>Median</th>
            <th>Min</th>
            <th>Max</th>
            <th>Std dev</th>
            <th>P25</th>
            <th>P75</th>
            <th>Outliers</th>
            <th>Outlier %</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.field}>
              <td className="whitespace-nowrap font-mono text-xs text-zinc-200 font-semibold">
                {field.field}
                {field.noValidValues ? (
                  <span className="ml-2 rounded border border-edge bg-[#202020] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    N/A
                  </span>
                ) : null}
              </td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.validCount)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.missingCount)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.invalidCount)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.total, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.mean, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.median, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.min, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.max, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.stdDev, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.p25, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.p75, 2)}</td>
              <td className="tabular-nums font-mono text-xs">{formatNumber(field.outlierCount)}</td>
              <td className="tabular-nums font-mono text-xs text-amber-400">
                {formatPercent(field.outlierPercentage ?? null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'negative' | 'positive';
}): JSX.Element {
  const toneClass =
    tone === 'warning'
      ? 'text-amber-400'
      : tone === 'negative'
        ? 'text-rose-400'
        : tone === 'positive'
          ? 'text-brand'
          : 'text-zinc-100';
  return (
    <div className="rounded-lg border border-edge bg-[#151515] px-3.5 py-2.5">
      <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export function DataQualityPanel({
  quality,
}: {
  quality: DataQualityReport | null;
}): JSX.Element {
  if (!quality) {
    return (
      <p className="px-5 py-6 font-mono text-sm text-zinc-500">
        No quality snapshot yet — files are still being processed.
      </p>
    );
  }

  const missingRequired = Object.entries(quality.missingRequiredFieldCounts).filter(
    ([, count]) => count > 0,
  );
  const numericIssues = Object.entries(quality.missingNumericCounts).filter(
    ([key, missing]) => missing > 0 || (quality.invalidNumericCounts[key] ?? 0) > 0,
  );

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Total rows" value={formatNumber(quality.totalRows)} />
        <Metric
          label="Valid rows"
          value={formatNumber(quality.validRows)}
          tone="positive"
        />
        <Metric
          label="Rejected rows"
          value={formatNumber(quality.rejectedRows)}
          tone={quality.rejectedRows > 0 ? 'negative' : 'default'}
        />
        <Metric
          label="Duplicate ids"
          value={formatNumber(quality.duplicateTransactionIdCount)}
          tone={quality.duplicateTransactionIdCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
          Missing required values
        </h3>
        {missingRequired.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono">No mandatory values were blank.</p>
        ) : (
          <ul className="space-y-1 text-xs text-zinc-300">
            {missingRequired.map(([column, count]) => (
              <li key={column} className="flex justify-between gap-3 font-mono">
                <span className="text-zinc-400">{column}</span>
                <span className="tabular-nums text-amber-400 font-semibold">
                  {formatNumber(count)} rows rejected
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
          Numeric anomalies
        </h3>
        {numericIssues.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono">
            Every numeric value was present and parseable.
          </p>
        ) : (
          <ul className="space-y-1 text-xs text-zinc-300">
            {numericIssues.map(([column, missing]) => (
              <li key={column} className="flex justify-between gap-3 font-mono">
                <span className="text-zinc-400">{column}</span>
                <span>
                  <span className="text-zinc-400">{formatNumber(missing)} missing</span>
                  {' · '}
                  <span className="text-amber-400 font-semibold">
                    {formatNumber(quality.invalidNumericCounts[column] ?? 0)} invalid
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
          Invalid dates (excluded from date-wise analysis)
        </h3>
        <p className="font-mono text-xs text-zinc-300">
          {formatNumber(quality.invalidDateCount)} rows
          {quality.invalidDateSamples.length > 0 ? (
            <span className="ml-2 font-mono text-[11px] text-zinc-500">
              rows {quality.invalidDateSamples.slice(0, 10).join(', ')}
            </span>
          ) : null}
        </p>
      </section>

      {quality.missingHeaders.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Files rejected for missing columns
          </h3>
          <p className="font-mono text-xs text-rose-400">
            {quality.missingHeaders.join(', ')}
          </p>
        </section>
      ) : null}

      {quality.duplicateGroups.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Duplicate transaction ids (rows retained)
          </h3>
          <ul className="space-y-1 text-xs text-zinc-300 font-mono">
            {quality.duplicateGroups.slice(0, 5).map((group) => (
              <li key={group.transactionId} className="flex justify-between gap-3">
                <span className="truncate text-zinc-400">
                  {group.transactionId}
                </span>
                <span className="whitespace-nowrap text-amber-400 font-semibold">
                  {group.occurrences}×
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function HighRiskPanel({
  highRisk,
}: {
  highRisk: HighRiskSummary | null;
}): JSX.Element {
  if (!highRisk) {
    return (
      <p className="px-5 py-6 font-mono text-sm text-zinc-500">
        Risk metrics appear once files finish processing.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-3 gap-2">
        <Metric
          label={`risk ≥ ${highRisk.threshold}`}
          value={formatNumber(highRisk.count)}
          tone="negative"
        />
        <Metric label="Total amount" value={formatMoney(highRisk.totalAmount)} />
        <Metric
          label="Share"
          value={formatPercent(highRisk.percentageOfValidRows)}
          tone="warning"
        />
      </div>

      {highRisk.topTransactions.length === 0 ? (
        <p className="font-mono text-xs text-zinc-500">
          No transaction crossed the high-risk threshold.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base min-w-[520px]">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Risk</th>
                <th>Branch</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {highRisk.topTransactions.map((transaction) => (
                <tr key={`${transaction.transactionId}-${transaction.riskScore}`}>
                  <td className="max-w-[180px] truncate font-mono text-xs text-zinc-200">
                    {transaction.transactionId}
                  </td>
                  <td className="tabular-nums font-mono text-xs">{formatMoney(transaction.amount)}</td>
                  <td className="tabular-nums font-mono text-xs font-semibold text-rose-400">
                    {formatNumber(transaction.riskScore, 1)}
                  </td>
                  <td className="font-mono text-xs text-zinc-400">{transaction.branchId}</td>
                  <td className="whitespace-nowrap font-mono text-xs text-zinc-500">
                    {transaction.transactionDate || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
