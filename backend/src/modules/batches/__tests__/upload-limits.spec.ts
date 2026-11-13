import { describe, expect, it } from 'vitest';
import { AppError, ERROR_CODES, UPLOAD_LIMITS, validateUploadLimits } from '../../../shared';
import { assertUploadConstraints } from '../policies/upload-limits.policy';

const csvMeta = (index: number, overrides: Partial<{ originalName: string; sizeBytes: number; mimeType: string }> = {}) => ({
  originalName: `transactions_${String(index).padStart(2, '0')}.csv`,
  sizeBytes: 1_024,
  mimeType: 'text/csv',
  ...overrides,
});

const csvFile = (index: number, overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    originalname: `transactions_${String(index).padStart(2, '0')}.csv`,
    mimetype: 'text/csv',
    size: 1_024,
    buffer: Buffer.from('id,risk_score\n'),
    ...overrides,
  }) as Express.Multer.File;

const codes = (violations: ReturnType<typeof validateUploadLimits>) => violations.map((v) => v.code);

describe('validateUploadLimits', () => {
  it('accepts a well-formed batch', () => {
    expect(validateUploadLimits([csvMeta(1), csvMeta(2)])).toEqual([]);
  });

  it('rejects an empty selection', () => {
    expect(codes(validateUploadLimits([]))).toEqual([ERROR_CODES.EMPTY_BATCH]);
  });

  it(`rejects more than ${UPLOAD_LIMITS.MAX_FILES_PER_BATCH} files`, () => {
    const files = Array.from({ length: UPLOAD_LIMITS.MAX_FILES_PER_BATCH + 1 }, (_, i) => csvMeta(i));
    expect(codes(validateUploadLimits(files))).toEqual([ERROR_CODES.TOO_MANY_FILES]);
  });

  it('accepts the configured maximum number of files', () => {
    const files = Array.from({ length: UPLOAD_LIMITS.MAX_FILES_PER_BATCH }, (_, i) => csvMeta(i));
    expect(validateUploadLimits(files)).toEqual([]);
  });

  it('rejects a single file above the per-file cap', () => {
    const violations = validateUploadLimits([csvMeta(1, { sizeBytes: UPLOAD_LIMITS.MAX_FILE_BYTES + 1 })]);
    expect(codes(violations)).toEqual([ERROR_CODES.FILE_TOO_LARGE]);
    expect(violations[0]?.details).toEqual({ files: ['transactions_01.csv'] });
  });

  it('rejects an aggregate above the batch cap even when every file is legal', () => {
    const perFile = 6 * 1024 * 1024;
    const files = Array.from({ length: 20 }, (_, i) => csvMeta(i, { sizeBytes: perFile }));
    expect(perFile * files.length).toBeGreaterThan(UPLOAD_LIMITS.MAX_BATCH_BYTES);
    expect(codes(validateUploadLimits(files))).toEqual([ERROR_CODES.BATCH_TOO_LARGE]);
  });

  it('rejects a non-csv extension case-insensitively normalised', () => {
    expect(codes(validateUploadLimits([csvMeta(1, { originalName: 'transactions_01.xlsx' })]))).toEqual([
      ERROR_CODES.UNSUPPORTED_FILE_TYPE,
    ]);
    expect(validateUploadLimits([csvMeta(1, { originalName: 'TRANSACTIONS_01.CSV' })])).toEqual([]);
  });

  it('rejects a contradicting media type but tolerates a missing one', () => {
    expect(codes(validateUploadLimits([csvMeta(1, { mimeType: 'application/pdf' })]))).toEqual([
      ERROR_CODES.UNSUPPORTED_FILE_TYPE,
    ]);
    expect(validateUploadLimits([csvMeta(1, { mimeType: '' })])).toEqual([]);
    expect(validateUploadLimits([csvMeta(1, { mimeType: 'application/vnd.ms-excel' })])).toEqual([]);
  });
});

describe('assertUploadConstraints', () => {
  it('passes a legal batch through', () => {
    expect(() => assertUploadConstraints([csvFile(1), csvFile(2)])).not.toThrow();
  });

  it('throws a domain error carrying the shared message and details', () => {
    const act = () => assertUploadConstraints([csvFile(1, { originalname: 'transactions_01.txt' })]);

    expect(act).toThrowError(AppError);
    try {
      act();
    } catch (error) {
      const appError = error as AppError;
      expect(appError.code).toBe(ERROR_CODES.UNSUPPORTED_FILE_TYPE);
      expect(appError.httpStatus).toBe(415);
      expect(appError.details).toEqual({ files: ['transactions_01.txt'] });
    }
  });

  it('treats an absent file list as an empty batch', () => {
    const act = () => assertUploadConstraints([]);
    expect(act).toThrowError(AppError);
    try {
      act();
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.EMPTY_BATCH);
    }
  });
});
