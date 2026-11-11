import React, { useEffect, useState, useCallback } from 'react';
import {
  initTelegram,
  TelegramUserState,
  haptics,
  syncTheme,
} from './lib/telegram';
import { syncUserProfile, fetchPortfolio, fetchWallets } from './lib/api';
import {
  formatFiat,
  formatSignedPercent,
  CurrencyPref,
  AggregatedAsset,
  PortfolioSummary,
  WatchedWallet,
} from '@asset-tracker/shared';
import { AddWalletModal } from './components/AddWalletModal';
import { ChainAccordion } from './components/ChainAccordion';
import { WalletList } from './components/WalletList';
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
  RefreshCw,
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Live Data State
  const [portfolio, setPortfolio] = useState<{
    summary: PortfolioSummary;
    assets: AggregatedAsset[];
  }>({
    summary: {
      totalValueUsd: 0,
      totalValueIdr: 0,
      change24hUsd: 0,
      change24hPercent: 0,
      allocation: { tonPercent: 0, evmPercent: 0, solanaPercent: 0 },
    },
    assets: [],
  });

  const [wallets, setWallets] = useState<WatchedWallet[]>([]);

  // Demo fallback state for whale demo mode
  const demoAssets: AggregatedAsset[] = [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      totalBalance: 5200.0,
      totalValueUsd: 5200.0,
      chains: [
        {
          blockchain: 'ton',
          contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
          balance: 2200.0,
          valueUsd: 2200.0,
          address: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU',
          label: 'TON Foundation',
        },
        {
          blockchain: 'ethereum',
          contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          balance: 3000.0,
          valueUsd: 3000.0,
          address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          label: 'Vitalik.eth',
        },
      ],
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      totalBalance: 1.824,
      totalValueUsd: 4850.5,
      chains: [
        {
          blockchain: 'ethereum',
          contractAddress: null,
          balance: 1.824,
          valueUsd: 4850.5,
          address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          label: 'Vitalik.eth',
        },
      ],
    },
    {
      symbol: 'TON',
      name: 'Toncoin',
      totalBalance: 480.0,
      totalValueUsd: 2400.35,
      chains: [
        {
          blockchain: 'ton',
          contractAddress: null,
          balance: 480.0,
          valueUsd: 2400.35,
          address: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU',
          label: 'TON Foundation',
        },
      ],
    },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [port, wList] = await Promise.all([fetchPortfolio(), fetchWallets()]);
      if (port?.summary) {
        setPortfolio(port);
      }
      setWallets(wList);
    } catch (err) {
      console.info('[Data Load Info] Running with local preview state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userState = initTelegram();
    setTgUser(userState);
    setIsDarkMode(userState.isDark);

    if (userState.isAvailable) {
      syncUserProfile().then(() => loadData()).catch(console.error);
    }
  }, [loadData]);

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

  // Determine active view data
  const currentAssets = isDemoMode ? demoAssets : portfolio.assets;
  const totalValueUsd = isDemoMode ? 12450.85 : portfolio.summary.totalValueUsd;
  const change24hPercent = isDemoMode ? 2.45 : portfolio.summary.change24hPercent;

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

          <button
            onClick={() => {
              haptics.impact('light');
              loadData();
            }}
            className="p-1.5 rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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

        {/* Quick Action: Tambah Alamat */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptics.impact('light');
              setIsAddModalOpen(true);
            }}
            className="flex-1 min-h-[44px] bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary rounded-button text-sm font-medium flex items-center justify-center gap-2 hover:opacity-95 active:opacity-85 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Alamat Baru
          </button>

          {!isDemoMode && wallets.length === 0 && (
            <button
              onClick={handleToggleDemo}
              className="min-h-[44px] px-3.5 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-surface-dim transition-colors"
              title="Coba demo data"
            >
              <Eye className="w-4 h-4 text-brand-subdued" />
              Demo
            </button>
          )}
        </div>

        {/* Tab Content: Home */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4">
            {/* Chain Abstraction Accordion */}
            <ChainAccordion assets={currentAssets} currency={currency} />

            {/* Tracked Wallets List */}
            {!isDemoMode && (
              <WalletList wallets={wallets} onRefresh={loadData} />
            )}
          </div>
        )}

        {/* Tab Content: Perf (Performance) */}
        {activeTab === 'perf' && (
          <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-5 text-center flex flex-col items-center gap-2">
            <TrendingUp className="w-8 h-8 text-chain-evm" />
            <h3 className="text-sm font-semibold">Histori & Grafik Kinerja</h3>
            <p className="text-xs text-brand-subdued dark:text-brand-subdued-dark max-w-xs leading-relaxed">
              Grafik akumulasi portofolio harian akan mulai terbentuk otomatis setelah data saldo tersimpan 2 hari berturut-turut via Cron Snapshot.
            </p>
          </div>
        )}

        {/* Tab Content: Settings */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-3">
            <WalletList wallets={wallets} onRefresh={loadData} />

            <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-tile p-4 flex flex-col gap-3">
              <h3 className="text-xs font-semibold border-b border-brand-divider dark:border-brand-divider-dark pb-2">
                Preferensi & Filter
              </h3>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium">Filter Token Sampah</div>
                  <div className="text-[11px] text-brand-subdued">Sembunyikan token dengan likuiditas &lt; $10k</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 accent-brand-primary"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <div className="font-medium">Mata Uang Acuan</div>
                  <div className="text-[11px] text-brand-subdued">Format nilai total aset</div>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <button
                    onClick={() => setCurrency('USD')}
                    className={`px-2 py-0.5 rounded ${currency === 'USD' ? 'bg-brand-primary text-white font-semibold' : 'border border-brand-border'}`}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => setCurrency('IDR')}
                    className={`px-2 py-0.5 rounded ${currency === 'IDR' ? 'bg-brand-primary text-white font-semibold' : 'border border-brand-border'}`}
                  >
                    IDR
                  </button>
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

      {/* Smart Textarea Add Wallet Modal */}
      <AddWalletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
