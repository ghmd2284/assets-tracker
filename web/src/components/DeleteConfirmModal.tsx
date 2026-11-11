import React, { useEffect } from 'react';
import { WatchedWallet, truncateAddress, getChainLogoUrl } from '@asset-tracker/shared';
import { translations, Language } from '../lib/i18n';
import { haptics } from '../lib/telegram';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  wallet: WatchedWallet | null;
  loading: boolean;
  lang?: Language;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  wallet,
  loading,
  lang = 'id',
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const t = translations[lang].deleteModal;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !wallet) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          haptics.impact('light');
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-japandi-fade"
    >
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-t-bento sm:rounded-bento w-full max-w-sm flex flex-col p-5 shadow-2xl overflow-hidden animate-japandi-slide-up sm:animate-japandi-fade-up">
        {/* Grabber for Mobile */}
        <div className="w-10 h-1 bg-brand-border dark:bg-brand-border-dark rounded-full mx-auto -mt-1 mb-3 shrink-0 sm:hidden" />

        {/* Warning Icon Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-divider dark:border-brand-divider-dark">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-semantic-loss-bg dark:bg-semantic-loss-dark-bg text-semantic-loss dark:text-semantic-loss-dark flex items-center justify-center shrink-0 border border-semantic-loss/20">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-primary dark:text-brand-primary-dark">
                {t.title}
              </h3>
              <p className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark">
                Watch-Only Wallet
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              haptics.impact('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark hover:bg-surface-dim active:scale-90 transition-all disabled:opacity-40"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 flex flex-col gap-3">
          <p className="text-xs text-brand-primary dark:text-brand-primary-dark leading-relaxed">
            {t.confirmMsg(wallet.label, wallet.blockchain)}
          </p>

          {/* Wallet Summary Card */}
          <div className="p-3 bg-canvas/60 dark:bg-canvas-dark/60 rounded-button border border-brand-border/60 dark:border-brand-border-dark/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              {getChainLogoUrl(wallet.blockchain) ? (
                <img
                  src={getChainLogoUrl(wallet.blockchain)}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <span className="font-mono text-[10px] font-bold uppercase">{wallet.blockchain.slice(0, 2)}</span>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-brand-primary dark:text-brand-primary-dark truncate">
                {wallet.label}
              </span>
              <span className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark truncate">
                {truncateAddress(wallet.address, 8, 6)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-semantic-loss dark:text-semantic-loss-dark bg-semantic-loss-bg/50 dark:bg-semantic-loss-dark-bg/50 p-2.5 rounded-lg border border-semantic-loss/20">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.warning}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              haptics.impact('light');
              onClose();
            }}
            className="flex-1 min-h-[42px] px-3 bg-transparent border border-brand-border dark:border-brand-border-dark rounded-button text-xs font-semibold text-brand-primary dark:text-brand-primary-dark hover:bg-surface-dim active:scale-95 transition-all disabled:opacity-40"
          >
            {t.cancelBtn}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              haptics.impact('heavy');
              onConfirm();
            }}
            className="flex-1 min-h-[42px] px-3 bg-semantic-loss dark:bg-semantic-loss-dark text-white dark:text-brand-primary rounded-button text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.deleteBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

