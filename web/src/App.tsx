import React, { useEffect, useState, useCallback } from 'react';
import {
  initTelegram,
  TelegramUserState,
  haptics,
  syncTheme,
} from './lib/telegram';
import { syncUserProfile, fetchPortfolio, fetchWallets, fetchTransactions } from './lib/api';
import {
  formatFiat,
  formatSignedPercent,
  CurrencyPref,
  AggregatedAsset,
  PortfolioSummary,
  WatchedWallet,
  MutationTransaction,
} from '@asset-tracker/shared';
import { AddWalletModal } from './components/AddWalletModal';
import { ChainAccordion } from './components/ChainAccordion';
import { WalletList } from './components/WalletList';
import { AllocationDonut } from './components/AllocationDonut';
import { SparklineChart } from './components/SparklineChart';
import { RecentTransactions } from './components/RecentTransactions';
import { PerfTab } from './components/PerfTab';
import { SettingsTab } from './components/SettingsTab';
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
  const [transactions, setTransactions] = useState<MutationTransaction[]>([]);

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

  const demoSummary: PortfolioSummary = {
    totalValueUsd: 12450.85,
    totalValueIdr: 12450.85 * 16200,
    change24hUsd: 305.04,
    change24hPercent: 2.45,
    allocation: {
      tonPercent: 37,
      evmPercent: 63,
      solanaPercent: 0,
    },
  };

  const demoTransactions: MutationTransaction[] = [
    {
      id: 'tx-1',
      blockchain: 'ethereum',
      txHash: '0x3a82f91b72c91823d0a928ef1c293812739281a9',
      fromAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      toAddress: '0x28c6c06298d514db089934071355e5743bf21d60',
      tokenSymbol: 'ETH',
      amount: 0.5,
      amountUsd: 1330.25,
      direction: 'out',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'tx-2',
      blockchain: 'ton',
      txHash: '6ef91c988a81726a8d7912a781298491827419da',
      fromAddress: 'EQC0B29A781298491827419da6ef91c988a81726a8',
      toAddress: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU',
      tokenSymbol: 'TON',
      amount: 120.0,
      amountUsd: 600.0,
      direction: 'in',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
    {
      id: 'tx-3',
      blockchain: 'solana',
      txHash: '5xY3q182987123984192847192837192837192837',
      fromAddress: '8wJpqe82938471928371928371928371928371928',
      toAddress: '4Nd1mBQtrMJVYVfKf2PJy9NZGad3TkLqcpkShG5maVe5',
      tokenSymbol: 'SOL',
      amount: 4.25,
      amountUsd: 645.0,
      direction: 'in',
      timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [port, wList, txList] = await Promise.all([
        fetchPortfolio(),
        fetchWallets(),
        fetchTransactions(10),
      ]);
      if (port?.summary) {
        setPortfolio(port);
      }
      setWallets(wList);
      setTransactions(txList);
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
  const currentSummary = isDemoMode ? demoSummary : portfolio.summary;
  const currentTransactions = isDemoMode ? demoTransactions : transactions;
  const totalValueUsd = currentSummary.totalValueUsd;
  const change24hPercent = currentSummary.change24hPercent;

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
        {/* Tab Content: Home */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-150">
            {/* Hero Portfolio Card (Bento Style with Touch Scrubber Sparkline) */}
            <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-bento p-5 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-brand-subdued dark:text-brand-subdued-dark font-medium">
                <span>TOTAL ASSET VALUE</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-semantic-gain" />
                  Verified Safe
                </span>
              </div>

              <div className="text-3xl font-mono font-medium tracking-tight">
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

              {/* Sparkline Interactive Scrubber */}
              <SparklineChart
                changePercent={change24hPercent}
                currency={currency}
              />
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

            {/* Ecosystem Allocation Donut Chart */}
            <AllocationDonut summary={currentSummary} currency={currency} />

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

            {/* Chain Abstraction Accordion */}
            <ChainAccordion assets={currentAssets} currency={currency} />

            {/* Recent Mutations Activity */}
            <RecentTransactions
              transactions={currentTransactions}
              currency={currency}
            />
          </div>
        )}

        {/* Tab Content: Perf (Performance) */}
        {activeTab === 'perf' && (
          <PerfTab totalValueUsd={totalValueUsd} currency={currency} />
        )}

        {/* Tab Content: Settings */}
        {activeTab === 'settings' && (
          <SettingsTab
            userProfile={{
              id: tgUser.id || 0,
              firstName: tgUser.firstName,
              username: tgUser.username,
              currencyPref: currency,
              minAlertUsd: 1.0,
              hideSpam: true,
              isBanned: false,
              createdAt: new Date().toISOString(),
            }}
            wallets={wallets}
            currency={currency}
            onCurrencyChange={setCurrency}
            onRefreshWallets={loadData}
            onOpenAddWallet={() => setIsAddModalOpen(true)}
          />
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
