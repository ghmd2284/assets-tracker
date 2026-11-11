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
import { ChevronDown, Copy, Check, Globe, Coins } from 'lucide-react';
import { Language, translations } from '../lib/i18n';

export type NetworkFilterType = 'all' | 'ton' | 'evm' | 'solana';

interface ChainAccordionProps {
  assets: AggregatedAsset[];
  currency: CurrencyPref;
  hasWallets?: boolean;
  networkFilter?: NetworkFilterType;
  lang?: Language;
}

function matchesNetwork(blockchain: string, filter: NetworkFilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'ton') return blockchain.toLowerCase() === 'ton';
  if (filter === 'solana') return blockchain.toLowerCase() === 'solana';
  if (filter === 'evm') {
    return ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'evm'].includes(blockchain.toLowerCase());
  }
  return true;
}

function getChainColorClass(chain: string): string {
  if (chain === 'ton') return 'text-chain-ton dark:text-chain-ton-dark';
  if (chain === 'solana') return 'text-chain-solana dark:text-chain-solana-dark';
  return 'text-chain-evm dark:text-chain-evm-dark';
}

export function ChainAccordion({
  assets,
  currency,
  hasWallets = false,
  networkFilter = 'all',
  lang = 'id',
}: ChainAccordionProps) {
  const t = translations[lang];
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

  // Filter assets based on active network filter
  const displayedAssets = assets
    .map((asset) => {
      if (networkFilter === 'all') return asset;
      const matchingChains = asset.chains.filter((c) => matchesNetwork(c.blockchain, networkFilter));
      if (matchingChains.length === 0) return null;
      const filteredTotalBal = matchingChains.reduce((sum, c) => sum + c.balance, 0);
      const filteredTotalVal = matchingChains.reduce((sum, c) => sum + c.valueUsd, 0);
      return {
        ...asset,
        totalBalance: filteredTotalBal,
        totalValueUsd: filteredTotalVal,
        chains: matchingChains,
      };
    })
    .filter((a): a is AggregatedAsset => a !== null);

  if (assets.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 text-center text-xs text-brand-subdued dark:text-brand-subdued-dark">
        {hasWallets ? t.home.emptyWalletsSynced : t.home.emptyAssets}
      </div>
    );
  }

  if (displayedAssets.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 text-center text-xs text-brand-subdued dark:text-brand-subdued-dark">
        {lang === 'id'
          ? `Tidak ada aset terdeteksi pada filter ${networkFilter.toUpperCase()}.`
          : `No assets detected for ${networkFilter.toUpperCase()} filter.`}
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile overflow-hidden shadow-sm flex flex-col transition-all">
      <div className="px-4 py-3 border-b border-brand-divider dark:border-brand-divider-dark flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
            <Coins className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
          </div>
          <span>
            {t.home.assetsTitle} ({displayedAssets.length})
          </span>
        </span>
        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-medium bg-brand-accent-light/60 dark:bg-brand-border-dark/60 text-brand-subdued dark:text-brand-subdued-dark border border-brand-border/40 dark:border-brand-border-dark/40">
          {networkFilter === 'all' ? t.home.chainAbstraction : networkFilter.toUpperCase()}
        </span>
      </div>

      <div className="divide-y divide-brand-divider dark:divide-brand-divider-dark">
        {displayedAssets.map((asset, index) => {
          const isExpanded = expandedSymbol === asset.symbol;
          const chainCount = asset.chains.length;
          const logoUrl = getTokenLogoUrl(asset.symbol, asset.logoUrl);
          const singleChain = asset.chains[0]?.blockchain;
          const isNativeSingle =
            chainCount === 1 &&
            ((asset.symbol === 'ETH' && singleChain === 'ethereum') ||
              (asset.symbol === 'BNB' && singleChain === 'bsc') ||
              (asset.symbol === 'POL' && singleChain === 'polygon') ||
              (asset.symbol === 'MATIC' && singleChain === 'polygon') ||
              (asset.symbol === 'SOL' && singleChain === 'solana') ||
              (asset.symbol === 'TON' && singleChain === 'ton'));

          return (
            <div
              key={asset.symbol}
              className="flex flex-col animate-stagger-item"
              style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
            >
              {/* Parent Token Header Row */}
              <button
                type="button"
                onClick={() => toggleExpand(asset.symbol)}
                className="px-4 py-3 w-full flex items-center justify-between text-left hover:bg-canvas/50 dark:hover:bg-canvas-dark/50 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Crypto Emblem Avatar with Anti-Blank Architecture */}
                  <div className="relative w-9 h-9 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-surface-dim dark:bg-surface-container-high-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center font-mono font-bold text-xs text-brand-primary dark:text-brand-primary-dark overflow-hidden shadow-xs relative">
                      {/* Initials Fallback (Always present behind image) */}
                      <span className="uppercase select-none text-[11px]">
                        {asset.symbol.slice(0, 2)}
                      </span>

                      {/* Official Token Logo Image */}
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt={asset.symbol}
                          className="absolute inset-0 w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>

                    {/* Small World Badge (for Multi-Chain) or L2 Network Badge */}
                    {chainCount > 1 ? (
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center shadow-xs overflow-hidden"
                        title={`${chainCount} ${t.home.chainsCount} (Multi-Chain)`}
                      >
                        <Globe className="w-2.5 h-2.5 text-brand-primary dark:text-brand-primary-dark" />
                      </div>
                    ) : !isNativeSingle && singleChain ? (
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center shadow-xs overflow-hidden"
                        title={singleChain}
                      >
                        {getChainLogoUrl(singleChain) ? (
                          <img
                            src={getChainLogoUrl(singleChain)}
                            alt={singleChain}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-sm font-medium leading-tight">{asset.name || asset.symbol}</div>
                    <div className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark flex items-center gap-1.5 mt-0.5">
                      <span>
                        {formatCrypto(asset.totalBalance)} {asset.symbol}
                      </span>
                      <span className="text-brand-subdued/40">·</span>
                      <span className="text-[11px] font-medium text-brand-subdued dark:text-brand-subdued-dark">
                        {chainCount} {chainCount > 1 ? t.home.chainsCount : 'Chain'}
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

              {/* Sub-Network Child Rows (Smooth Grid-Row Accordion Transition) */}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isExpanded
                    ? 'grid-rows-[1fr] border-t border-brand-divider dark:border-brand-divider-dark'
                    : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="bg-canvas/60 dark:bg-canvas-dark/60 px-4 py-2.5 flex flex-col gap-2">
                    {asset.chains.map((sub, idx) => (
                      <div
                        key={`${sub.blockchain}-${idx}`}
                        className="py-2 px-3 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button flex items-center justify-between text-xs shadow-xs animate-stagger-item"
                        style={{ animationDelay: `${idx * 25}ms` }}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
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
                            <span
                              className={`uppercase font-mono text-[11px] font-semibold ${getChainColorClass(
                                sub.blockchain
                              )}`}
                            >
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

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(sub.address)}
                            className="min-h-[36px] px-2.5 py-1.5 rounded-button border border-brand-border dark:border-brand-border-dark text-[11px] font-mono flex items-center gap-1.5 hover:bg-surface-dim active:scale-95 transition-all shadow-xs"
                            aria-label={`Salin alamat dompet ${sub.blockchain}`}
                            title={t.common.copy}
                          >
                            {copiedAddress === sub.address ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-semantic-gain" />
                                <span className="font-semibold text-semantic-gain">{t.common.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-brand-subdued" />
                                <span>{truncateAddress(sub.address, 4, 3)}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
