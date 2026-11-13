import { describe, expect, it, vi } from 'vitest';
import { refreshBatchState } from '../batch-status.service';
import { BatchModel } from '../models/batch.model';
import { BatchJobModel } from '../models/batch-job.model';

vi.mock('../models/batch.model', () => ({
  BatchModel: {
    findById: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

vi.mock('../models/batch-job.model', () => ({
  BatchJobModel: {
    find: vi.fn(),
  },
}));

describe('refreshBatchState', () => {
  it('returns status PROCESSING and allTerminal false when only a subset of jobs are terminal', async () => {
    vi.mocked(BatchModel.findById).mockResolvedValue({
      fileCount: 5,
    } as any);

    vi.mocked(BatchJobModel.find).mockResolvedValue([
      { status: 'COMPLETED', attempts: 1 },
      { status: 'COMPLETED', attempts: 1 },
      { status: 'QUEUED', attempts: 0 },
      { status: 'QUEUED', attempts: 0 },
      { status: 'QUEUED', attempts: 0 },
    ] as any);

    const snapshot = await refreshBatchState('batch-123');

    expect(snapshot.status).toBe('PROCESSING');
    expect(snapshot.allTerminal).toBe(false);
    expect(snapshot.counts.totalFiles).toBe(5);
    expect(snapshot.counts.completed).toBe(2);
    expect(snapshot.counts.queued).toBe(3);
  });

  it('returns allTerminal false when jobs created in DB is fewer than batch fileCount even if all existing jobs are completed', async () => {
    vi.mocked(BatchModel.findById).mockResolvedValue({
      fileCount: 20,
    } as any);

    // Race condition simulation: only 2 jobs persisted so far
    vi.mocked(BatchJobModel.find).mockResolvedValue([
      { status: 'COMPLETED', attempts: 1 },
      { status: 'COMPLETED', attempts: 1 },
    ] as any);

    const snapshot = await refreshBatchState('batch-123');

    expect(snapshot.status).toBe('PROCESSING');
    expect(snapshot.allTerminal).toBe(false);
    expect(snapshot.counts.totalFiles).toBe(20);
    expect(snapshot.counts.completed).toBe(2);
  });

  it('returns status COMPLETED and allTerminal true when all jobs equal fileCount and are terminal', async () => {
    vi.mocked(BatchModel.findById).mockResolvedValue({
      fileCount: 3,
    } as any);

    vi.mocked(BatchJobModel.find).mockResolvedValue([
      { status: 'COMPLETED', attempts: 1 },
      { status: 'FAILED', attempts: 3 },
      { status: 'COMPLETED', attempts: 1 },
    ] as any);

    const snapshot = await refreshBatchState('batch-123');

    expect(snapshot.status).toBe('COMPLETED');
    expect(snapshot.allTerminal).toBe(true);
    expect(snapshot.counts.totalFiles).toBe(3);
    expect(snapshot.counts.completed).toBe(2);
    expect(snapshot.counts.failed).toBe(1);
  });
});

