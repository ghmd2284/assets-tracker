import React from 'react';
import { WatchedWallet, truncateAddress, getChainLogoUrl } from '@asset-tracker/shared';
import { deleteWallet } from '../lib/api';
import { haptics } from '../lib/telegram';
import { Trash2, Copy, Check, Wallet } from 'lucide-react';

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

  const handleDelete = async (wallet: WatchedWallet) => {
    if (!confirm(`Hapus pemantauan untuk dompet "${wallet.label}"?`)) {
      return;
    }

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
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium truncate">{w.label}</span>
                <span className="px-1.5 py-0.2 rounded-full uppercase font-mono text-[9px] bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark flex items-center gap-1">
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
                  <span className="text-[10px] text-chain-evm font-mono">Demo</span>
                )}
              </div>
              <span className="text-[11px] font-mono text-brand-subdued truncate mt-0.5">
                {truncateAddress(w.address, 8, 6)}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(w)}
                className="p-1.5 rounded border border-brand-border dark:border-brand-border-dark hover:bg-surface-dim transition-colors"
                title="Salin alamat"
              >
                {copiedId === w.id ? (
                  <Check className="w-3.5 h-3.5 text-semantic-gain" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-brand-subdued" />
                )}
              </button>

              <button
                type="button"
                disabled={deletingId === w.id}
                onClick={() => handleDelete(w)}
                className="p-1.5 rounded border border-brand-border dark:border-brand-border-dark hover:bg-semantic-loss-bg/50 text-brand-subdued hover:text-semantic-loss transition-colors disabled:opacity-50"
                title="Hapus dompet"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

