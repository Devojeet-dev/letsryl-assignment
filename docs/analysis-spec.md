# Analysis specification

Every metric in the dashboard and workbook is produced by the functions in
`backend/src/modules/processing/analysis/` and covered by
`backend/src/modules/processing/__tests__/`. This document is the contract.

## Valid population

A row contributes to numeric statistics only when its column value parsed successfully.

| Input | Outcome | Counted as |
| --- | --- | --- |
| Empty / whitespace only | value `null` | `missingNumericCounts[field]` |
| Fails the strict numeric grammar | value `null` | `invalidNumericCounts[field]` + sample row number |
| Parses to a finite number | value kept | `validCount` |

Rows with a blank `transaction_id`, `customer_id`, `branch_id`, `transaction_type` or
`transaction_date` are **rejected** entirely: they are excluded from every metric, counted in
`rejectedRows`, attributed per column in `missingRequiredFieldCounts`, and sampled (bounded) in
`rejectedRowSamples` with reason `MISSING_REQUIRED_FIELD:<columns>`.

Rows with an unparseable `transaction_date` are **kept**: they still contribute to amount, balance,
processing-time and risk statistics, but are excluded from `daily` and carry `transactionDate = null`
in the payload. They are counted in `invalidDateCount` with sample line numbers.

Duplicate `transaction_id` values are **never dropped**. Every row stays in the population; the
duplicate set is reported as `duplicateGroups` (with up to 20 sample line numbers per id) and
`duplicateTransactionIdCount` counts the surplus occurrences (`occurrences − 1` per group).

`missingHeaders` is reserved for header-level findings on the stored analysis; structural header
problems fail the file (`MISSING_REQUIRED_COLUMN`) before any row is analysed.

## Numeric grammar

```
^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$
```

No thousands separators, currency symbols, hexadecimal, `NaN`, `Infinity` or unit suffixes.
`12,345` is **invalid**, not `12345`. Values are never coerced or defaulted to zero.

## Statistics (per numeric column)

Given valid values `x₁…xₙ`:

| Metric | Definition |
| --- | --- |
| `count` / `validCount` | `n` |
| `total` | `Σxᵢ` |
| `mean` | `Σxᵢ / n` |
| `median` | `quantile(0.50)` |
| `stdDev` | **sample** standard deviation, `√(Σ(xᵢ−mean)² / (n−1))`; `0` when `n = 1` |
| `p25`, `p75` | `quantile(0.25)`, `quantile(0.75)` |
| `iqr` | `p75 − p25` |
| `lowerFence` | `p25 − 1.5 × iqr` |
| `upperFence` | `p75 + 1.5 × iqr` |
| `outlierCount` | values `< lowerFence` or `> upperFence` |
| `outlierPercentage` | `outlierCount / n × 100` |
| `outliers` | the outlier values themselves (rounded) |

### Quantile method

Linear interpolation on the sorted sample, equivalent to NumPy's `method="inclusive"`:

```
position = (n − 1) × p
lower = floor(position), upper = ceil(position)
q(p) = x[lower] + (x[upper] − x[lower]) × (position − lower)
```

Examples: `[1,2,3,4,5]` → P25 `2`, P50 `3`, P75 `4`; `[1,2,3,4]` → P25 `1.75`, P50 `2.5`,
P75 `3.25`.

All emitted metrics are rounded to **2 decimal places** (`roundTo` in `backend/src/shared`); counts are
never rounded. `roundTo` returns `0` for non-finite inputs instead of leaking `NaN`.

### No valid values

If `n = 0`, every metric is `null` (`noValidValues: true`, `outlierCount: 0`,
`outlierPercentage: null`, `histogram: []`). Clients must render `N/A`; zero would be a false
statement about the data. Missing/invalid counters are still reported so the reader can see why the
column has no values.

## Histogram

- 20 fixed-width bins over `[min, max]` of the valid values.
- Bin index = `floor((value − min) / width)`, clamped to `[0, 19]` so the maximum lands in the last
  bin. Bin edges are rounded to 2 decimals for display.
- Degenerate ranges (all values equal) collapse to one bin containing the whole sample, avoiding a
  divide-by-zero chart.
- Empty input yields `[]`.

## Breakdowns

| Panel | Definition |
| --- | --- |
| `byTransactionType`, `byBranch` | Row count and summed `amount` per distinct key, sorted by count desc then key |
| `daily` | Rows grouped by UTC calendar day (`transaction_date` → `YYYY-MM-DD`), excluding invalid dates |
| `largestTransaction` | Highest `amount` among rows with a valid amount; ties resolved by first occurrence |
| `highRisk` | Rows with `risk_score >= 80`; count, summed amount, percentage of valid rows and the top 10 by risk score (then amount) |

Day keys are always UTC. Timestamps without an offset are interpreted as UTC; offsets are honoured
via `Date.parse` and then normalized to UTC. Impossibilities such as `2026-02-30` are invalid.

## Filtering

Dashboard filters are applied to the persisted valid rows before any statistic is computed:

- `fileId` narrows to one file (must belong to the batch; otherwise `404`).
- `branchId` / `transactionType` match exactly.
- `from` / `to` are inclusive UTC day boundaries.

All metrics in a single response are derived from the same filtered row set, so numbers agree
across panels. Data-quality counters come from stored per-file snapshots and are not recomputed from
a filtered subset (see [architecture.md](architecture.md#dashboard-path)).

## Persistence

| Document | Contents |
| --- | --- |
| `fileanalyses` | Per-file field statistics, breakdowns, daily series, largest transaction, high-risk summary, data-quality snapshot |
| `transactionrows` | Normalized valid rows (source for filtered reads) |
| `rejectedrows` | Retained rejection samples for the report |

Rows are replaced atomically per file (`replaceFileRows`), making retries idempotent: a retried job
cannot duplicate rows from a previous partial attempt.

## Reference dataset

`transactions_01.csv` … `transactions_20.csv` contain 1,000 rows each. The pipeline is dimensioned
for 20 × 50,000 rows; see [limits.md](limits.md).
