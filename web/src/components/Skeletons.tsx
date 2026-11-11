import React from 'react';

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-japandi-fade" aria-busy="true" aria-label="Memuat portofolio...">
      {/* Hero Bento Card Skeleton */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border/60 dark:border-brand-border-dark/60 rounded-bento p-5 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 rounded skeleton-box" />
          <div className="h-3 w-20 rounded skeleton-box" />
        </div>

        <div className="h-9 w-48 rounded-lg skeleton-box mt-1" />

        <div className="flex items-center gap-2 mt-0.5">
          <div className="h-5 w-24 rounded-full skeleton-box" />
          <div className="h-4 w-20 rounded skeleton-box" />
        </div>

        {/* Sparkline track placeholder */}
        <div className="h-12 w-full rounded-md skeleton-box mt-2 opacity-60" />
      </div>

      {/* Action Button Skeleton */}
      <div className="h-11 w-full rounded-button skeleton-box" />

      {/* Allocation Donut Skeleton */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border/60 dark:border-brand-border-dark/60 rounded-tile p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-brand-divider dark:border-brand-divider-dark">
          <div className="h-3.5 w-32 rounded skeleton-box" />
          <div className="h-3 w-16 rounded skeleton-box" />
        </div>

        <div className="flex items-center justify-around gap-4 py-2">
          {/* Donut Circle Skeleton */}
          <div className="w-[100px] h-[100px] rounded-full border-[14px] border-surface-dim/70 dark:border-surface-container-high-dark/70 skeleton-box shrink-0" />

          {/* Legend Placeholders */}
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="h-3.5 w-full rounded skeleton-box" />
            <div className="h-3.5 w-4/5 rounded skeleton-box" />
            <div className="h-3.5 w-3/5 rounded skeleton-box" />
          </div>
        </div>
      </div>

      {/* Connected Chains Bar Skeleton */}
      <div className="flex items-center justify-between px-1">
        <div className="h-3 w-28 rounded skeleton-box" />
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-14 rounded-full skeleton-box" />
          <div className="h-5 w-16 rounded-full skeleton-box" />
          <div className="h-5 w-12 rounded-full skeleton-box" />
        </div>
      </div>

      {/* Asset List Accordion Skeleton */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border/60 dark:border-brand-border-dark/60 rounded-tile overflow-hidden shadow-sm flex flex-col divide-y divide-brand-divider dark:divide-brand-divider-dark">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="h-3.5 w-32 rounded skeleton-box" />
          <div className="h-3 w-24 rounded skeleton-box" />
        </div>

        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full skeleton-box shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-20 rounded skeleton-box" />
                <div className="h-3 w-28 rounded skeleton-box" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-3.5 w-16 rounded skeleton-box" />
              <div className="h-3 w-10 rounded skeleton-box" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PerfSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-busy="true" aria-label="Memuat performa...">
      <div className="relative flex items-end justify-between gap-2 h-28 pt-6 pb-1 border-b border-brand-divider dark:border-brand-divider-dark">
        {[45, 70, 30, 85, 55, 60, 75].map((h, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full max-w-[20px] rounded-t-md skeleton-box"
              style={{ height: `${h}%` }}
            />
            <div className="h-2.5 w-5 rounded skeleton-box mt-1" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="h-3 w-20 rounded skeleton-box" />
        <div className="h-3 w-24 rounded skeleton-box" />
      </div>
    </div>
  );
}
