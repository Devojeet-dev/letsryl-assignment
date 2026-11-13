export const ANALYSIS_CONSTANTS = {
  IQR_MULTIPLIER: 1.5,
  HIGH_RISK_SCORE_THRESHOLD: 80,
  HISTOGRAM_BIN_COUNT: 20,
  TOP_N: 10,
  /** Maximum sample row numbers retained per invalid field / rejection reason. */
  MAX_ERROR_SAMPLES: 20,
  /** Cap on retained rejected rows per file for report drill-down. */
  MAX_REJECTED_ROWS_RETAINED: 500,
  PERCENTILES: [25, 75] as const,
} as const;

export type NumericFieldKey = 'amount' | 'balance_after' | 'processing_time_ms' | 'risk_score';
