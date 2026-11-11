import React, { useState, useEffect } from 'react';
import { parseBatchAddresses, detectAddress } from '@asset-tracker/shared';
import { addWallets } from '../lib/api';
import { haptics } from '../lib/telegram';
import { translations, Language } from '../lib/i18n';
import { X, Clipboard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AddWalletModalProps {
  isOpen: boolean;
  lang?: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWalletModal({ isOpen, lang = 'id', onClose, onSuccess }: AddWalletModalProps) {
  const t = translations[lang].addWalletModal;
  const [addressInput, setAddressInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      setErrorMsg(t.invalidFormat);
      haptics.notification('error');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await addWallets(addressInput, labelInput.trim() || undefined);
      if (!res.ok || !res.created || res.created.length === 0) {
        throw new Error(t.addFailed);
      }
      haptics.notification('success');
      setAddressInput('');
      setLabelInput('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t.addFailed);
      haptics.notification('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          haptics.impact('light');
          onClose();
        }
      }}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-japandi-fade"
    >
      <div className="w-full max-w-md bg-surface dark:bg-surface-dark border-t sm:border border-brand-border dark:border-brand-border-dark rounded-t-bento sm:rounded-bento p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-japandi-slide-up sm:animate-japandi-fade-up">
        {/* Bottom Sheet Grabber Handle */}
        <div className="w-10 h-1 bg-brand-border dark:bg-brand-border-dark rounded-full mx-auto -mt-1 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-brand-divider dark:border-brand-divider-dark pb-3">
          <div>
            <h3 className="text-base font-semibold">{t.title}</h3>
            <p className="text-xs text-brand-subdued dark:text-brand-subdued-dark">
              {t.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              haptics.impact('light');
              onClose();
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark hover:bg-surface-dim active:scale-95 transition-all"
            aria-label={t.closeAria}
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
              <label className="text-xs font-medium">{t.addressLabel}</label>
              <button
                type="button"
                onClick={handlePaste}
                className="text-xs font-mono font-medium text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark flex items-center gap-1"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {t.pasteBtn}
              </button>
            </div>

            <textarea
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={t.placeholder}
              rows={3}
              className="w-full p-3 font-mono text-base sm:text-sm bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none focus:border-brand-primary dark:focus:border-brand-primary-dark resize-none transition-colors"
              required
            />

            {/* Real-Time Detection Pill */}
            {singleDetected && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-semantic-gain dark:text-semantic-gain-dark">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t.detected}
                </span>
                {singleDetected.ecosystem === 'evm' && (
                  <span className="px-2 py-0.5 rounded-full bg-chain-evm/10 text-chain-evm font-semibold text-[11px]">
                    {t.evmBadge}
                  </span>
                )}
                {singleDetected.ecosystem === 'ton' && (
                  <span className="px-2 py-0.5 rounded-full bg-chain-ton/10 text-chain-ton font-semibold text-[11px]">
                    {t.tonBadge}
                  </span>
                )}
                {singleDetected.ecosystem === 'solana' && (
                  <span className="px-2 py-0.5 rounded-full bg-chain-solana/10 text-chain-solana font-semibold text-[11px]">
                    {t.solBadge}
                  </span>
                )}
              </div>
            )}

            {/* Preset Quick-Fill Chips for Instant Experience */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-[11px] font-mono scrollbar-none">
              <span className="text-brand-subdued dark:text-brand-subdued-dark text-[10px] shrink-0">{t.presetLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setAddressInput('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
                  setLabelInput('Vitalik.eth');
                  haptics.selection();
                }}
                className="px-2 py-0.5 rounded-full bg-brand-accent-light/50 dark:bg-brand-border-dark/50 hover:bg-brand-accent-light dark:hover:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark shrink-0 transition-all active:scale-95 border border-brand-border/40 dark:border-brand-border-dark/40"
              >
                EVM
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddressInput('EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU');
                  setLabelInput('TON Foundation');
                  haptics.selection();
                }}
                className="px-2 py-0.5 rounded-full bg-brand-accent-light/50 dark:bg-brand-border-dark/50 hover:bg-brand-accent-light dark:hover:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark shrink-0 transition-all active:scale-95 border border-brand-border/40 dark:border-brand-border-dark/40"
              >
                TON
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddressInput('4Nd1mBQtrMJVYVfKf2PJy9NZGad3TkLqcpkShG5maVe5');
                  setLabelInput('Solana Whale');
                  haptics.selection();
                }}
                className="px-2 py-0.5 rounded-full bg-brand-accent-light/50 dark:bg-brand-border-dark/50 hover:bg-brand-accent-light dark:hover:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark shrink-0 transition-all active:scale-95 border border-brand-border/40 dark:border-brand-border-dark/40"
              >
                Solana
              </button>
            </div>

            {/* Batch count if multiple */}
            {batchParsed.valid.length > 1 && (
              <p className="text-xs font-mono text-brand-subdued">
                {t.batchCount(batchParsed.valid.length)}
              </p>
            )}
          </div>

          {/* Wallet Label Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t.walletLabel}</label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder={t.labelPlaceholder}
              className="w-full px-3 py-2.5 text-base sm:text-sm bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none focus:border-brand-primary dark:focus:border-brand-primary-dark transition-colors"
            />
          </div>

          {/* Action Buttons with Tactile Feedback */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                haptics.impact('light');
                onClose();
              }}
              className="flex-1 min-h-[44px] bg-transparent border border-brand-border dark:border-brand-border-dark rounded-button text-sm font-medium hover:bg-surface-dim active:scale-[0.98] transition-all"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={loading || !addressInput.trim()}
              className="flex-1 min-h-[44px] bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-sm font-medium flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.savingBtn}
                </>
              ) : (
                t.saveBtn
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
