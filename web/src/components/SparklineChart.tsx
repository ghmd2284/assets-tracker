import React, { useState, useRef } from 'react';
import { formatFiat, CurrencyPref } from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';

interface SparklineChartProps {
  data?: number[];
  changePercent: number;
  currency: CurrencyPref;
}

export function SparklineChart({
  data,
  changePercent,
  currency,
}: SparklineChartProps) {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 320;
  const height = 54;
  const paddingY = 6;

  // Compute (x, y) coordinates
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * (height - paddingY * 2);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Closed path for subtle background gradient fill
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Color selection based on directional delta
  const strokeColor =
    changePercent > 0 ? '#2E6A34' : changePercent < 0 ? '#A83832' : '#2C2623';
  const fillGradientId = `sparkline-gradient-${changePercent >= 0 ? 'gain' : 'loss'}`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const fraction = touchX / rect.width;
    const idx = Math.round(fraction * (data.length - 1));

    if (idx !== scrubIndex) {
      setScrubIndex(idx);
      haptics.selection();
    }
  };

  const handlePointerLeave = () => {
    setScrubIndex(null);
  };

  const activePoint = scrubIndex !== null ? points[scrubIndex] : null;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-[64px] touch-none select-none cursor-crosshair mt-1 flex flex-col justify-end"
    >
      {/* Active Scrubber Tooltip */}
      {activePoint && (
        <div
          className="absolute -top-3 z-10 px-2 py-0.5 rounded-full bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary text-[10px] font-mono shadow-md transform -translate-x-1/2 pointer-events-none transition-transform"
          style={{ left: `${(activePoint.x / width) * 100}%` }}
        >
          {formatFiat(activePoint.val, currency)}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle Area Fill */}
        <path d={areaD} fill={`url(#${fillGradientId})`} />

        {/* Line Stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End-Point Live Pulse Beacon (When not scrubbing) */}
        {!activePoint && points.length > 0 && (
          <g>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4.5"
              fill={strokeColor}
              opacity="0.25"
              className="animate-ping"
            />
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="2.5"
              fill={strokeColor}
            />
          </g>
        )}

        {/* Scrubber Guideline & Point */}
        {activePoint && (
          <>
            <line
              x1={activePoint.x}
              y1="0"
              x2={activePoint.x}
              y2={height}
              stroke="#D6C7B2"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3.5"
              fill={strokeColor}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>
    </div>
  );
}

