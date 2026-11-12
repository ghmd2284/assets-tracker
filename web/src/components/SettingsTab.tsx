import React, { useState } from 'react';
import { WatchedWallet, CurrencyPref, UserProfile, UserRewardSummary } from '@asset-tracker/shared';
import { WalletList } from './WalletList';
import { haptics } from '../lib/telegram';
import { updatePreferences } from '../lib/api';
import {
  Shield,
  Bell,
  DollarSign,
  User,
  Check,
  ShieldAlert,
  SlidersHorizontal,
  Gift,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n';

interface SettingsTabProps {
  userProfile?: UserProfile | null;
  wallets: WatchedWallet[];
  currency: CurrencyPref;
  onCurrencyChange: (c: CurrencyPref) => void;
  onRefreshWallets: () => void;
  onOpenAddWallet: () => void;
  onOpenAdmin?: () => void;
  onOpenRewards?: () => void;
  rewardsSummary?: UserRewardSummary;
  lang?: Language;
}

export function SettingsTab({
  userProfile,
  wallets,
  currency,
  onCurrencyChange,
  onRefreshWallets,
  onOpenAddWallet,
  onOpenAdmin,
  onOpenRewards,
  rewardsSummary,
  lang = 'id',
}: SettingsTabProps) {
  const t = translations[lang];
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
    const msg =
      lang === 'id'
        ? 'Apakah Anda yakin ingin menghapus semua data dan daftar dompet dari Asset Tracker?'
        : 'Are you sure you want to delete all data and tracked wallets from Asset Tracker?';
    const tg = (window as any).Telegram?.WebApp;

    const onConfirmed = () => {
      haptics.notification('warning');
      const alertMsg =
        lang === 'id'
          ? 'Kirim perintah /delete langsung ke Bot Telegram untuk menghapus akun secara permanen.'
          : 'Send /delete command directly to the Telegram Bot to delete your account permanently.';
      if (tg?.showAlert) {
        tg.showAlert(alertMsg);
      } else {
        alert(alertMsg);
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

  const fullName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : lang === 'id'
    ? 'Pengguna Telegram'
    : 'Telegram User';

  const initials = (userProfile?.firstName?.slice(0, 1) || 'U').toUpperCase();

  return (
    <div className="flex flex-col gap-4 animate-japandi-fade-up">
      {/* User Identity Card: 3 Lines with Profile Photo */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 shadow-sm flex items-center justify-between transition-all">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with Photo & Fallback */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-brand-border dark:border-brand-border-dark shrink-0 shadow-2xs bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
            {userProfile?.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={fullName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="font-mono font-semibold text-sm text-brand-primary dark:text-brand-primary-dark select-none">
              {initials}
            </span>
          </div>

          {/* 3-Line Identity Info: Name, Username, ID */}
          <div className="min-w-0 flex flex-col justify-center">
            {/* Line 1: Name */}
            <div className="text-sm font-semibold truncate leading-tight">
              {fullName}
            </div>

            {/* Line 2: Username */}
            <div className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark truncate leading-tight mt-0.5">
              {userProfile?.username ? `@${userProfile.username}` : '@anonymous'}
            </div>

            {/* Line 3: ID */}
            <div className="text-[11px] font-mono text-brand-subdued/80 dark:text-brand-subdued-dark/80 truncate leading-tight mt-0.5">
              ID: {userProfile?.id || 'Browser Preview'}
            </div>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-semantic-gain-bg text-semantic-gain dark:bg-semantic-gain-dark-bg dark:text-semantic-gain-dark font-mono text-[10px] font-medium flex items-center gap-1.5 border border-semantic-gain/20 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-gain animate-pulse-glow" />
          {t.settings.userActive}
        </span>
      </div>

      {/* Tracked Wallets Management */}
      <WalletList wallets={wallets} onRefresh={onRefreshWallets} lang={lang} />

      {/* Rewards & Missions Entry Bento Card */}
      {onOpenRewards && (
        <div
          onClick={() => {
            haptics.impact('light');
            onOpenRewards();
          }}
          className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark hover:border-amber-500/40 rounded-tile p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-brand-primary dark:text-brand-primary-dark">
                  {t.rewards.title}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-semibold">
                  GigaPub
                </span>
              </div>
              <div className="text-[11px] text-brand-subdued mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {rewardsSummary?.rewardPoints || 0} Pts
                </span>
                <span>•</span>
                <span className="text-semantic-gain dark:text-semantic-gain-dark">
                  +{rewardsSummary?.bonusWalletSlots || 0} Slot
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-brand-primary dark:text-brand-primary-dark">
            <span className="text-[11px] text-brand-subdued group-hover:text-brand-primary dark:group-hover:text-brand-primary-dark transition-colors">
              {t.rewards.badge}
            </span>
            <ChevronRight className="w-4 h-4 text-brand-subdued group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* Settings & Preferences Bento Card */}
      <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 shadow-sm flex flex-col gap-4 transition-all">
        <div className="flex items-center gap-2 border-b border-brand-divider dark:border-brand-divider-dark pb-2.5">
          <div className="w-6 h-6 rounded-md bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary dark:text-brand-primary-dark" />
          </div>
          <h3 className="text-xs font-semibold">{t.settings.preferences}</h3>
        </div>

        {/* Currency Preference */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand-subdued" />
            <div>
              <div className="font-medium">{t.settings.currencyPref}</div>
              <div className="text-[11px] text-brand-subdued">{t.settings.currencyDesc}</div>
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
              <div className="font-medium">{t.settings.spamFilter}</div>
              <div className="text-[11px] text-brand-subdued">{t.settings.spamFilterDesc}</div>
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
              aria-label={t.settings.spamFilter}
            />
            <div className="w-9 h-5 bg-surface-dim dark:bg-surface-container-high-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-semantic-gain"></div>
          </label>
        </div>

        {/* Notification Alert Threshold */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-brand-divider dark:border-brand-divider-dark">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-chain-ton" />
            <div>
              <div className="font-medium">{t.settings.alertThreshold}</div>
              <div className="text-[11px] text-brand-subdued">{t.settings.alertThresholdDesc}</div>
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
              aria-label={t.settings.alertThreshold}
            />
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full mt-2 min-h-[44px] py-2.5 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-xs"
        >
          {saving ? (
            t.common.saving
          ) : savedNotice ? (
            <>
              <Check className="w-3.5 h-3.5 text-semantic-gain" />
              {t.common.saved}
            </>
          ) : (
            t.settings.saveSettings
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
              <div className="text-xs font-semibold">{t.settings.adminTitle}</div>
              <div className="text-[11px] text-brand-subdued">{t.settings.adminDesc}</div>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.impact('light');
              onOpenAdmin();
            }}
            className="px-3 py-1.5 bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            {t.settings.adminBtn}
          </button>
        </div>
      )}

      {/* Danger Zone / Privacy */}
      <div className="bg-surface dark:bg-surface-dark border border-semantic-loss/20 rounded-tile p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-semantic-loss dark:text-semantic-loss-dark">
            {t.settings.dangerTitle}
          </div>
          <div className="text-[11px] text-brand-subdued">
            {t.settings.dangerDesc}
          </div>
        </div>

        <button
          onClick={handleDeleteAccount}
          className="px-3 py-1.5 border border-semantic-loss/30 text-semantic-loss dark:text-semantic-loss-dark rounded-button text-xs font-semibold hover:bg-semantic-loss-bg transition-colors"
        >
          {t.settings.dangerBtn}
        </button>
      </div>
    </div>
  );
}
