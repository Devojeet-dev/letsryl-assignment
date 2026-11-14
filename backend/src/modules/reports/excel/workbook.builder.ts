import ExcelJS from 'exceljs';
import {
  ANALYSIS_CONSTANTS,
  formatBytes,
  type BatchDetail,
  type DataQualityReport,
  type FieldStatistics,
  type FileAnalysis,
  type RejectedRow,
} from '../../../shared';
import {
  dailyAggregates,
  groupAggregates,
  highRiskSummary,
  largestTransaction,
} from '../../processing/analysis/aggregates';
import type { ValidatedRow } from '../../processing/validation/row.validator';

export interface ReportWorkbookInput {
  batch: BatchDetail;
  files: readonly FileAnalysis[];
  rows: readonly ValidatedRow[];
  fields: readonly FieldStatistics[];
  quality: DataQualityReport;
  rejectedRows: readonly RejectedRow[];
  generatedAt: Date;
}

const NA = 'N/A';
const HEADER_BG = 'FF111827';
const SECTION_COLOR = 'FF1D4ED8';
const MUTED_COLOR = 'FF6B7280';
const MONEY_FORMAT = '#,##0.00';
const NUMBER_FORMAT = '#,##0.00';
const INTEGER_FORMAT = '#,##0';

type CellValue = string | number | null;

function titleRow(ws: ExcelJS.Worksheet, title: string, subtitle?: string): void {
  const row = ws.addRow([title]);
  row.font = { bold: true, size: 15, color: { argb: 'FF0F172A' } };

  if (subtitle) {
    const sub = ws.addRow([subtitle]);
    sub.font = { italic: true, size: 10, color: { argb: MUTED_COLOR } };
  }
  ws.addRow([]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function sectionRow(ws: ExcelJS.Worksheet, label: string): void {
  const row = ws.addRow([label]);
  row.font = { bold: true, size: 11, color: { argb: SECTION_COLOR } };
}

function headerRow(ws: ExcelJS.Worksheet, headers: readonly string[]): ExcelJS.Row {
  const row = ws.addRow([...headers]);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  row.alignment = { vertical: 'middle' };
  return row;
}

function addTable(
  ws: ExcelJS.Worksheet,
  headers: readonly string[],
  rows: readonly (readonly CellValue[])[],
  formats: readonly (string | undefined)[] = [],
): void {
  headerRow(ws, headers);
  for (const values of rows) {
    const row = ws.addRow(values.map((value) => (value === null ? NA : value)));
    formats.forEach((format, index) => {
      if (format) {
        row.getCell(index + 1).numFmt = format;
      }
    });
  }
  ws.addRow([]);
}

function setWidths(ws: ExcelJS.Worksheet, widths: readonly number[]): void {
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
}

function formatTimestamp(value: string | Date | null): string {
  if (!value) return NA;
  return new Date(value).toISOString();
}

function addSummarySheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  const { batch, quality, generatedAt } = input;
  titleRow(ws, 'Batch Summary', `Batch ${batch.id}`);

  sectionRow(ws, 'Batch');
  addTable(
    ws,
    ['Metric', 'Value'],
    [
      ['Batch ID', batch.id],
      ['Status', batch.status],
      ['Partial failure', batch.partialFailure ? 'Yes' : 'No'],
      ['Files', batch.fileCount],
      ['Total size', formatBytes(batch.totalBytes)],
      ['Progress', `${batch.progressPercent}%`],
      ['Report status', batch.reportStatus],
      ['Created at', formatTimestamp(batch.createdAt)],
      ['Updated at', formatTimestamp(batch.updatedAt)],
      ['Report generated at', formatTimestamp(generatedAt)],
    ],
  );

  sectionRow(ws, 'Job outcomes');
  addTable(
    ws,
    ['Queued', 'Processing', 'Retrying', 'Completed', 'Failed', 'Retried'],
    [
      [
        batch.counts.queued,
        batch.counts.processing,
        batch.counts.retrying,
        batch.counts.completed,
        batch.counts.failed,
        batch.counts.retried,
      ],
    ],
    [INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT],
  );

  sectionRow(ws, 'Data volume');
  addTable(
    ws,
    ['Total rows', 'Valid rows', 'Rejected rows'],
    [[quality.totalRows, quality.validRows, quality.rejectedRows]],
    [INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT],
  );

  const highRisk = input.rows.length > 0 ? highRiskSummary(input.rows) : null;
  const largest = largestTransaction(input.rows);

  sectionRow(ws, 'Highlights');
  addTable(
    ws,
    ['Metric', 'Value'],
    [
      [
        `High-risk transactions (risk >= ${ANALYSIS_CONSTANTS.HIGH_RISK_SCORE_THRESHOLD})`,
        highRisk ? highRisk.count : NA,
      ],
      ['High-risk share of valid rows', highRisk?.percentageOfValidRows ?? NA],
      ['Largest transaction id', largest?.transactionId ?? NA],
      ['Largest transaction amount', largest?.amount ?? NA],
    ],
    [undefined, NUMBER_FORMAT],
  );

  setWidths(ws, [46, 42]);
}

function addFileStatusSheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  titleRow(ws, 'File Status', 'One row per uploaded CSV');

  const analysesByFile = new Map(input.files.map((analysis) => [analysis.fileId, analysis]));

  addTable(
    ws,
    ['File', 'Rows', 'Valid', 'Rejected', 'Status', 'Attempts', 'Error code', 'Size'],
    input.batch.files.map((file) => {
      const job = input.batch.jobs.find((candidate) => candidate.fileId === file.id);
      const analysis = analysesByFile.get(file.id);
      return [
        file.originalName,
        analysis?.rowCount ?? file.rowCount,
        analysis?.validRowCount ?? file.validRowCount,
        analysis?.rejectedRowCount ?? file.rejectedRowCount,
        job?.status ?? NA,
        job?.attempts ?? NA,
        file.errorCode,
        formatBytes(file.sizeBytes),
      ];
    }),
    [undefined, INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT],
  );

  const failed = input.batch.files.filter((file) => file.errorCode !== null);
  if (failed.length > 0) {
    sectionRow(ws, 'Files rejected during processing');
    addTable(
      ws,
      ['File', 'Error code', 'Message'],
      failed.map((file) => [file.originalName, file.errorCode, file.errorMessage]),
    );
  }

  setWidths(ws, [30, 12, 12, 12, 14, 12, 26, 12]);
}

function addFieldStatisticsSheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  titleRow(
    ws,
    'Numeric Field Statistics',
    'Valid values only. Blank metrics are rendered as N/A, never as zero.',
  );

  sectionRow(ws, 'Batch level');
  addTable(
    ws,
    [
      'Field',
      'Valid',
      'Missing',
      'Invalid',
      'Total',
      'Mean',
      'Median',
      'Min',
      'Max',
      'Std dev',
      'P25',
      'P75',
      'IQR',
      'Outliers',
      'Outlier %',
    ],
    input.fields.map((field) => [
      field.field,
      field.validCount,
      field.missingCount,
      field.invalidCount,
      field.total,
      field.mean,
      field.median,
      field.min,
      field.max,
      field.stdDev,
      field.p25,
      field.p75,
      field.iqr,
      field.outlierCount,
      field.outlierPercentage,
    ]),
    [
      undefined,
      INTEGER_FORMAT,
      INTEGER_FORMAT,
      INTEGER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      NUMBER_FORMAT,
      INTEGER_FORMAT,
      NUMBER_FORMAT,
    ],
  );

  for (const analysis of input.files) {
    sectionRow(ws, `Per file: ${analysis.fileName}`);
    addTable(
      ws,
      ['Field', 'Valid', 'Missing', 'Invalid', 'Total', 'Mean', 'Median', 'Min', 'Max', 'Std dev', 'P25', 'P75', 'Outliers'],
      analysis.fields.map((field) => [
        field.field,
        field.validCount,
        field.missingCount,
        field.invalidCount,
        field.total,
        field.mean,
        field.median,
        field.min,
        field.max,
        field.stdDev,
        field.p25,
        field.p75,
        field.outlierCount,
      ]),
      [
        undefined,
        INTEGER_FORMAT,
        INTEGER_FORMAT,
        INTEGER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        NUMBER_FORMAT,
        INTEGER_FORMAT,
      ],
    );
  }

  setWidths(ws, [22, 10, 10, 10, 14, 12, 12, 12, 12, 12, 12, 12, 12, 10, 10]);
}

function addDistributionsSheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  titleRow(ws, 'Field Distributions', 'Histograms over valid values');

  for (const field of input.fields) {
    sectionRow(ws, `${field.field} (${field.validCount} valid values)`);
    if (field.histogram.length === 0) {
      addTable(ws, ['Bin from', 'Bin to', 'Count'], [[NA, NA, NA]]);
      continue;
    }
    addTable(
      ws,
      ['Bin from', 'Bin to', 'Count'],
      field.histogram.map((bin) => [bin.lowerBound, bin.upperBound, bin.count]),
      [NUMBER_FORMAT, NUMBER_FORMAT, INTEGER_FORMAT],
    );
  }

  setWidths(ws, [18, 18, 12]);
}

function addDataQualitySheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  const quality = input.quality;
  titleRow(ws, 'Data Quality', 'Invalid rows are reported, never silently dropped.');

  sectionRow(ws, 'Row counts');
  addTable(
    ws,
    ['Total rows', 'Valid rows', 'Rejected rows', 'Invalid dates', 'Duplicate transaction ids'],
    [
      [
        quality.totalRows,
        quality.validRows,
        quality.rejectedRows,
        quality.invalidDateCount,
        quality.duplicateTransactionIdCount,
      ],
    ],
    [INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT, INTEGER_FORMAT],
  );

  sectionRow(ws, 'Missing required values');
  addTable(
    ws,
    ['Column', 'Rows affected'],
    Object.entries(quality.missingRequiredFieldCounts).map(([key, value]) => [key, value]),
    [undefined, INTEGER_FORMAT],
  );

  sectionRow(ws, 'Numeric columns');
  addTable(
    ws,
    ['Column', 'Missing', 'Invalid', 'Invalid samples (row numbers)'],
    Object.keys(quality.missingNumericCounts).map((key) => [
      key,
      quality.missingNumericCounts[key] ?? 0,
      quality.invalidNumericCounts[key] ?? 0,
      (quality.invalidNumericSamples[key] ?? []).join(', ') || NA,
    ]),
    [undefined, INTEGER_FORMAT, INTEGER_FORMAT],
  );

  sectionRow(ws, 'Invalid dates');
  addTable(
    ws,
    ['Rows affected', 'Sample row numbers'],
    [[quality.invalidDateCount, quality.invalidDateSamples.join(', ') || NA]],
    [INTEGER_FORMAT],
  );

  sectionRow(ws, `Duplicate transaction ids (${quality.duplicateGroups.length} groups retained)`);
  addTable(
    ws,
    ['Transaction id', 'Occurrences', 'Row numbers'],
    quality.duplicateGroups.map((group) => [
      group.transactionId,
      group.occurrences,
      group.rowNumbers.join(', '),
    ]),
    [undefined, INTEGER_FORMAT],
  );

  if (quality.missingHeaders.length > 0) {
    sectionRow(ws, 'Files with missing required columns');
    addTable(ws, ['Missing column'], quality.missingHeaders.map((column) => [column]));
  }

  setWidths(ws, [34, 14, 14, 46]);
}

function addBreakdownSheet(
  ws: ExcelJS.Worksheet,
  title: string,
  description: string,
  label: string,
  rows: readonly { key: string; count: number; totalAmount: number }[],
): void {
  titleRow(ws, title, description);
  addTable(
    ws,
    [label, 'Transactions', 'Total amount'],
    rows.map((row) => [row.key, row.count, row.totalAmount]),
    [undefined, INTEGER_FORMAT, MONEY_FORMAT],
  );
  setWidths(ws, [26, 16, 18]);
}

function addDailySheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  const daily = dailyAggregates(input.rows);
  titleRow(ws, 'Date-wise Breakdown', 'Grouped by UTC calendar day');

  addTable(
    ws,
    ['Date', 'Transactions', 'Total amount'],
    daily.map((row) => [row.date, row.count, row.totalAmount]),
    [undefined, INTEGER_FORMAT, MONEY_FORMAT],
  );

  setWidths(ws, [16, 16, 18]);
}

function addHighRiskSheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  titleRow(
    ws,
    'High-risk Transactions',
    `risk_score >= ${ANALYSIS_CONSTANTS.HIGH_RISK_SCORE_THRESHOLD}`,
  );

  if (input.rows.length === 0) {
    addTable(ws, ['Metric', 'Value'], [['High-risk transactions', NA]]);
    return;
  }

  const summary = highRiskSummary(input.rows);
  sectionRow(ws, 'Summary');
  addTable(
    ws,
    ['Threshold', 'Count', 'Total amount', 'Share of valid rows'],
    [[summary.threshold, summary.count, summary.totalAmount, summary.percentageOfValidRows]],
    [NUMBER_FORMAT, INTEGER_FORMAT, MONEY_FORMAT, NUMBER_FORMAT],
  );

  sectionRow(ws, 'Top transactions');
  addTable(
    ws,
    ['Transaction id', 'Amount', 'Risk score', 'Branch', 'Type', 'Date'],
    summary.topTransactions.map((row) => [
      row.transactionId,
      row.amount,
      row.riskScore,
      row.branchId,
      row.transactionType,
      row.transactionDate,
    ]),
    [undefined, MONEY_FORMAT, NUMBER_FORMAT],
  );

  setWidths(ws, [30, 16, 14, 14, 20, 14]);
}

function addRejectedRowsSheet(ws: ExcelJS.Worksheet, input: ReportWorkbookInput): void {
  titleRow(
    ws,
    'Rejected Rows',
    `Sample capped at ${ANALYSIS_CONSTANTS.MAX_REJECTED_ROWS_RETAINED} rows per file`,
  );

  addTable(
    ws,
    ['Row number', 'Reason', 'Transaction id'],
    input.rejectedRows.map((row) => [row.rowNumber, row.reason, row.transactionId]),
    [INTEGER_FORMAT],
  );

  setWidths(ws, [12, 70, 26]);
}

/**
 * Builds the deliverable workbook. Every sheet is derived from persisted
 * analysis snapshots and valid rows, so the report is reproducible from a
 * batch id alone.
 */
export async function buildReportWorkbook(input: ReportWorkbookInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Batch Financial Data Processor';
  workbook.created = input.generatedAt;
  workbook.modified = input.generatedAt;
  workbook.title = `Batch ${input.batch.id} report`;

  addSummarySheet(workbook.addWorksheet('Summary'), input);
  addFileStatusSheet(workbook.addWorksheet('File Status'), input);
  addFieldStatisticsSheet(workbook.addWorksheet('Field Statistics'), input);
  addDistributionsSheet(workbook.addWorksheet('Distributions'), input);
  addDataQualitySheet(workbook.addWorksheet('Data Quality'), input);
  addBreakdownSheet(
    workbook.addWorksheet('By Transaction Type'),
    'Breakdown by Transaction Type',
    'Valid rows only',
    'Transaction type',
    groupAggregates(input.rows, (row) => row.transactionType, (row) => row.amount),
  );
  addBreakdownSheet(
    workbook.addWorksheet('By Branch'),
    'Breakdown by Branch',
    'Valid rows only',
    'Branch',
    groupAggregates(input.rows, (row) => row.branchId, (row) => row.amount),
  );
  addDailySheet(workbook.addWorksheet('Date Wise'), input);
  addHighRiskSheet(workbook.addWorksheet('High Risk'), input);
  addRejectedRowsSheet(workbook.addWorksheet('Rejected Rows'), input);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
