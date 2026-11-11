import React from 'react';
import { WatchedWallet, truncateAddress, getChainLogoUrl } from '@asset-tracker/shared';
import { deleteWallet } from '../lib/api';
import { haptics } from '../lib/telegram';
import { Trash2, Copy, Check, Wallet, Loader2 } from 'lucide-react';

interface WalletListProps {
  wallets: WatchedWallet[];
  onRefresh: () => void;
}

export function WalletList({ wallets, onRefresh }: WalletListProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleCopy = (wallet: WatchedWallet) => {
    navigator.clipboard.writeText(wallet.address);
    setCopiedId(wallet.id);
    haptics.notification('success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (wallet: WatchedWallet) => {
    const doDelete = async () => {
      setDeletingId(wallet.id);
      try {
        await deleteWallet(wallet.id);
        haptics.notification('success');
        onRefresh();
      } catch (err: any) {
        alert(`Gagal menghapus dompet: ${err.message}`);
      } finally {
        setDeletingId(null);
      }
    };

    const msg = `Hapus pemantauan untuk dompet "${wallet.label}"?`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(msg, (ok: boolean) => {
        if (ok) doDelete();
      });
    } else if (confirm(msg)) {
      doDelete();
    }
  };

  if (wallets.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2">
        <span className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Dompet Terhubung ({wallets.length}/10)
        </span>
        <span className="text-brand-subdued font-mono text-[11px]">Watch-Only</span>
      </div>

      <div className="flex flex-col divide-y divide-brand-divider dark:divide-brand-divider-dark">
        {wallets.map((w) => (
          <div key={w.id} className="py-2.5 flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium truncate">{w.label}</span>
                <span className="px-2 py-0.5 rounded-full uppercase font-mono text-[10px] font-semibold bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark flex items-center gap-1 shrink-0">
                  {getChainLogoUrl(w.blockchain) && (
                    <img
                      src={getChainLogoUrl(w.blockchain)}
                      alt={w.blockchain}
                      className="w-3 h-3 rounded-full object-cover shrink-0"
                    />
                  )}
                  {w.blockchain}
                </span>
                {w.isDemo && (
                  <span className="text-[10px] text-chain-evm font-mono shrink-0">Demo</span>
                )}
              </div>
              <span className="text-[11px] font-mono text-brand-subdued truncate mt-0.5">
                {truncateAddress(w.address, 8, 6)}
              </span>
            </div>

            {/* Action buttons with minimum 40px touch targets and safe separation */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(w)}
                className="w-10 h-10 rounded-button border border-brand-border dark:border-brand-border-dark flex items-center justify-center hover:bg-surface-dim active:scale-95 transition-all shadow-xs"
                aria-label={`Salin alamat dompet ${w.label}`}
                title="Salin alamat"
              >
                {copiedId === w.id ? (
                  <Check className="w-4 h-4 text-semantic-gain" />
                ) : (
                  <Copy className="w-4 h-4 text-brand-subdued" />
                )}
              </button>

              <button
                type="button"
                disabled={deletingId === w.id}
                onClick={() => handleDelete(w)}
                className="w-10 h-10 rounded-button border border-brand-border dark:border-brand-border-dark flex items-center justify-center hover:bg-semantic-loss-bg/50 text-brand-subdued hover:text-semantic-loss active:scale-95 transition-all disabled:opacity-50 shadow-xs"
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
  );
}

