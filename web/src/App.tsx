import React, { useEffect, useState } from 'react';
import {
  initTelegram,
  TelegramUserState,
  haptics,
  syncTheme,
} from './lib/telegram';
import { syncUserProfile } from './lib/api';
import { formatFiat, formatSignedPercent, CurrencyPref } from '@asset-tracker/shared';
import {
  ShieldCheck,
  Plus,
  Eye,
  Sun,
  Moon,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  Home,
  CheckCircle2,
} from 'lucide-react';

export function App() {
  const [tgUser, setTgUser] = useState<TelegramUserState>({
    isDark: false,
    isAvailable: false,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState<CurrencyPref>('USD');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'perf' | 'settings'>('home');

  useEffect(() => {
    const userState = initTelegram();
    setTgUser(userState);
    setIsDarkMode(userState.isDark);

    // Sync profile with Cloudflare Worker if running inside Telegram
    if (userState.isAvailable) {
      syncUserProfile().catch((err) => {
        console.info('[Sync Info] Worker sync bypassed in standalone preview:', err.message);
      });
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    syncTheme(next);
    haptics.selection();
  };

  const handleTabChange = (tab: 'home' | 'perf' | 'settings') => {
    setActiveTab(tab);
    haptics.selection();
  };

  const handleToggleDemo = () => {
    setIsDemoMode((prev) => !prev);
    haptics.notification('success');
  };

  // Demo portfolio values vs empty new user values
  const totalValueUsd = isDemoMode ? 12450.85 : 0;
  const change24hPercent = isDemoMode ? 2.45 : 0;

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark text-brand-primary dark:text-brand-primary-dark flex flex-col font-sans transition-colors duration-200">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-brand-accent-light dark:bg-brand-border-dark px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-brand-border dark:border-brand-border-dark">
          <span className="flex items-center gap-1.5 text-brand-primary dark:text-brand-primary-dark font-medium">
            <Sparkles className="w-3.5 h-3.5 text-chain-evm" />
            Mode Demo Aktif: Portofolio Contoh Whale
          </span>
          <button
            onClick={handleToggleDemo}
            className="text-xs font-semibold underline hover:opacity-80 active:opacity-60"
          >
            Keluar
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-brand-divider dark:border-brand-divider-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-accent-light dark:bg-surface-container-high-dark flex items-center justify-center border border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold text-xs font-mono">
            {tgUser.firstName ? tgUser.firstName.charAt(0).toUpperCase() : '🌿'}
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              {tgUser.firstName ? `Halo, ${tgUser.firstName}` : 'Asset Tracker'}
            </h1>
            <p className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark">
              100% Watch-Only
            </p>
          </div>
        </div>

        {/* Currency & Theme Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrency((c) => (c === 'USD' ? 'IDR' : 'USD'));
              haptics.selection();
            }}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark hover:bg-surface-dim transition-colors"
            title="Ganti mata uang"
          >
            {currency}
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark transition-colors"
            title="Ganti tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 max-w-md mx-auto w-full flex flex-col gap-4 pb-24">
        {/* Hero Portfolio Card (Bento Style) */}
        <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-bento p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-brand-subdued dark:text-brand-subdued-dark font-medium mb-1">
            <span>TOTAL ASSET VALUE</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-semantic-gain" />
              Verified Safe
            </span>
          </div>

          <div className="text-3xl font-mono font-medium tracking-tight mb-2">
            {formatFiat(totalValueUsd, currency)}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                change24hPercent >= 0
                  ? 'bg-semantic-gain-bg dark:bg-semantic-gain-dark-bg text-semantic-gain dark:text-semantic-gain-dark'
                  : 'bg-semantic-loss-bg dark:bg-semantic-loss-dark-bg text-semantic-loss dark:text-semantic-loss-dark'
              }`}
            >
              {formatSignedPercent(change24hPercent)} Hari Ini
            </span>
            {currency === 'USD' && (
              <span className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark">
                (~{formatFiat(totalValueUsd, 'IDR')})
              </span>
            )}
          </div>
        </div>

        {/* Supported Multi-Chain Badges */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-brand-subdued dark:text-brand-subdued-dark">
            Jaringan Terhubung
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark text-chain-ton">
              TON
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark text-chain-evm">
              EVM (5)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark text-chain-solana">
              SOL
            </span>
          </div>
        </div>

        {/* Onboarding Trust & Empty State / Action Duo */}
        {!isDemoMode && (
          <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-accent-light/50 dark:bg-brand-border-dark flex items-center justify-center text-brand-primary dark:text-brand-primary-dark">
              <Sparkles className="w-6 h-6 text-chain-evm" />
            </div>

            <div>
              <h2 className="text-base font-semibold mb-1">
                Lacak asetmu tanpa rasa waswas
              </h2>
              <p className="text-xs text-brand-subdued dark:text-brand-subdued-dark leading-relaxed">
                Cukup tempelkan alamat publikmu. Mendukung Ethereum, BNB Chain, Base, Arbitrum, Polygon, Solana, dan TON.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  haptics.impact('light');
                  alert('Phase 2: Fitur Tambah Alamat (Smart Textarea) siap diintegrasikan!');
                }}
                className="w-full min-h-[44px] bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-sm font-medium flex items-center justify-center gap-2 hover:opacity-95 active:opacity-85 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Tambah Alamat Baru
              </button>

              <button
                onClick={handleToggleDemo}
                className="w-full min-h-[44px] bg-transparent border border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark rounded-button text-sm font-medium flex items-center justify-center gap-2 hover:bg-brand-accent-light/30 active:opacity-75 transition-colors"
              >
                <Eye className="w-4 h-4 text-brand-subdued" />
                Coba Versi Demo (Whale Wallet)
              </button>
            </div>
          </div>
        )}

        {/* Demo Mode Asset Preview */}
        {isDemoMode && (
          <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2">
              <span>Aset Contoh Terkumpul</span>
              <span className="font-mono text-brand-subdued">4 Aset</span>
            </div>

            <div className="flex flex-col divide-y divide-brand-divider dark:divide-brand-divider-dark">
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-accent-light dark:bg-brand-border-dark flex items-center justify-center font-mono font-semibold text-xs">
                    US
                  </div>
                  <div>
                    <div className="text-sm font-medium">Tether USD</div>
                    <div className="text-xs text-brand-subdued font-mono">3 Jaringan</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-medium">
                    {formatFiat(5200.0, currency)}
                  </div>
                  <div className="text-xs text-semantic-gain font-mono">+0.01%</div>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-chain-evm/15 flex items-center justify-center font-mono font-semibold text-xs text-chain-evm">
                    ET
                  </div>
                  <div>
                    <div className="text-sm font-medium">Ethereum</div>
                    <div className="text-xs text-brand-subdued font-mono">1.824 ETH</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-medium">
                    {formatFiat(4850.5, currency)}
                  </div>
                  <div className="text-xs text-semantic-gain font-mono">+3.12%</div>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-chain-ton/15 flex items-center justify-center font-mono font-semibold text-xs text-chain-ton">
                    TO
                  </div>
                  <div>
                    <div className="text-sm font-medium">Toncoin</div>
                    <div className="text-xs text-brand-subdued font-mono">480 TON</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-medium">
                    {formatFiat(2400.35, currency)}
                  </div>
                  <div className="text-xs text-semantic-gain font-mono">+1.85%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Japandi Pill) */}
      <nav className="fixed bottom-3 left-4 right-4 max-w-md mx-auto z-30">
        <div className="h-14 px-3 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-md border border-brand-border dark:border-brand-border-dark rounded-full shadow-sm flex items-center justify-around">
          <button
            onClick={() => handleTabChange('home')}
            className={`min-h-[44px] min-w-[44px] px-3 flex items-center gap-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'home'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleTabChange('perf')}
            className={`min-h-[44px] min-w-[44px] px-3 flex items-center gap-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'perf'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Perf.</span>
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`min-h-[44px] min-w-[44px] px-3 flex items-center gap-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
