import React, { useState } from 'react';
import {
  AggregatedAsset,
  CurrencyPref,
  formatFiat,
  formatCrypto,
  truncateAddress,
  getTokenLogoUrl,
  getChainLogoUrl,
} from '@asset-tracker/shared';
import { haptics } from '../lib/telegram';
import { ChevronDown, Copy, Check, Globe } from 'lucide-react';

interface ChainAccordionProps {
  assets: AggregatedAsset[];
  currency: CurrencyPref;
  hasWallets?: boolean;
}

function getChainColorClass(chain: string): string {
  if (chain === 'ton') return 'text-chain-ton';
  if (chain === 'solana') return 'text-chain-solana';
  return 'text-chain-evm';
}

export function ChainAccordion({ assets, currency, hasWallets = false }: ChainAccordionProps) {
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
        {hasWallets
          ? 'Dompet terhubung. Sedang menyinkronkan saldo atau bernilai $0. Tekan tombol segarkan di kanan atas untuk memuat ulang.'
          : 'Belum ada aset terdeteksi. Tambahkan alamat dompet untuk mulai memantau saldo.'}
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
          const logoUrl = getTokenLogoUrl(asset.symbol, asset.logoUrl);

          return (
            <div key={asset.symbol} className="flex flex-col">
              {/* Parent Token Header Row */}
              <button
                type="button"
                onClick={() => toggleExpand(asset.symbol)}
                className="px-4 py-3 w-full flex items-center justify-between text-left hover:bg-canvas/50 dark:hover:bg-canvas-dark/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Crypto Emblem Avatar with Small World / Network Badge */}
                  <div className="relative w-9 h-9 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-surface-dim dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center font-mono font-semibold text-xs text-brand-primary dark:text-brand-primary-dark overflow-hidden shadow-xs">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={asset.symbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        asset.symbol.slice(0, 2)
                      )}
                    </div>

                    {/* Small World / Network Badge in the Bottom-Right Corner */}
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center shadow-xs overflow-hidden"
                      title={chainCount > 1 ? `${chainCount} Jaringan (Multi-Chain)` : asset.chains[0]?.blockchain}
                    >
                      {chainCount > 1 ? (
                        <Globe className="w-2.5 h-2.5 text-brand-primary dark:text-brand-primary-dark" />
                      ) : (
                        <img
                          src={getChainLogoUrl(asset.chains[0]?.blockchain) || logoUrl}
                          alt={asset.chains[0]?.blockchain}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium leading-tight">{asset.name || asset.symbol}</div>
                    <div className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark flex items-center gap-1.5 mt-0.5">
                      <span>{formatCrypto(asset.totalBalance)} {asset.symbol}</span>
                      <span className="text-brand-subdued/40">·</span>
                      <span className="text-[11px] font-medium text-brand-subdued dark:text-brand-subdued-dark">
                        {chainCount} {chainCount > 1 ? 'Jaringan' : 'Chain'}
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
                          {getChainLogoUrl(sub.blockchain) && (
                            <img
                              src={getChainLogoUrl(sub.blockchain)}
                              alt={sub.blockchain}
                              className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className={`uppercase font-mono text-[11px] ${getChainColorClass(sub.blockchain)}`}>
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

