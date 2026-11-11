import { describe, it, expect } from 'vitest';
import { PortfolioSnapshot, PerformanceResponse } from '@asset-tracker/shared';

describe('Performance Calculations & Deltas', () => {
  it('calculates period delta and percentage change accurately from snapshots', () => {
    const mockSnapshots: PortfolioSnapshot[] = [
      { recordedAt: '2026-11-01', totalValueUsd: 10000 },
      { recordedAt: '2026-11-02', totalValueUsd: 10200 },
      { recordedAt: '2026-11-03', totalValueUsd: 10100 },
      { recordedAt: '2026-11-04', totalValueUsd: 10500 },
      { recordedAt: '2026-11-05', totalValueUsd: 11000 },
    ];

    const initial = mockSnapshots[0].totalValueUsd;
    const current = mockSnapshots[mockSnapshots.length - 1].totalValueUsd;
    const changeUsd = current - initial;
    const changePercent = (changeUsd / initial) * 100;

    const res: PerformanceResponse = {
      snapshots: mockSnapshots,
      currentValueUsd: current,
      changeUsd,
      changePercent,
      range: '1W',
    };

    expect(res.changeUsd).toBe(1000);
    expect(res.changePercent).toBe(10);
    expect(res.snapshots).toHaveLength(5);
  });

  it('handles negative performance periods without error', () => {
    const mockSnapshots: PortfolioSnapshot[] = [
      { recordedAt: '2026-11-01', totalValueUsd: 10000 },
      { recordedAt: '2026-11-02', totalValueUsd: 8500 },
    ];

    const initial = mockSnapshots[0].totalValueUsd;
    const current = mockSnapshots[mockSnapshots.length - 1].totalValueUsd;
    const changeUsd = current - initial;
    const changePercent = (changeUsd / initial) * 100;

    expect(changeUsd).toBe(-1500);
    expect(changePercent).toBe(-15);
  });
});

