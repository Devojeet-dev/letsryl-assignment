import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyAggregate, GroupAggregate, HistogramBin } from '@/types/api';
import { formatMoney, formatNumber } from '@/lib/format';

const AXIS_TICK = { fontSize: 11, fill: '#71717a' };
const TOOLTIP_STYLE = {
  background: '#181818',
  border: '1px solid #282828',
  borderRadius: 8,
  fontSize: 12,
  color: '#ededed',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
};

function EmptyChart({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-[220px] items-center justify-center font-mono text-xs text-zinc-500">
      {message}
    </div>
  );
}

export function HistogramChart({
  bins,
  color = '#3ECF8E',
}: {
  bins: readonly HistogramBin[];
  color?: string;
}): JSX.Element {
  if (bins.length === 0) {
    return <EmptyChart message="N/A — no valid values" />;
  }

  const data = bins.map((bin) => ({
    label: formatNumber(bin.lowerBound),
    count: bin.count,
    range: `${formatNumber(bin.lowerBound, 2)} – ${formatNumber(bin.upperBound, 2)}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#242424" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: '#282828' }}
          minTickGap={18}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(_label, payload) =>
            payload?.[0]?.payload?.range ?? ''
          }
          formatter={(value) => [formatNumber(Number(value)), 'Rows']}
        />
        <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  color = '#3ECF8E',
}: {
  data: readonly GroupAggregate[];
  color?: string;
}): JSX.Element {
  if (data.length === 0) {
    return <EmptyChart message="No matching rows" />;
  }

  const rows = data.map((item) => ({ name: item.key, count: item.count }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 34)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#242424" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [formatNumber(Number(value)), 'Rows']}
        />
        <Bar dataKey="count" fill={color} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyAmountChart({
  data,
}: {
  data: readonly DailyAggregate[];
}): JSX.Element {
  if (data.length === 0) {
    return <EmptyChart message="No rows with a valid transaction date" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={[...data]}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="dailyAmountFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3ECF8E" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3ECF8E" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#242424" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: '#282828' }}
          minTickGap={28}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={(value) => formatNumber(Number(value))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [formatMoney(Number(value)), 'Amount']}
        />
        <Area
          type="monotone"
          dataKey="totalAmount"
          stroke="#3ECF8E"
          strokeWidth={2}
          fill="url(#dailyAmountFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
