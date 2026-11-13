/**
 * Generates samples/reports/sample-report.xlsx without running the stack.
 *
 *   npx tsx scripts/generate-sample-report.ts
 *
 * It exercises the real parser, validator, analysis builder and Excel builder on
 * the reference CSVs, substituting only the persistence layer.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type {
  BatchDetail,
  BatchFileView,
  DataQualityReport,
  FileAnalysis,
  JobView,
  RejectedRow,
} from '../backend/src/shared';
import { parseCsvBuffer } from '../backend/src/modules/processing/csv/csv.parser';
import { validateRows, type ValidatedRow } from '../backend/src/modules/processing/validation/row.validator';
import { buildFileAnalysis } from '../backend/src/modules/processing/analysis/analysis.builder';
import { mergeDataQuality } from '../backend/src/modules/processing/persistence/file-analysis.repository';
import { analyzeRowFields } from '../backend/src/modules/processing/analysis/row-fields';
import { buildReportWorkbook } from '../backend/src/modules/reports/excel/workbook.builder';

const ROOT = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT, 'samples', 'uploads');
const OUTPUT = path.join(ROOT, 'samples', 'reports', 'sample-report.xlsx');
const BATCH_ID = '6712ab34cd56ef7890123456';

function fileIdFor(index: number): string {
  return (index + 1).toString(16).padStart(24, '0');
}

function main(): void {
  const csvFiles = readdirSync(UPLOAD_DIR)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .sort();

  if (csvFiles.length === 0) {
    throw new Error(`No CSVs found in ${UPLOAD_DIR}`);
  }

  const analyses: FileAnalysis[] = [];
  const rows: ValidatedRow[] = [];
  const rejectedRows: RejectedRow[] = [];
  const sizes: number[] = [];
  const fileViews: BatchFileView[] = [];
  const jobViews: JobView[] = [];

  csvFiles.forEach((fileName, index) => {
    const filePath = path.join(UPLOAD_DIR, fileName);
    const parsed = parseCsvBuffer(readFileSync(filePath));
    const outcome = validateRows(parsed.rows);
    const fileId = fileIdFor(index);

    const analysis = buildFileAnalysis({
      fileId,
      fileName,
      rows: outcome.rows,
      dataQuality: outcome.dataQuality,
    });

    analyses.push(analysis);
    rows.push(...outcome.rows);
    rejectedRows.push(...outcome.dataQuality.rejectedRowSamples);

    const sizeBytes = statSync(filePath).size;
    sizes.push(sizeBytes);
    fileViews.push({
      id: fileId,
      originalName: fileName,
      sizeBytes,
      rowCount: analysis.rowCount,
      validRowCount: analysis.validRowCount,
      rejectedRowCount: analysis.rejectedRowCount,
      errorCode: null,
      errorMessage: null,
      checksum: null,
    });
    jobViews.push({
      id: fileId,
      fileId,
      fileName,
      status: 'COMPLETED',
      attempts: 1,
      maxAttempts: 3,
      errorCode: null,
      errorMessage: null,
      startedAt: '2026-11-12T18:00:00.000Z',
      finishedAt: '2026-11-12T18:00:02.000Z',
    });

    console.log(
      `${fileName}: ${analysis.rowCount} rows (${analysis.validRowCount} valid, ${analysis.rejectedRowCount} rejected)`,
    );
  });

  const quality: DataQualityReport = mergeDataQuality(analyses);
  const generatedAt = new Date();
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0);

  const batch: BatchDetail = {
    id: BATCH_ID,
    status: 'COMPLETED',
    partialFailure: quality.rejectedRows > 0,
    fileCount: analyses.length,
    totalBytes,
    counts: {
      totalFiles: analyses.length,
      queued: 0,
      processing: 0,
      retrying: 0,
      completed: analyses.length,
      failed: 0,
      retried: 0,
    },
    progressPercent: 100,
    reportStatus: 'READY',
    createdAt: '2026-11-12T18:00:00.000Z',
    updatedAt: '2026-11-12T18:00:05.000Z',
    files: fileViews,
    jobs: jobViews,
  };

  buildReportWorkbook({
    batch,
    files: analyses,
    rows,
    fields: analyzeRowFields(rows, quality),
    quality,
    rejectedRows,
    generatedAt,
  })
    .then((buffer) => {
      mkdirSync(path.dirname(OUTPUT), { recursive: true });
      writeFileSync(OUTPUT, buffer);
      console.log(
        `\nWrote ${OUTPUT} (${(buffer.length / 1024).toFixed(1)} KB, ${rows.length} valid rows)`,
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

main();
