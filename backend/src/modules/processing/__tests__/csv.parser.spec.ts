import { describe, expect, it } from 'vitest';
import { ERROR_CODES, REQUIRED_COLUMNS } from '../../../shared';
import { parseCsvBuffer } from '../csv/csv.parser';
import { FileProcessingError } from '../errors/processing-error';

const HEADER = REQUIRED_COLUMNS.join(',');
const ROW_A =
  'TXN-1,CUST-1,BLR001,UPI_PAYMENT,100.5,1000,12.5,42,2026-01-02T03:04:05';
const ROW_B =
  'TXN-2,CUST-2,DEL002,CARD_PAYMENT,200,900,8,81,2026-01-03T00:00:00';

function expectProcessingError(fn: () => unknown, code: string): FileProcessingError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(FileProcessingError);
    const typed = error as FileProcessingError;
    expect(typed.code).toBe(code);
    return typed;
  }
  throw new Error('Expected the parser to throw.');
}

describe('parseCsvBuffer', () => {
  it('maps every data line onto normalized header names', () => {
    const parsed = parseCsvBuffer(Buffer.from(`${HEADER}\n${ROW_A}\n${ROW_B}\n`));

    expect(parsed.encoding).toBe('utf-8');
    expect(parsed.headers).toEqual([...REQUIRED_COLUMNS]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual({
      rowNumber: 2,
      cells: {
        transaction_id: 'TXN-1',
        customer_id: 'CUST-1',
        branch_id: 'BLR001',
        transaction_type: 'UPI_PAYMENT',
        amount: '100.5',
        balance_after: '1000',
        processing_time_ms: '12.5',
        risk_score: '42',
        transaction_date: '2026-01-02T03:04:05',
      },
    });
    expect(parsed.rows[1]?.rowNumber).toBe(3);
  });

  it('strips a UTF-8 BOM and lowercases headers', () => {
    const header = REQUIRED_COLUMNS.map((column) => column.toUpperCase()).join(',');
    const buffer = Buffer.from(`\uFEFF${header}\r\n${ROW_A}\r\n`);

    const parsed = parseCsvBuffer(buffer);
    expect(parsed.headers[0]).toBe('transaction_id');
    expect(parsed.rows[0]?.cells.transaction_id).toBe('TXN-1');
  });

  it('decodes UTF-16LE files with a BOM', () => {
    const text = `${HEADER}\n${ROW_A}\n`;
    const le = Buffer.from(text, 'utf16le');
    const buffer = Buffer.concat([Buffer.from([0xff, 0xfe]), le]);

    const parsed = parseCsvBuffer(buffer);
    expect(parsed.encoding).toBe('utf-16le');
    expect(parsed.rows).toHaveLength(1);
  });

  it('keeps unknown extra columns but never invents required ones', () => {
    const parsed = parseCsvBuffer(
      Buffer.from(`${HEADER},notes\n${ROW_A},hello\n`),
    );
    expect(parsed.rows[0]?.cells.notes).toBe('hello');
  });

  it('fails the file when required columns are absent', () => {
    const header = REQUIRED_COLUMNS.filter((column) => column !== 'risk_score').join(',');
    const row = 'TXN-1,CUST-1,BLR001,UPI_PAYMENT,100.5,1000,12.5,2026-01-02T03:04:05';

    const error = expectProcessingError(
      () => parseCsvBuffer(Buffer.from(`${header}\n${row}\n`)),
      ERROR_CODES.MISSING_REQUIRED_COLUMN,
    );
    expect(error.details).toEqual({ missingColumns: ['risk_score'] });
  });

  it('rejects duplicate headers instead of silently overwriting cells', () => {
    expectProcessingError(
      () => parseCsvBuffer(Buffer.from(`${HEADER},amount\n${ROW_A},1\n`)),
      ERROR_CODES.FILE_UNREADABLE,
    );
  });

  it('rejects empty files', () => {
    expectProcessingError(
      () => parseCsvBuffer(Buffer.alloc(0)),
      ERROR_CODES.FILE_UNREADABLE,
    );
  });

  it('rejects binary payloads that are not UTF-8/UTF-16 text', () => {
    expectProcessingError(
      () => parseCsvBuffer(Buffer.from([0x80, 0x81, 0x82, 0x83])),
      ERROR_CODES.UNSUPPORTED_ENCODING,
    );
  });

  it('rejects files without a header row', () => {
    expectProcessingError(
      () => parseCsvBuffer(Buffer.from('\n\n')),
      ERROR_CODES.FILE_UNREADABLE,
    );
  });
});
