import clsx from 'clsx';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-[#121212] font-semibold hover:bg-brand-hover focus-visible:ring-brand/40 shadow-sm disabled:bg-zinc-800 disabled:text-zinc-500',
  secondary:
    'border border-edge bg-[#1C1C1C] text-zinc-200 hover:border-zinc-600 hover:bg-[#242424] focus-visible:ring-zinc-600/40',
  ghost:
    'text-zinc-400 hover:bg-[#1C1C1C] hover:text-zinc-100 focus-visible:ring-zinc-600/40',
  danger:
    'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 focus-visible:ring-rose-500/40',
};

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): JSX.Element {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <section className={clsx('panel', className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <header className="panel-header">
      <div>
        <h2 className="panel-title">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-zinc-400">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

const STATUS_TONES: Record<string, string> = {
  QUEUED: 'bg-zinc-800/80 text-zinc-300 ring-zinc-700/60',
  PROCESSING: 'bg-sky-500/10 text-sky-400 ring-sky-500/30 animate-pulse',
  GENERATING: 'bg-sky-500/10 text-sky-400 ring-sky-500/30 animate-pulse',
  RETRYING: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  COMPLETED: 'bg-brand/10 text-brand ring-brand/30',
  READY: 'bg-brand/10 text-brand ring-brand/30',
  FAILED: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  NOT_REQUESTED: 'bg-zinc-800/60 text-zinc-400 ring-zinc-700/40',
};

export function StatusBadge({ status }: { status: string }): JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset',
        STATUS_TONES[status] ?? 'bg-zinc-800/80 text-zinc-300 ring-zinc-700/60',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Spinner({ className }: { className?: string }): JSX.Element {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-brand',
        className,
      )}
    />
  );
}

export function ProgressBar({ value }: { value: number }): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-edge bg-[#151515]/40 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      <p className="max-w-md text-xs text-zinc-400">{description}</p>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
}): JSX.Element {
  const toneClass =
    tone === 'positive'
      ? 'text-brand'
      : tone === 'negative'
        ? 'text-rose-400'
        : tone === 'warning'
          ? 'text-amber-400'
          : 'text-zinc-100';
  return (
    <div className="rounded-xl border border-edge bg-[#161616] px-4 py-3.5 transition hover:border-[#383838]">
      <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className={clsx('mt-1.5 text-xl font-semibold tabular-nums', toneClass)}>{value}</p>
      {hint ? <p className="mt-1 font-mono text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
}
