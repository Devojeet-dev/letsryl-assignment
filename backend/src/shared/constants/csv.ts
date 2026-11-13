export const REQUIRED_COLUMNS = [
  'transaction_id',
  'customer_id',
  'branch_id',
  'transaction_type',
  'amount',
  'balance_after',
  'processing_time_ms',
  'risk_score',
  'transaction_date',
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

export const NUMERIC_COLUMNS = [
  'amount',
  'balance_after',
  'processing_time_ms',
  'risk_score',
] as const;

export type NumericColumn = (typeof NUMERIC_COLUMNS)[number];

/** Blank values in these columns reject the row outright. */
export const MANDATORY_TEXT_COLUMNS = [
  'transaction_id',
  'customer_id',
  'branch_id',
  'transaction_type',
  'transaction_date',
] as const;

export type MandatoryTextColumn = (typeof MANDATORY_TEXT_COLUMNS)[number];

export const CSV_FILE_EXTENSION = '.csv';
