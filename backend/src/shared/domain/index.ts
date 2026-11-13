import type { JobStatus, ReportStatus } from '../constants/statuses';
import type { ErrorCode } from '../errors/error-codes';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: 'google' | 'supabase' | 'app';
}

export interface TransactionRow {
  rowNumber: number;
  transactionId: string | null;
  customerId: string | null;
  branchId: string | null;
  transactionType: string | null;
  amount: number | null;
  balanceAfter: number | null;
  processingTimeMs: number | null;
  riskScore: number | null;
  transactionDate: string | null;
}

export interface RejectedRow {
  rowNumber: number;
  reason: string;
  transactionId: string | null;
}

export interface DuplicateIdGroup {
  transactionId: string;
  occurrences: number;
  rowNumbers: number[];
}

export interface DataQualityReport {
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  missingRequiredFieldCounts: Record<string, number>;
  missingNumericCounts: Record<string, number>;
  invalidNumericCounts: Record<string, number>;
  invalidNumericSamples: Record<string, number[]>;
  invalidDateCount: number;
  invalidDateSamples: number[];
  duplicateTransactionIdCount: number;
  duplicateGroups: DuplicateIdGroup[];
  rejectedRowSamples: RejectedRow[];
  missingHeaders: string[];
}

export interface HistogramBin {
  lowerBound: number;
  upperBound: number;
  count: number;
}

export interface FieldStatistics {
  field: 'amount' | 'balance_after' | 'processing_time_ms' | 'risk_score';
  noValidValues: boolean;
  validCount: number;
  missingCount: number;
  invalidCount: number;
  total: number | null;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
  p25: number | null;
  p75: number | null;
  iqr: number | null;
  lowerFence: number | null;
  upperFence: number | null;
  outlierCount: number;
  outlierPercentage: number | null;
  histogram: HistogramBin[];
}

export interface GroupAggregate {
  key: string;
  count: number;
  totalAmount: number;
}

export interface DailyAggregate {
  date: string;
  count: number;
  totalAmount: number;
}

export interface LargestTransaction {
  transactionId: string;
  amount: number;
  branchId: string;
  transactionType: string;
  transactionDate: string;
}

export interface HighRiskTransaction {
  transactionId: string;
  amount: number;
  riskScore: number;
  branchId: string;
  transactionType: string;
  transactionDate: string;
}

export interface HighRiskSummary {
  threshold: number;
  count: number;
  totalAmount: number;
  percentageOfValidRows: number | null;
  topTransactions: HighRiskTransaction[];
}

export interface FileAnalysis {
  fileId: string;
  fileName: string;
  rowCount: number;
  validRowCount: number;
  rejectedRowCount: number;
  fields: FieldStatistics[];
  dataQuality: DataQualityReport;
  byTransactionType: GroupAggregate[];
  byBranch: GroupAggregate[];
  daily: DailyAggregate[];
  largestTransaction: LargestTransaction | null;
  highRisk: HighRiskSummary;
  generatedAt: string;
}

export interface BatchAnalysis {
  batchId: string;
  fileCount: number;
  rowCount: number;
  validRowCount: number;
  rejectedRowCount: number;
  fields: FieldStatistics[];
  dataQuality: DataQualityReport;
  byTransactionType: GroupAggregate[];
  byBranch: GroupAggregate[];
  daily: DailyAggregate[];
  largestTransaction: LargestTransaction | null;
  highRisk: HighRiskSummary;
  files: FileAnalysis[];
  generatedAt: string;
}

export interface BatchFileView {
  id: string;
  originalName: string;
  sizeBytes: number;
  sequenceNumber?: number;
  rowCount: number | null;
  validRowCount: number | null;
  rejectedRowCount: number | null;
  errorCode: ErrorCode | null;
  errorMessage: string | null;
  checksum: string | null;
}

export interface JobView {
  id: string;
  fileId: string;
  fileName: string;
  sequenceNumber?: number;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  errorCode: ErrorCode | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface BatchCounts {
  totalFiles: number;
  queued: number;
  processing: number;
  retrying: number;
  completed: number;
  failed: number;
  retried: number;
}

export interface BatchSummary {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  partialFailure: boolean;
  fileCount: number;
  totalBytes: number;
  counts: BatchCounts;
  progressPercent: number;
  reportStatus: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDetail extends BatchSummary {
  files: BatchFileView[];
  jobs: JobView[];
}

export interface ReportStatusInfo {
  status: ReportStatus;
  fileName: string | null;
  sizeBytes: number | null;
  generatedAt: string | null;
  downloadUrl: string | null;
  errorCode: ErrorCode | null;
}

export interface QueueHealth {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  workersOnline: number;
  healthy: boolean;
}

export interface DashboardResponse {
  batch: BatchSummary;
  files: JobView[];
  fields: FieldStatistics[];
  dataQuality: DataQualityReport | null;
  byTransactionType: GroupAggregate[];
  byBranch: GroupAggregate[];
  daily: DailyAggregate[];
  largestTransaction: LargestTransaction | null;
  highRisk: HighRiskSummary | null;
  queue: QueueHealth;
}

export interface CheckResult {
  name: string;
  ok: boolean;
  latencyMs: number | null;
  detail?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'unavailable';
  version: string;
  uptimeSeconds: number;
  checks: CheckResult[];
}
