import React from 'react';
import { PortfolioSummary, CurrencyPref, formatFiat } from '@asset-tracker/shared';
import { PieChart } from 'lucide-react';

interface AllocationDonutProps {
  summary: PortfolioSummary;
  currency: CurrencyPref;
}

export function AllocationDonut({ summary, currency }: AllocationDonutProps) {
  const { tonPercent, evmPercent, solanaPercent } = summary.allocation;
  const totalVal = summary.totalValueUsd;

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

            {/* Slices */}
            {activeSlices.map((slice, idx) => (
              <circle
                key={slice.name}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
                style={{
                  stroke: `var(--color-${idx}, ${slice.color})`,
                }}
              />
            ))}
          </svg>

          {/* Donut Center Metric */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-mono font-semibold leading-tight">
              {activeChainCount > 0 ? `${activeChainCount}` : '0'}
            </span>
            <span className="text-[10px] font-mono text-brand-subdued uppercase">
              Chains
            </span>
          </div>
        </div>

        {/* Accessible Legend with Explicit % and Color Swatches (WCAG color-not-only) */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {slices.map((slice) => {
            const valUsd = totalVal * (slice.percent / 100);

            return (
              <div key={slice.name} className="flex items-center justify-between text-xs gap-2">
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
                      {formatFiat(valUsd, currency)}
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
