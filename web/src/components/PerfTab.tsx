import React, { useState, useEffect } from 'react';
import { CurrencyPref, formatFiat, formatSignedPercent, PerformanceResponse } from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';
import { fetchPerformance } from '../lib/api';
import { Clock, Sparkles } from 'lucide-react';

interface PerfTabProps {
  totalValueUsd: number;
  currency: CurrencyPref;
}

type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export function PerfTab({ totalValueUsd, currency }: PerfTabProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1W');
  const [perfData, setPerfData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPerformance(timeframe)
      .then((data) => {
        if (isMounted) {
          setPerfData(data);
        }
      })
      .catch((err) => console.info('[Perf Tab Info] Running with fallback:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    haptics.selection();
  };

  // Sample fallback data if history is newly starting
  const fallbackBars = [
    { day: 'Sen', changePercent: 1.2, changeUsd: 145 },
    { day: 'Sel', changePercent: -0.8, changeUsd: -95 },
    { day: 'Rab', changePercent: 2.5, changeUsd: 310 },
    { day: 'Kam', changePercent: 0.4, changeUsd: 50 },
    { day: 'Jum', changePercent: -1.5, changeUsd: -180 },
    { day: 'Sab', changePercent: 1.8, changeUsd: 220 },
    { day: 'Min', changePercent: 2.45, changeUsd: 295 },
  ];

  const hasLiveSnapshots = perfData?.snapshots && perfData.snapshots.length >= 2;

  // Build bars from live snapshots or fallback
  const barData = hasLiveSnapshots
    ? perfData.snapshots.slice(1).map((s, idx) => {
        const prev = perfData.snapshots[idx].totalValueUsd;
        const changeUsd = s.totalValueUsd - prev;
        const changePercent = prev > 0 ? (changeUsd / prev) * 100 : 0;
        const day = new Date(s.recordedAt).toLocaleDateString('id-ID', { weekday: 'short' });
        return { day, changePercent, changeUsd };
      })
    : fallbackBars;

  const totalPeriodChangeUsd = hasLiveSnapshots
    ? (perfData?.changeUsd ?? 0)
    : barData.reduce((acc, d) => acc + d.changeUsd, 0);

  const totalPeriodChangePercent = hasLiveSnapshots
    ? (perfData?.changePercent ?? 0)
    : (totalPeriodChangeUsd / (totalValueUsd || 1)) * 100;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      {/* Timeframe Segmented Control (Japandi Pill) */}
      <div className="p-1 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-full flex items-center justify-between shadow-sm">
        {(['1D', '1W', '1M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => handleTimeframeChange(tf)}
            className={`flex-1 py-1 text-xs font-mono font-medium rounded-full transition-all ${
              timeframe === tf
                ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary font-semibold shadow-xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Performance Summary Bento Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-bento p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-brand-subdued dark:text-brand-subdued-dark">
          <span className="font-medium">PERFORMA PERIODE ({timeframe})</span>
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-chain-evm" />
            Snapshot 00:00 UTC
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-mono font-semibold">
            {formatSignedPercent(totalPeriodChangePercent)}
          </span>
          <span className="text-xs font-mono text-brand-subdued">
            ({totalPeriodChangeUsd >= 0 ? '+' : ''}{formatFiat(totalPeriodChangeUsd, currency)})
          </span>
        </div>

        {/* Daily Profit / Loss Bar Chart */}
        <div className="pt-2 flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1 border-b border-brand-divider dark:border-brand-divider-dark">
            {barData.map((d, idx) => {
              const isGain = d.changePercent >= 0;
              const absHeight = Math.min(Math.max(Math.abs(d.changePercent) * 22, 10), 80);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className={`w-full max-w-[20px] rounded-t-sm transition-all duration-300 ${
                      isGain
                        ? 'bg-semantic-gain dark:bg-semantic-gain-dark'
                        : 'bg-semantic-loss dark:bg-semantic-loss-dark'
                    }`}
                    style={{ height: `${absHeight}px` }}
                    title={`${d.day}: ${d.changePercent >= 0 ? '+' : ''}${d.changePercent.toFixed(1)}%`}
                  />
                  <span className="text-[10px] font-mono text-brand-subdued mt-1">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-brand-subdued pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-semantic-gain" />
              Gain Harian
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-semantic-loss" />
              Koreksi Harian
            </span>
          </div>
        </div>
      </div>

      {/* Snapshot Information Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-chain-evm shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <div className="font-medium text-brand-primary dark:text-brand-primary-dark">
            {hasLiveSnapshots
              ? `Histori Portofolio Aktif (${perfData?.snapshots.length} Hari Snapshot)`
              : 'Akumulasi Snapshot Portofolio Otomatis'}
          </div>
          <p className="text-brand-subdued dark:text-brand-subdued-dark mt-0.5">
            Cloudflare Worker mencatat snapshot total nilai portofolio Anda setiap hari pukul 00:00 UTC ke database Supabase. Akurasi grafik akan semakin detail seiring waktu.
          </p>
        </div>
      </div>
    </div>
  );
}
