import React, { useState } from 'react';
import { WatchedWallet, CurrencyPref, UserProfile } from '@asset-tracker/shared';
import { WalletList } from './WalletList';
import { haptics } from '../lib/telegram';
import { updatePreferences } from '../lib/api';
import { Shield, Bell, DollarSign, Trash2, User, Check, ExternalLink, ShieldAlert, SlidersHorizontal } from 'lucide-react';

interface SettingsTabProps {
  userProfile?: UserProfile | null;
  wallets: WatchedWallet[];
  currency: CurrencyPref;
  onCurrencyChange: (c: CurrencyPref) => void;
  onRefreshWallets: () => void;
  onOpenAddWallet: () => void;
  onOpenAdmin?: () => void;
}

export function SettingsTab({
  userProfile,
  wallets,
  currency,
  onCurrencyChange,
  onRefreshWallets,
  onOpenAddWallet,
  onOpenAdmin,
}: SettingsTabProps) {
  const [hideSpam, setHideSpam] = useState(userProfile?.hideSpam ?? true);
  const [minAlert, setMinAlert] = useState(userProfile?.minAlertUsd ? userProfile.minAlertUsd.toString() : '1.00');
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    haptics.notification('success');

    const parsedAlert = parseFloat(minAlert);
    await updatePreferences({
      currencyPref: currency,
      hideSpam,
      minAlertUsd: isNaN(parsedAlert) ? 1.0 : parsedAlert,
    });

    setSaving(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleDeleteAccount = () => {
    const msg = 'Apakah Anda yakin ingin menghapus semua data dan daftar dompet dari Asset Tracker?';
    const tg = (window as any).Telegram?.WebApp;

    const onConfirmed = () => {
      haptics.notification('warning');
      if (tg?.showAlert) {
        tg.showAlert('Kirim perintah /delete langsung ke Bot Telegram untuk menghapus akun secara permanen.');
      } else {
        alert('Kirim perintah /delete langsung ke Bot Telegram untuk menghapus akun secara permanen.');
      }
    };

    if (tg?.showConfirm) {
      tg.showConfirm(msg, (ok: boolean) => {
        if (ok) onConfirmed();
      });
    } else if (confirm(msg)) {
      onConfirmed();
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-japandi-fade-up">
      {/* User Identity Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 shadow-sm flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center font-mono font-semibold text-sm text-brand-primary dark:text-brand-primary-dark border border-brand-border/40 dark:border-brand-border-dark/40 shadow-2xs">
            <User className="w-5 h-5 text-brand-subdued" />
          </div>
          <div>
            <div className="text-sm font-semibold">
              {userProfile?.firstName || 'Pengguna Telegram'}
            </div>
            <div className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark">
              ID: {userProfile?.id || 'Browser Preview'} {userProfile?.username ? `(@${userProfile.username})` : ''}
            </div>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-semantic-gain-bg text-semantic-gain dark:bg-semantic-gain-dark-bg dark:text-semantic-gain-dark font-mono text-[10px] font-medium flex items-center gap-1.5 border border-semantic-gain/20 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-gain animate-pulse-glow" />
          Aktif
        </span>
      </div>

      {/* Tracked Wallets Management */}
      <WalletList wallets={wallets} onRefresh={onRefreshWallets} />

      {/* Settings & Preferences Bento Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 shadow-sm flex flex-col gap-4 transition-all">
        <div className="flex items-center gap-2 border-b border-brand-divider dark:border-brand-divider-dark pb-2.5">
          <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
          </div>
          <h3 className="text-xs font-semibold">Preferensi Aplikasi</h3>
        </div>

        {/* Currency Preference */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand-subdued" />
            <div>
              <div className="font-medium">Mata Uang Acuan</div>
              <div className="text-[11px] text-brand-subdued">Tampilkan dalam Dolar atau Rupiah</div>
            </div>
          </div>

          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => onCurrencyChange('USD')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                currency === 'USD'
                  ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary shadow-xs'
                  : 'border border-brand-border dark:border-brand-border-dark text-brand-subdued'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => onCurrencyChange('IDR')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                currency === 'IDR'
                  ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary shadow-xs'
                  : 'border border-brand-border dark:border-brand-border-dark text-brand-subdued'
              }`}
            >
              IDR (Rp)
            </button>
          </div>
        </div>

        {/* Anti-Spam Filter */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-brand-divider dark:border-brand-divider-dark">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-chain-evm" />
            <div>
              <div className="font-medium">Filter Token Sampah / Airdrop Scam</div>
              <div className="text-[11px] text-brand-subdued">Sembunyikan token dengan likuiditas &lt; $10k</div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hideSpam}
              onChange={(e) => {
                setHideSpam(e.target.checked);
                haptics.selection();
              }}
              className="sr-only peer"
              aria-label="Filter token sampah atau airdrop scam"
            />
            <div className="w-9 h-5 bg-surface-dim dark:bg-surface-container-high-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-semantic-gain"></div>
          </label>
        </div>

        {/* Notification Alert Threshold */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-brand-divider dark:border-brand-divider-dark">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-chain-ton" />
            <div>
              <div className="font-medium">Ambang Notifikasi Mutasi</div>
              <div className="text-[11px] text-brand-subdued">Abaikan transaksi debu di bawah batas ini</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">$</span>
            <input
              type="number"
              step="0.5"
              min="0"
              value={minAlert}
              onChange={(e) => setMinAlert(e.target.value)}
              className="w-16 px-2 py-1 text-xs font-mono text-right bg-canvas dark:bg-canvas-dark border border-brand-border dark:border-brand-border-dark rounded-button focus:outline-none"
              aria-label="Ambang batas minimal notifikasi mutasi dalam USD"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full mt-2 min-h-[44px] py-2.5 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-xs"
        >
          {saving ? (
            'Menyimpan...'
          ) : savedNotice ? (
            <>
              <Check className="w-3.5 h-3.5 text-semantic-gain" />
              Tersimpan!
            </>
          ) : (
            'Simpan Pengaturan'
          )}
        </button>
      </div>

      {/* Admin Quick Action */}
      {onOpenAdmin && (
        <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-chain-evm/10 flex items-center justify-center text-chain-evm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold">Admin Control Center</div>
              <div className="text-[11px] text-brand-subdued">Statistik sistem, broadcast, & pemeliharaan</div>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.impact('light');
              onOpenAdmin();
            }}
            className="px-3 py-1.5 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Buka Panel
          </button>
        </div>
      )}

      {/* Danger Zone / Privacy */}
      <div className="bg-surface dark:bg-surface-dark border border-semantic-loss/20 rounded-tile p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-semantic-loss dark:text-semantic-loss-dark">
            Hapus Semua Data Akun
          </div>
          <div className="text-[11px] text-brand-subdued">
            Hapus seluruh daftar dompet & histori secara permanen
          </div>
        </div>

        <button
          onClick={handleDeleteAccount}
          className="px-3 py-1.5 border border-semantic-loss/30 text-semantic-loss dark:text-semantic-loss-dark rounded-button text-xs font-semibold hover:bg-semantic-loss-bg transition-colors"
        >
          Hapus Akun
        </button>
      </div>
    </div>
  );
}
