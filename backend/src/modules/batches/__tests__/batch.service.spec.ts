import { describe, expect, it } from 'vitest';
import { sortFilesNaturally } from '../batch.service';
import { toBatchSummary } from '../mappers/batch.mapper';

describe('sortFilesNaturally', () => {
  it('sorts numeric file names in natural ascending order', () => {
    const input = [
      { originalname: 'transactions_10.csv' },
      { originalname: 'transactions_02.csv' },
      { originalname: 'transactions_01.csv' },
      { originalname: 'transactions_20.csv' },
      { originalname: 'transactions_03.csv' },
    ];

    const sorted = sortFilesNaturally(input);

    expect(sorted.map((f) => f.originalname)).toEqual([
      'transactions_01.csv',
      'transactions_02.csv',
      'transactions_03.csv',
      'transactions_10.csv',
      'transactions_20.csv',
    ]);
  });

  it('preserves order of already sorted files without mutation', () => {
    const input = [
      { originalname: 'a1.csv' },
      { originalname: 'a2.csv' },
      { originalname: 'a10.csv' },
    ];

    const sorted = sortFilesNaturally(input);
    expect(sorted).not.toBe(input);
    expect(sorted.map((f) => f.originalname)).toEqual(['a1.csv', 'a2.csv', 'a10.csv']);
  });
});

describe('toBatchSummary with live jobs', () => {
  const baseBatch = {
    _id: 'batch_123',
    status: 'QUEUED',
    partialFailure: false,
    fileCount: 4,
    totalBytes: 4096,
    counts: {
      totalFiles: 4,
      queued: 4,
      processing: 0,
      retrying: 0,
      completed: 0,
      failed: 0,
      retried: 0,
    },
    reportStatus: 'NOT_REQUESTED',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  } as any;

  it('computes live counts, dynamic PROCESSING status, and progress percent from jobs', () => {
    const jobs = [
      { status: 'COMPLETED', attempts: 1 },
      { status: 'PROCESSING', attempts: 1 },
      { status: 'QUEUED', attempts: 1 },
      { status: 'QUEUED', attempts: 1 },
    ] as any;

    const summary = toBatchSummary(baseBatch, jobs);

    expect(summary.status).toBe('PROCESSING');
    expect(summary.counts.completed).toBe(1);
    expect(summary.counts.processing).toBe(1);
    expect(summary.counts.queued).toBe(2);
    expect(summary.progressPercent).toBe(25);
  });

  it('computes COMPLETED status and 100% progress when all jobs reach terminal state', () => {
    const jobs = [
      { status: 'COMPLETED', attempts: 1 },
      { status: 'COMPLETED', attempts: 1 },
      { status: 'COMPLETED', attempts: 1 },
      { status: 'FAILED', attempts: 2 },
    ] as any;

    const summary = toBatchSummary(baseBatch, jobs);

    expect(summary.status).toBe('COMPLETED');
    expect(summary.partialFailure).toBe(true);
    expect(summary.counts.completed).toBe(3);
    expect(summary.counts.failed).toBe(1);
    expect(summary.counts.retried).toBe(1);
    expect(summary.progressPercent).toBe(100);
  });
});

