import React, { useState, useEffect, useMemo } from 'react';
import {
  MutationTransaction,
  CurrencyPref,
  formatFiat,
  formatCrypto,
  truncateAddress,
} from '@asset-tracker/shared';
import { getExplorerTxUrl, formatTimeAgo } from './RecentTransactions';
import { translations, Language } from '../lib/i18n';
import { haptics } from '../lib/telegram';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  X,
  Search,
  Activity,
} from 'lucide-react';

interface AllTransactionsModalProps {
  isOpen: boolean;
  transactions: MutationTransaction[];
  currency: CurrencyPref;
  lang?: Language;
  onClose: () => void;
}

export function AllTransactionsModal({
  isOpen,
  transactions,
  currency,
  lang = 'id',
  onClose,
}: AllTransactionsModalProps) {
  const t = translations[lang].mutationsModal;
  const [filterDirection, setFilterDirection] = useState<'all' | 'in' | 'out'>('all');
  const [filterChain, setFilterChain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Direction filter
      if (filterDirection !== 'all' && tx.direction !== filterDirection) return false;

      // Chain filter
      if (filterChain !== 'all') {
        if (filterChain === 'evm' && !['ethereum', 'bsc', 'base', 'arbitrum', 'polygon'].includes(tx.blockchain)) return false;
        if (filterChain === 'ton' && tx.blockchain !== 'ton') return false;
        if (filterChain === 'solana' && tx.blockchain !== 'solana') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesToken = tx.tokenSymbol.toLowerCase().includes(q);
        const matchesHash = tx.txHash.toLowerCase().includes(q);
        const matchesFrom = tx.fromAddress.toLowerCase().includes(q);
        const matchesTo = tx.toAddress.toLowerCase().includes(q);
        return matchesToken || matchesHash || matchesFrom || matchesTo;
      }

      return true;
    });
  }, [transactions, filterDirection, filterChain, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          haptics.impact('light');
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-japandi-fade"
    >
      <div className="bg-surface dark:bg-surface-dark border-t sm:border border-brand-border dark:border-brand-border-dark rounded-t-bento sm:rounded-bento w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-japandi-slide-up sm:animate-japandi-fade-up">
        {/* Grabber Handle */}
        <div className="w-10 h-1 bg-brand-border dark:bg-brand-border-dark rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="p-4 border-b border-brand-divider dark:border-brand-divider-dark flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
              <Activity className="w-4 h-4 text-brand-primary dark:text-brand-primary-dark" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight text-brand-primary dark:text-brand-primary-dark">
                {t.title} ({filteredTransactions.length})
              </h2>
              <p className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark">
                {t.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.impact('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark hover:bg-surface-dim active:scale-90 transition-all"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-canvas/40 dark:bg-canvas-dark/40 border-b border-brand-divider dark:border-brand-divider-dark flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-brand-subdued absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-full focus:outline-none focus:border-brand-primary transition-colors shadow-2xs"
            />
          </div>

          {/* Direction Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setFilterDirection('all');
                haptics.selection();
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                filterDirection === 'all'
                  ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary font-semibold shadow-2xs'
                  : 'bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark text-brand-subdued'
              }`}
            >
              {t.filterAll}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterDirection('in');
                haptics.selection();
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                filterDirection === 'in'
                  ? 'bg-semantic-gain dark:bg-semantic-gain-dark text-white dark:text-brand-primary font-semibold shadow-2xs'
                  : 'bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark text-brand-subdued'
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>{t.filterIn}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterDirection('out');
                haptics.selection();
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                filterDirection === 'out'
                  ? 'bg-semantic-loss dark:bg-semantic-loss-dark text-white dark:text-brand-primary font-semibold shadow-2xs'
                  : 'bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark text-brand-subdued'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>{t.filterOut}</span>
            </button>

            <span className="text-brand-divider dark:text-brand-divider-dark">|</span>

            {/* Blockchain Filter Chips */}
            {['all', 'ton', 'evm', 'solana'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setFilterChain(c);
                  haptics.selection();
                }}
                className={`px-2.5 py-1 rounded-full uppercase text-[10px] font-semibold transition-all ${
                  filterChain === c
                    ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark shadow-2xs'
                    : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
                }`}
              >
                {c === 'all' ? t.allChains : c}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col divide-y divide-brand-divider dark:divide-brand-divider-dark">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-brand-subdued dark:text-brand-subdued-dark">
              {t.noMatch}
            </div>
          ) : (
            filteredTransactions.map((tx, idx) => {
              const isInbound = tx.direction === 'in';
              const explorerUrl = getExplorerTxUrl(tx.blockchain, tx.txHash);

              return (
                <div
                  key={tx.id || tx.txHash || idx}
                  className="py-3 flex items-center justify-between gap-2.5 animate-stagger-item group"
                  style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-brand-border/30 dark:border-brand-border-dark/30 ${
                        isInbound
                          ? 'bg-semantic-gain-bg text-semantic-gain dark:bg-semantic-gain-dark-bg dark:text-semantic-gain-dark'
                          : 'bg-semantic-loss-bg text-semantic-loss dark:bg-semantic-loss-dark-bg dark:text-semantic-loss-dark'
                      }`}
                    >
                      {isInbound ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-xs leading-tight">
                        <span>{isInbound ? translations[lang].home.inbound : translations[lang].home.outbound}</span>
                        <span className="text-brand-subdued">·</span>
                        <span className="uppercase font-mono text-[10px] text-brand-subdued font-semibold tracking-wider">
                          {tx.blockchain}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark truncate mt-0.5">
                        {formatTimeAgo(tx.timestamp, lang)} · {truncateAddress(isInbound ? tx.fromAddress : tx.toAddress, 6, 4)}
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
                      aria-label={translations[lang].common.explorer}
                      title={translations[lang].common.explorer}
                    >
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

