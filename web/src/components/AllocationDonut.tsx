import React, { useState } from 'react';
import { PortfolioSummary, CurrencyPref, formatFiat } from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';
import { PieChart } from 'lucide-react';
import { Language, translations } from '../lib/i18n';

interface AllocationDonutProps {
  summary: PortfolioSummary;
  currency: CurrencyPref;
  isDark?: boolean;
  lang?: Language;
}

export function AllocationDonut({ summary, currency, isDark = false, lang = 'id' }: AllocationDonutProps) {
  const t = translations[lang];
  const { tonPercent, evmPercent, solanaPercent } = summary.allocation;
  const totalVal = summary.totalValueUsd;
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  // Distinct chain color scheme with high contrast in both Light & Dark modes
  const slices = [
    {
      id: 'evm',
      name: 'EVM L1 & L2',
      percent: evmPercent,
      color: '#B8860B', // Warm Sandstone Gold
      darkColor: '#F59E0B', // Amber Gold
      subtext: 'ETH, BSC, Base, Arb, Pol',
    },
    {
      id: 'ton',
      name: 'TON Chain',
      percent: tonPercent,
      color: '#0088CC', // Vibrant TON Blue
      darkColor: '#38BDF8', // Cyan Sky
      subtext: 'TON, Jettons',
    },
    {
      id: 'solana',
      name: 'Solana',
      percent: solanaPercent,
      color: '#10B981', // Crisp Emerald
      darkColor: '#34D399', // Mint Jade
      subtext: 'SOL, SPL Tokens',
    },
  ];

  // SVG Donut geometry
  const size = 110;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative offsets
  let cumulativePercent = 0;
  const activeSlices = slices
    .filter((s) => s.percent > 0)
    .map((s) => {
      const strokeDasharray = `${(s.percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent / 100) * circumference);
      cumulativePercent += s.percent;
      return {
        ...s,
        strokeDasharray,
        strokeDashoffset,
      };
    });

  const activeChainCount = slices.filter((s) => s.percent > 0).length;

  return (
    <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2.5">
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
            <PieChart className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
          </div>
          <span>{t.home.allocationTitle}</span>
        </span>
        <span className="text-brand-subdued font-mono text-[11px]">
          {activeChainCount > 0 ? `${activeChainCount} ${t.home.ecosystems}` : t.home.noAssets}
        </span>
      </div>

      {/* Main Donut & Legend Container */}
      <div className="flex items-center justify-around gap-4 py-1">
        {/* SVG Donut */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 animate-donut-entrance"
            role="img"
            aria-label="Grafik alokasi jaringan"
          >
            {/* Background track circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-surface-dim dark:text-surface-container-high-dark"
            />

            {/* Interactive Slices with Dynamic Stroke Expansion */}
            {activeSlices.map((slice) => {
              const isSelected = selectedChain === slice.name;
              const sliceColor = isDark ? slice.darkColor : slice.color;

              return (
                <circle
                  key={slice.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={sliceColor}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap={activeSlices.length > 1 ? 'butt' : 'round'}
                  className="transition-all duration-300 ease-out cursor-pointer hover:opacity-90"
                  onClick={() => {
                    setSelectedChain((prev) => (prev === slice.name ? null : slice.name));
                    haptics.selection();
                  }}
                />
              );
            })}
          </svg>

          {/* Donut Center Metric with Motion */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
            {selectedChain ? (
              <div key={selectedChain} className="animate-japandi-fade-up">
                <span className="text-xs font-mono font-bold leading-tight block truncate max-w-[64px]">
                  {slices.find((s) => s.name === selectedChain)?.percent.toFixed(0)}%
                </span>
                <span className="text-[9px] font-mono text-brand-subdued uppercase block truncate max-w-[64px]">
                  {selectedChain.split(' ')[0]}
                </span>
              </div>
            ) : (
              <div className="animate-japandi-fade-up">
                <span className="text-sm font-mono font-semibold leading-tight block">
                  {activeChainCount > 0 ? `${activeChainCount}` : '0'}
                </span>
                <span className="text-[10px] font-mono text-brand-subdued uppercase block">
                  {t.home.chainsCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Accessible Legend with Interactive Slice Highlighting & Stagger Motion */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {slices.map((slice, idx) => {
            const isSelected = selectedChain === slice.name;
            const sliceValUsd = (totalVal * slice.percent) / 100;
            const sliceColor = isDark ? slice.darkColor : slice.color;

            return (
              <div
                key={slice.name}
                onClick={() => {
                  setSelectedChain((prev) => (prev === slice.name ? null : slice.name));
                  haptics.selection();
                }}
                className={`flex items-center justify-between text-xs gap-2 p-1 rounded-button cursor-pointer transition-all animate-stagger-item ${
                  isSelected ? 'bg-surface-dim dark:bg-surface-container-high-dark scale-[1.02]' : 'hover:bg-canvas/60'
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-200"
                    style={{ backgroundColor: sliceColor }}
                  />
                  <div className="truncate">
                    <span className="font-medium text-xs block leading-tight truncate">
                      {slice.name}
                    </span>
                    <span className="text-[10px] font-mono text-brand-subdued truncate block">
                      {slice.subtext}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-semibold block leading-tight">
                    {slice.percent > 0 ? `${slice.percent}%` : '0%'}
                  </span>
                  {totalVal > 0 && slice.percent > 0 && (
                    <span className="text-[10px] font-mono text-brand-subdued block">
                      {formatFiat(sliceValUsd, currency)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
