import { describe, expect, it, vi, beforeEach } from 'vitest';
import { finalizeBatchIfComplete } from '../processing.service';
import { refreshBatchState } from '../../batches/batch-status.service';
import { BatchModel } from '../../batches/models/batch.model';
import { enqueueReportGeneration } from '../../jobs/producers/report-generation.producer';

vi.mock('../../batches/batch-status.service', () => ({
  refreshBatchState: vi.fn(),
}));

vi.mock('../../batches/models/batch.model', () => ({
  BatchModel: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../../jobs/producers/report-generation.producer', () => ({
  enqueueReportGeneration: vi.fn(),
}));

describe('finalizeBatchIfComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not enqueue report generation when allTerminal is false', async () => {
    vi.mocked(refreshBatchState).mockResolvedValue({
      status: 'PROCESSING',
      allTerminal: false,
      counts: {
        totalFiles: 20,
        queued: 18,
        processing: 1,
        retrying: 0,
        completed: 1,
        failed: 0,
        retried: 0,
      },
    });

    await finalizeBatchIfComplete('batch-1', 'owner-1');

    expect(BatchModel.updateOne).not.toHaveBeenCalled();
    expect(enqueueReportGeneration).not.toHaveBeenCalled();
  });

  it('enqueues report generation only when allTerminal is true', async () => {
    vi.mocked(refreshBatchState).mockResolvedValue({
      status: 'COMPLETED',
      allTerminal: true,
      counts: {
        totalFiles: 20,
        queued: 0,
        processing: 0,
        retrying: 0,
        completed: 20,
        failed: 0,
        retried: 0,
      },
    });

    vi.mocked(BatchModel.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    vi.mocked(enqueueReportGeneration).mockResolvedValue(undefined as any);

    await finalizeBatchIfComplete('batch-1', 'owner-1');

    expect(BatchModel.updateOne).toHaveBeenCalledWith(
      { _id: 'batch-1', reportStatus: { $in: ['NOT_REQUESTED', 'FAILED'] } },
      { $set: { reportStatus: 'QUEUED', reportErrorCode: null } },
    );
    expect(enqueueReportGeneration).toHaveBeenCalledWith({
      batchId: 'batch-1',
      ownerId: 'owner-1',
    });
  });

  it('does not duplicate enqueue report generation if batch reportStatus was already claimed', async () => {
    vi.mocked(refreshBatchState).mockResolvedValue({
      status: 'COMPLETED',
      allTerminal: true,
      counts: {
        totalFiles: 20,
        queued: 0,
        processing: 0,
        retrying: 0,
        completed: 20,
        failed: 0,
        retried: 0,
      },
    });

    // Another concurrent process won the update
    vi.mocked(BatchModel.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);

    await finalizeBatchIfComplete('batch-1', 'owner-1');

    expect(enqueueReportGeneration).not.toHaveBeenCalled();
  });
});

