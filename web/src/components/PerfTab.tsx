import React, { useState, useEffect } from 'react';
import { CurrencyPref, formatFiat, formatSignedPercent, PerformanceResponse } from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';
import { fetchPerformance } from '../lib/api';
import { Clock, Sparkles } from 'lucide-react';
import { PerfSkeleton } from './Skeletons';
import { Language, translations } from '../lib/i18n';

interface PerfTabProps {
  totalValueUsd: number;
  currency: CurrencyPref;
  lang?: Language;
}

type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export function PerfTab({ totalValueUsd, currency, lang = 'id' }: PerfTabProps) {
  const t = translations[lang];
  const [timeframe, setTimeframe] = useState<Timeframe>('1W');
  const [perfData, setPerfData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setSelectedBarIndex(null);

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

  const hasLiveSnapshots = perfData?.snapshots && perfData.snapshots.length >= 2;

  // Build bars from live snapshots
  const barData = hasLiveSnapshots
    ? perfData.snapshots.slice(1).map((s, idx) => {
        const prev = perfData.snapshots[idx].totalValueUsd;
        const changeUsd = s.totalValueUsd - prev;
        const changePercent = prev > 0 ? (changeUsd / prev) * 100 : 0;
        const locale = lang === 'id' ? 'id-ID' : 'en-US';
        const day = new Date(s.recordedAt).toLocaleDateString(locale, { weekday: 'short' });
        return { day, changePercent, changeUsd };
      })
    : [];

  const totalPeriodChangeUsd = hasLiveSnapshots ? (perfData?.changeUsd ?? 0) : 0;
  const totalPeriodChangePercent = hasLiveSnapshots ? (perfData?.changePercent ?? 0) : 0;

  return (
    <div className="flex flex-col gap-4 animate-japandi-fade-up">
      {/* Timeframe Segmented Control (Japandi Pill) */}
      <div className="p-1 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-full flex items-center justify-between shadow-2xs">
        {(['1D', '1W', '1M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => handleTimeframeChange(tf)}
            className={`flex-1 min-h-[38px] py-1 text-xs font-mono font-medium rounded-full active:scale-95 transition-all flex items-center justify-center ${
              timeframe === tf
                ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary font-semibold shadow-xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label={`Pilih rentang waktu ${tf}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Performance Summary Bento Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-bento p-5 shadow-sm flex flex-col gap-3 transition-all">
        <div className="flex items-center justify-between text-xs text-brand-subdued dark:text-brand-subdued-dark">
          <span className="font-semibold flex items-center gap-2 text-brand-primary dark:text-brand-primary-dark">
            <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
            </div>
            {t.perf.periodPerf} ({timeframe})
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-chain-evm animate-pulse-glow" />
            {t.perf.snapshotTime}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-semibold tracking-tight">
            {formatSignedPercent(totalPeriodChangePercent)}
          </span>
          <span className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark">
            ({totalPeriodChangeUsd >= 0 ? '+' : ''}{formatFiat(totalPeriodChangeUsd, currency)})
          </span>
        </div>

        {/* Daily Profit / Loss Bar Chart with Interactive Tap Feedback & Skeleton Loading */}
        {loading ? (
          <PerfSkeleton />
        ) : hasLiveSnapshots && barData.length > 0 ? (
          <div className="pt-2 flex flex-col gap-2">
            <div className="relative flex items-end justify-between gap-2 h-28 pt-6 pb-1 border-b border-brand-divider dark:border-brand-divider-dark">
              {barData.map((d, idx) => {
                const isGain = d.changePercent >= 0;
                const absHeight = Math.min(Math.max(Math.abs(d.changePercent) * 22, 10), 80);
                const isSelected = selectedBarIndex === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedBarIndex((prev) => (prev === idx ? null : idx));
                      haptics.selection();
                    }}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end group focus:outline-none relative"
                    aria-label={`${d.day}: ${d.changePercent >= 0 ? '+' : ''}${d.changePercent.toFixed(1)}%`}
                  >
                    {isSelected && (
                      <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary font-mono text-[10px] font-semibold whitespace-nowrap shadow-md animate-japandi-fade-up z-10">
                        {d.changePercent >= 0 ? '+' : ''}{d.changePercent.toFixed(1)}% ({d.changeUsd >= 0 ? '+' : ''}{formatFiat(d.changeUsd, currency)})
                      </div>
                    )}
                    <div
                      className={`w-full max-w-[20px] rounded-t-md transition-all duration-200 group-hover:opacity-90 ${
                        isSelected ? 'ring-2 ring-brand-primary dark:ring-brand-primary-dark scale-105 shadow-xs' : ''
                      } ${
                        isGain
                          ? 'bg-semantic-gain dark:bg-semantic-gain-dark'
                          : 'bg-semantic-loss dark:bg-semantic-loss-dark'
                      }`}
                      style={{ height: `${absHeight}px` }}
                    />
                    <span
                      className={`text-[10px] font-mono mt-1 ${
                        isSelected
                          ? 'font-bold text-brand-primary dark:text-brand-primary-dark'
                          : 'text-brand-subdued'
                      }`}
                    >
                      {d.day}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-brand-subdued pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-semantic-gain" />
                {t.perf.dailyGain}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-semantic-loss" />
                {t.perf.dailyLoss}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-brand-subdued border-t border-brand-divider dark:border-brand-divider-dark mt-2">
            {t.perf.noSnapshots}
          </div>
        )}
      </div>

      {/* Snapshot Information Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-chain-evm shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <div className="font-medium text-brand-primary dark:text-brand-primary-dark">
            {hasLiveSnapshots
              ? t.perf.snapshotInfoActive(perfData?.snapshots.length ?? 0)
              : t.perf.snapshotInfoTitle}
          </div>
          <p className="text-brand-subdued dark:text-brand-subdued-dark mt-0.5">
            {t.perf.snapshotInfoDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
