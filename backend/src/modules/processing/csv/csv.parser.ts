import { parse } from 'csv-parse/sync';
import { ERROR_CODES, REQUIRED_COLUMNS, UPLOAD_LIMITS } from '../../../shared';
import { FileProcessingError } from '../errors/processing-error';

export interface RawCsvRow {
  /** 1-based physical line (header is line 1). */
  rowNumber: number;
  cells: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
  encoding: 'utf-8' | 'utf-16le' | 'utf-16be';
}

function decodeBuffer(buffer: Buffer): { text: string; encoding: ParsedCsv['encoding'] } {
  if (buffer.length === 0) {
    throw new FileProcessingError(ERROR_CODES.FILE_UNREADABLE, 'The file is empty.');
  }

  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    const text = new TextDecoder('utf-16le').decode(buffer).replace(/^\uFEFF/, '');
    return { text, encoding: 'utf-16le' };
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    const text = new TextDecoder('utf-16be').decode(buffer).replace(/^\uFEFF/, '');
    return { text, encoding: 'utf-16be' };
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new FileProcessingError(
      ERROR_CODES.UNSUPPORTED_ENCODING,
      'The file is not valid UTF-8 or UTF-16 text.',
    );
  }

  // Strip a UTF-8 BOM so the first header token stays clean.
  return { text: text.replace(/^\uFEFF/, ''), encoding: 'utf-8' };
}

function normalizeHeaders(rawHeaders: readonly string[]): string[] {
  return rawHeaders.map((header) => header.trim().toLowerCase());
}

/**
 * Parses a CSV buffer into header/row structures. Structural problems fail the
 * whole file (FILE_UNREADABLE / MISSING_REQUIRED_COLUMN); malformed individual
 * rows are left for row-level validation to reject.
 */
export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  const { text, encoding } = decodeBuffer(buffer);

  let grid: string[][];
  try {
    grid = parse(text, {
      bom: false,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    }) as string[][];
  } catch {
    throw new FileProcessingError(ERROR_CODES.FILE_UNREADABLE, 'The CSV structure is invalid.');
  }

  const headerRow = grid[0];
  if (!headerRow || headerRow.length === 0) {
    throw new FileProcessingError(ERROR_CODES.FILE_UNREADABLE, 'The file has no header row.');
  }

  const headers = normalizeHeaders(headerRow);
  if (new Set(headers).size !== headers.length) {
    throw new FileProcessingError(
      ERROR_CODES.FILE_UNREADABLE,
      'The file contains duplicate column headers.',
    );
  }

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new FileProcessingError(
      ERROR_CODES.MISSING_REQUIRED_COLUMN,
      'The file is missing one or more required columns.',
      { missingColumns },
    );
  }

  if (grid.length - 1 > UPLOAD_LIMITS.MAX_ROWS_PER_FILE) {
    throw new FileProcessingError(ERROR_CODES.FILE_UNREADABLE, 'The file exceeds the row limit.', {
      maxRows: UPLOAD_LIMITS.MAX_ROWS_PER_FILE,
      rows: grid.length - 1,
    });
  }

  const rows: RawCsvRow[] = [];
  for (let index = 1; index < grid.length; index += 1) {
    const line = grid[index];
    if (!line) {
      continue;
    }
    const cells: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      cells[header] = line[columnIndex] ?? '';
    });
    rows.push({ rowNumber: index + 1, cells });
  }

  return { headers, rows, encoding };
}
