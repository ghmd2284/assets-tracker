import React from 'react';
import { MutationTransaction, CurrencyPref, formatFiat, formatCrypto, truncateAddress, Blockchain } from '@asset-tracker/shared';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Activity, History } from 'lucide-react';
import { translations, Language } from '../lib/i18n';
import { haptics } from '../lib/telegram';

interface RecentTransactionsProps {
  transactions: MutationTransaction[];
  currency: CurrencyPref;
  lang?: Language;
  onOpenAll?: () => void;
}

export function getExplorerTxUrl(chain: Blockchain, txHash: string): string {
  switch (chain) {
    case 'ethereum':
      return `https://etherscan.io/tx/${txHash}`;
    case 'bsc':
      return `https://bscscan.com/tx/${txHash}`;
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    case 'arbitrum':
      return `https://arbiscan.io/tx/${txHash}`;
    case 'polygon':
      return `https://polygonscan.com/tx/${txHash}`;
    case 'ton':
      return `https://tonviewer.com/transaction/${txHash}`;
    case 'solana':
      return `https://solscan.io/tx/${txHash}`;
    default:
      return '#';
  }
}

export function formatTimeAgo(timestampStr: string): string {
  try {
    const diffMs = Date.now() - new Date(timestampStr).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffMs / (86400 * 1000));

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${diffDays}h lalu`;
  } catch {
    return 'Baru saja';
  }
}

export function RecentTransactions({
  transactions,
  currency,
  lang = 'id',
  onOpenAll,
}: RecentTransactionsProps) {
  const t = translations[lang].home;

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand-subdued" />
            {t.recentMutations}
          </span>
          <span className="text-brand-subdued font-mono text-[11px]">{t.realtimeWebhook}</span>
        </div>
        <p className="text-xs text-brand-subdued dark:text-brand-subdued-dark text-center py-4">
          {t.noMutations}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 shadow-sm flex flex-col gap-3 transition-all">
      <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2.5">
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
          </div>
          <span>{t.recentMutations} ({transactions.length})</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-brand-subdued dark:text-brand-subdued-dark">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-gain animate-pulse-glow" />
          {t.realtimeWebhook}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-brand-divider dark:divide-brand-divider-dark">
        {transactions.slice(0, 5).map((tx, idx) => {
          const isInbound = tx.direction === 'in';
          const explorerUrl = getExplorerTxUrl(tx.blockchain, tx.txHash);

          return (
            <div
              key={tx.id || tx.txHash}
              className="py-2.5 px-2 -mx-2 rounded-xl flex items-center justify-between gap-2 hover:bg-canvas/50 dark:hover:bg-canvas-dark/50 transition-colors animate-stagger-item group"
              style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Direction Icon Badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-brand-border/30 dark:border-brand-border-dark/30 ${
                    isInbound
                      ? 'bg-semantic-gain-bg text-semantic-gain dark:bg-semantic-gain-dark-bg dark:text-semantic-gain-dark'
                      : 'bg-semantic-loss-bg text-semantic-loss dark:bg-semantic-loss-dark-bg dark:text-semantic-loss-dark'
                  }`}
                >
                  {isInbound ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 font-medium text-xs leading-tight">
                    <span>{isInbound ? t.inbound : t.outbound}</span>
                    <span className="text-brand-subdued">·</span>
                    <span className="uppercase font-mono text-[10px] text-brand-subdued font-semibold tracking-wider">
                      {tx.blockchain}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark truncate mt-0.5">
                    {formatTimeAgo(tx.timestamp)} · {truncateAddress(isInbound ? tx.fromAddress : tx.toAddress, 5, 4)}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <div
                    className={`font-mono text-xs font-semibold leading-tight ${
                      isInbound
                        ? 'text-semantic-gain dark:text-semantic-gain-dark'
                        : 'text-semantic-loss dark:text-semantic-loss-dark'
                    }`}
                  >
                    {isInbound ? '+' : '−'}
                    {formatCrypto(tx.amount)} {tx.tokenSymbol}
                  </div>
                  {tx.amountUsd && tx.amountUsd > 0 && (
                    <div className="text-[10px] font-mono text-brand-subdued dark:text-brand-subdued-dark mt-0.5">
                      {formatFiat(tx.amountUsd, currency)}
                    </div>
                  )}
                </div>

                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-button border border-brand-border/70 dark:border-brand-border-dark/70 flex items-center justify-center text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark hover:bg-surface-dim active:scale-90 transition-all shadow-2xs"
                  aria-label={`Buka mutasi ${tx.blockchain} di block explorer`}
                  title="Lihat di Block Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {transactions.length > 0 && onOpenAll && (
        <div className="pt-1 border-t border-brand-divider dark:border-brand-divider-dark">
          <button
            type="button"
            onClick={() => {
              haptics.impact('light');
              onOpenAll();
            }}
            className="w-full py-2 px-3 rounded-button border border-brand-border/70 dark:border-brand-border-dark/70 text-xs font-mono font-medium text-brand-primary dark:text-brand-primary-dark hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-brand-subdued" />
            <span>{t.viewAllMutations} ({transactions.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}

