import React, { useState } from 'react';
import { AggregatedAsset, CurrencyPref, formatFiat, formatCrypto, truncateAddress } from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';
import { ChevronDown, Copy, Check, ExternalLink } from 'lucide-react';

interface ChainAccordionProps {
  assets: AggregatedAsset[];
  currency: CurrencyPref;
}

export function ChainAccordion({ assets, currency }: ChainAccordionProps) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
    haptics.impact('light');
  };

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    haptics.notification('success');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (assets.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 text-center text-xs text-brand-subdued dark:text-brand-subdued-dark">
        Belum ada aset terdeteksi. Tambahkan alamat dompet untuk mulai memantau saldo.
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-brand-divider dark:border-brand-divider-dark flex items-center justify-between text-xs font-semibold">
        <span>Aset Terkumpul ({assets.length})</span>
        <span className="font-mono text-brand-subdued dark:text-brand-subdued-dark">Chain Abstraction</span>
      </div>

      <div className="divide-y divide-brand-divider dark:divide-brand-divider-dark">
        {assets.map((asset) => {
          const isExpanded = expandedSymbol === asset.symbol;
          const chainCount = asset.chains.length;

          return (
            <div key={asset.symbol} className="flex flex-col">
              {/* Parent Token Header Row */}
              <button
                type="button"
                onClick={() => toggleExpand(asset.symbol)}
                className="px-4 py-3 w-full flex items-center justify-between text-left hover:bg-canvas/50 dark:hover:bg-canvas-dark/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Ceramic Emblem Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-accent-light dark:bg-brand-border-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center font-mono font-semibold text-xs text-brand-primary dark:text-brand-primary-dark shrink-0 overflow-hidden">
                    {asset.logoUrl ? (
                      <img
                        src={asset.logoUrl}
                        alt={asset.symbol}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Monogram fallback
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      asset.symbol.slice(0, 2)
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium leading-tight">{asset.name || asset.symbol}</div>
                    <div className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark flex items-center gap-1.5 mt-0.5">
                      <span>{formatCrypto(asset.totalBalance)} {asset.symbol}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-surface-dim dark:bg-surface-container-high-dark text-[10px]">
                        🌐 {chainCount} {chainCount > 1 ? 'Jaringan' : 'Chain'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-mono font-medium leading-tight">
                      {formatFiat(asset.totalValueUsd, currency)}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-subdued transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Sub-Network Child Rows (Expanded State) */}
              {isExpanded && (
                <div className="bg-canvas/60 dark:bg-canvas-dark/60 px-4 py-2 border-t border-brand-divider dark:border-brand-divider-dark flex flex-col gap-2 animate-in fade-in duration-150">
                  {asset.chains.map((sub, idx) => (
                    <div
                      key={`${sub.blockchain}-${idx}`}
                      className="py-1.5 px-3 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="uppercase font-mono text-[11px] text-chain-ton">
                            {sub.blockchain}
                          </span>
                          <span className="text-brand-subdued">·</span>
                          <span className="text-brand-subdued truncate max-w-[120px]">
                            {sub.label}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-brand-subdued mt-0.5">
                          {formatCrypto(sub.balance)} {asset.symbol} ({formatFiat(sub.valueUsd, currency)})
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(sub.address)}
                          className="px-2 py-1 rounded border border-brand-border dark:border-brand-border-dark text-[11px] font-mono flex items-center gap-1 hover:bg-surface-dim active:opacity-70 transition-colors"
                          title="Salin alamat dompet"
                        >
                          {copiedAddress === sub.address ? (
                            <>
                              <Check className="w-3 h-3 text-semantic-gain" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-brand-subdued" />
                              <span>{truncateAddress(sub.address, 4, 3)}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
