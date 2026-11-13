import type { JobView } from '@/types/api';
import { Button } from '@/components/ui/primitives';
import type { DashboardFilters } from '../hooks/use-dashboard';

interface DashboardFiltersPanelProps {
  value: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  files: readonly JobView[];
  branches: readonly string[];
  types: readonly string[];
}

export function DashboardFiltersPanel({
  value,
  onChange,
  files,
  branches,
  types,
}: DashboardFiltersPanelProps): JSX.Element {
  const update = (patch: Partial<DashboardFilters>): void => {
    onChange({ ...value, ...patch });
  };

  const hasFilters = Object.values(value).some((entry) => Boolean(entry));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <div>
        <label className="field-label" htmlFor="filter-file">
          File
        </label>
        <select
          id="filter-file"
          className="field-input"
          value={value.fileId ?? ''}
          onChange={(event) => update({ fileId: event.target.value || undefined })}
        >
          <option value="">All files</option>
          {files.map((file) => (
            <option key={file.fileId} value={file.fileId}>
              {file.fileName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="filter-branch">
          Branch
        </label>
        <select
          id="filter-branch"
          className="field-input"
          value={value.branchId ?? ''}
          onChange={(event) => update({ branchId: event.target.value || undefined })}
        >
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="filter-type">
          Transaction type
        </label>
        <select
          id="filter-type"
          className="field-input"
          value={value.transactionType ?? ''}
          onChange={(event) =>
            update({ transactionType: event.target.value || undefined })
          }
        >
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="filter-from">
          From
        </label>
        <input
          id="filter-from"
          type="date"
          className="field-input"
          value={value.from ?? ''}
          max={value.to}
          onChange={(event) => update({ from: event.target.value || undefined })}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="filter-to">
          To
        </label>
        <input
          id="filter-to"
          type="date"
          className="field-input"
          value={value.to ?? ''}
          min={value.from}
          onChange={(event) => update({ to: event.target.value || undefined })}
        />
      </div>

      <div className="flex items-end">
        <Button
          variant="secondary"
          className="w-full"
          disabled={!hasFilters}
          onClick={() => onChange({})}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
