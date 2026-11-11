import React, { useState } from 'react';
import { PortfolioSummary, CurrencyPref, formatFiat } from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';
import { PieChart } from 'lucide-react';

interface AllocationDonutProps {
  summary: PortfolioSummary;
  currency: CurrencyPref;
}

export function AllocationDonut({ summary, currency }: AllocationDonutProps) {
  const { tonPercent, evmPercent, solanaPercent } = summary.allocation;
  const totalVal = summary.totalValueUsd;
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  // Slices configuration in Japandi Mineral Palette
  const slices = [
    {
      name: 'EVM L1 & L2',
      percent: evmPercent,
      color: '#9E7B56', // Warm Amber Sandstone
      darkColor: '#BD966E',
      subtext: 'ETH, BSC, Base, Arb, Pol',
    },
    {
      name: 'TON Chain',
      percent: tonPercent,
      color: '#3B728C', // Muted Mineral Cyan / Slate
      darkColor: '#5A94B0',
      subtext: 'TON, Jettons',
    },
    {
      name: 'Solana',
      percent: solanaPercent,
      color: '#5F8569', // Muted Moss Sage
      darkColor: '#7BA486',
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
      <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2">
        <span className="flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-brand-subdued" />
          Alokasi Portofolio
        </span>
        <span className="text-brand-subdued font-mono text-[11px]">
          {activeChainCount > 0 ? `${activeChainCount} Ekosistem` : 'Belum Ada Aset'}
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
            className="transform -rotate-90"
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

              return (
                <circle
                  key={slice.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
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
                  Chains
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
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
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

