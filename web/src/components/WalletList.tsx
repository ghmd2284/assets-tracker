import React, { useState } from 'react';
import { WatchedWallet, truncateAddress, getChainLogoUrl } from '@asset-tracker/shared';
import { deleteWallet } from '../lib/api';
import { haptics } from '../lib/telegram';
import { translations, Language } from '../lib/i18n';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Trash2, Copy, Check, Wallet, Loader2 } from 'lucide-react';

interface WalletListProps {
  wallets: WatchedWallet[];
  lang?: Language;
  onRefresh: () => void;
}

export function WalletList({ wallets, lang = 'id', onRefresh }: WalletListProps) {
  const t = translations[lang].settings;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<WatchedWallet | null>(null);

  const handleCopy = (wallet: WatchedWallet) => {
    navigator.clipboard.writeText(wallet.address);
    setCopiedId(wallet.id);
    haptics.notification('success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!walletToDelete) return;
    setDeletingId(walletToDelete.id);
    try {
      await deleteWallet(walletToDelete.id);
      haptics.notification('success');
      setWalletToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(`Gagal menghapus dompet: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (wallets.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 flex flex-col gap-3 shadow-sm transition-all">
        <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2.5">
          <span className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
            </div>
            <span>{t.walletsTitle} ({wallets.length}/10)</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-brand-subdued dark:text-brand-subdued-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-gain animate-pulse-glow" />
            Watch-Only
          </span>
        </div>

        <div className="flex flex-col divide-y divide-brand-divider dark:divide-brand-divider-dark">
          {wallets.map((w, idx) => (
            <div
              key={w.id}
              className="py-2.5 px-2 -mx-2 rounded-xl flex items-center justify-between gap-2.5 hover:bg-canvas/50 dark:hover:bg-canvas-dark/50 transition-colors animate-stagger-item"
              style={{ animationDelay: `${Math.min(idx * 35, 300)}ms` }}
            >
              {/* Left: Ceramic Crypto Emblem + Details */}
              <div className="flex items-center gap-3 min-w-0 pr-1">
                <div className="w-9 h-9 rounded-full bg-surface-dim dark:bg-surface-container-high-dark border border-brand-border dark:border-brand-border-dark flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  {getChainLogoUrl(w.blockchain) ? (
                    <img
                      src={getChainLogoUrl(w.blockchain)}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-mono text-xs font-bold uppercase text-brand-primary dark:text-brand-primary-dark">
                      {w.blockchain.slice(0, 2)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-primary dark:text-brand-primary-dark truncate">
                      {w.label}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full uppercase font-mono text-[9px] font-semibold bg-brand-accent-light/60 dark:bg-brand-border-dark/60 text-brand-subdued dark:text-brand-subdued-dark shrink-0 border border-brand-border/40 dark:border-brand-border-dark/40">
                      {w.blockchain}
                    </span>
                    {w.isDemo && (
                      <span className="text-[9px] text-chain-evm font-mono shrink-0 px-1.5 py-0.2 rounded-full bg-chain-evm/10">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark truncate mt-0.5 tracking-tight">
                    {truncateAddress(w.address, 8, 6)}
                  </span>
                </div>
              </div>

              {/* Action buttons with minimum 40px touch targets and safe separation */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(w)}
                  className={`w-9 h-9 rounded-button border flex items-center justify-center active:scale-95 transition-all shadow-2xs ${
                    copiedId === w.id
                      ? 'border-semantic-gain bg-semantic-gain-bg dark:bg-semantic-gain-dark-bg text-semantic-gain dark:text-semantic-gain-dark'
                      : 'border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark hover:bg-surface-dim dark:hover:bg-surface-container-high-dark text-brand-subdued'
                  }`}
                  aria-label={`Salin alamat dompet ${w.label}`}
                  title="Salin alamat"
                >
                  {copiedId === w.id ? (
                    <Check className="w-4 h-4 text-semantic-gain" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={deletingId === w.id}
                  onClick={() => {
                    haptics.impact('light');
                    setWalletToDelete(w);
                  }}
                  className="w-9 h-9 rounded-button border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark flex items-center justify-center hover:bg-semantic-loss-bg/60 dark:hover:bg-semantic-loss-dark-bg/60 text-brand-subdued hover:text-semantic-loss dark:hover:text-semantic-loss-dark hover:border-semantic-loss/40 active:scale-95 transition-all disabled:opacity-50 shadow-2xs"
                  aria-label={`Hapus pemantauan dompet ${w.label}`}
                  title="Hapus dompet"
                >
                  {deletingId === w.id ? (
                    <Loader2 className="w-4 h-4 text-semantic-loss animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!walletToDelete}
        wallet={walletToDelete}
        loading={deletingId === walletToDelete?.id}
        lang={lang}
        onClose={() => setWalletToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

