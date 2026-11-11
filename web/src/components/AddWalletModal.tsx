import React, { useState } from 'react';
import { parseBatchAddresses, detectAddress } from '@asset-tracker/shared';
import { addWallets } from '../lib/api';
import { haptics } from '../lib/telegram';
import { X, Clipboard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWalletModal({ isOpen, onClose, onSuccess }: AddWalletModalProps) {
  const [addressInput, setAddressInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time detection for single address input
  const singleDetected = addressInput.trim() ? detectAddress(addressInput.trim()) : null;
  const batchParsed = parseBatchAddresses(addressInput);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAddressInput(text);
        haptics.selection();
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    if (batchParsed.valid.length === 0) {
      setErrorMsg('Alamat tidak valid. Pastikan format EVM (0x...), TON (EQ.../UQ...), atau Solana (Base58).');
      haptics.notification('error');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await addWallets(addressInput, labelInput.trim() || undefined);
      if (!res.ok || !res.created || res.created.length === 0) {
        throw new Error('Gagal menambahkan alamat. Pastikan format alamat valid.');
      }
      haptics.notification('success');
      setAddressInput('');
      setLabelInput('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan alamat');
      haptics.notification('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface dark:bg-surface-dark border-t sm:border border-brand-border dark:border-brand-border-dark rounded-t-bento sm:rounded-bento p-5 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-brand-divider dark:border-brand-divider-dark pb-3">
          <div>
            <h3 className="text-base font-semibold">Tambah Alamat Baru</h3>
            <p className="text-xs text-brand-subdued dark:text-brand-subdued-dark">
              100% Watch-Only. Tempel alamat publikmu.
            </p>
          </div>
          <button
            onClick={() => {
              haptics.impact('light');
              onClose();
            }}
            className="p-1 rounded-full text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-semantic-loss-bg dark:bg-semantic-loss-dark-bg text-semantic-loss dark:text-semantic-loss-dark p-3 rounded-button text-xs flex items-center gap-2 border border-semantic-loss/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Smart Textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Alamat Publik</label>
              <button
                type="button"
                onClick={handlePaste}
                className="text-xs font-mono font-medium text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark flex items-center gap-1"
              >
                <Clipboard className="w-3.5 h-3.5" />
                Tempel dari Clipboard
              </button>
            </div>

            <textarea
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="0x... atau EQ... atau Solana Base58"
              rows={3}
              className="w-full p-3 font-mono text-base sm:text-sm bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none focus:border-brand-primary dark:focus:border-brand-primary-dark resize-none transition-colors"
              required
            />

            {/* Real-Time Detection Pill */}
            {singleDetected && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-semantic-gain dark:text-semantic-gain-dark">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terdeteksi:
                </span>
                {singleDetected.ecosystem === 'evm' && (
                  <span className="px-2 py-0.5 rounded-full bg-chain-evm/10 text-chain-evm font-semibold text-[11px]">
                    EVM (Ethereum, BSC, Base, Arb, Polygon)
                  </span>
                )}
                {singleDetected.ecosystem === 'ton' && (
                  <span className="px-2 py-0.5 rounded-full bg-chain-ton/10 text-chain-ton font-semibold text-[11px]">
                    TON Mainnet
                  </span>
                )}
                {singleDetected.ecosystem === 'solana' && (
                  <span className="px-2 py-0.5 rounded-full bg-chain-solana/10 text-chain-solana font-semibold text-[11px]">
                    Solana Mainnet
                  </span>
                )}
              </div>
            )}

            {/* Batch count if multiple */}
            {batchParsed.valid.length > 1 && (
              <p className="text-xs font-mono text-brand-subdued">
                {batchParsed.valid.length} alamat valid siap ditambahkan.
              </p>
            )}
          </div>

          {/* Wallet Label Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Label Dompet (Opsional)</label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Contoh: Tabungan Dingin, Trading, Airdrop"
              className="w-full px-3 py-2.5 text-base sm:text-sm bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none focus:border-brand-primary dark:focus:border-brand-primary-dark transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                haptics.impact('light');
                onClose();
              }}
              className="flex-1 min-h-[44px] bg-transparent border border-brand-border dark:border-brand-border-dark rounded-button text-sm font-medium hover:bg-surface-dim transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !addressInput.trim()}
              className="flex-1 min-h-[44px] bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-sm font-medium flex items-center justify-center gap-2 hover:opacity-95 active:opacity-85 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Alamat'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

