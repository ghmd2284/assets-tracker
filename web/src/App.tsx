import React, { useEffect, useState, useCallback } from 'react';
import {
  initTelegram,
  TelegramUserState,
  haptics,
  syncTheme,
} from './lib/telegram';
import { syncUserProfile, fetchPortfolio, fetchWallets, fetchTransactions, syncBalances } from './lib/api';
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
import { AdminModal } from './components/AdminModal';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 2500);
  }, []);

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

  const loadData = useCallback(async (withSync = false) => {
    setLoading(true);
    try {
      if (withSync) {
        await syncBalances();
      }
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
      if (withSync) {
        showToast('Portofolio berhasil disinkronkan!');
      }
    } catch (err) {
      console.info('[Data Load Info] Running with local preview state:', err);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
    setIsDemoMode((prev) => {
      const next = !prev;
      showToast(next ? 'Mode demo whale aktif' : 'Keluar dari mode demo');
      return next;
    });
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
      {/* Demo Mode Notice Banner (Constrained to max-w-md on desktop) */}
      {isDemoMode && (
        <div className="bg-brand-accent-light dark:bg-brand-border-dark border-b border-brand-border dark:border-brand-border-dark">
          <div className="max-w-md mx-auto px-4 py-2 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-brand-primary dark:text-brand-primary-dark font-medium">
              <Sparkles className="w-3.5 h-3.5 text-chain-evm" />
              Mode Demo Aktif: Portofolio Contoh Whale
            </span>
            <button
              type="button"
              onClick={handleToggleDemo}
              className="text-xs font-semibold underline hover:opacity-80 active:scale-95 transition-transform"
              aria-label="Keluar dari mode demo"
            >
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* Top Header (Aligned to max-w-md on desktop) */}
      <header className="border-b border-brand-divider dark:border-brand-divider-dark bg-canvas/80 dark:bg-canvas-dark/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 pt-3.5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-accent-light dark:bg-surface-container-high-dark flex items-center justify-center border border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold text-xs font-mono shadow-xs">
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

          {/* Currency & Theme Toggles with Accessible Sizing */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nextCurrency = currency === 'USD' ? 'IDR' : 'USD';
                setCurrency(nextCurrency);
                showToast(`Mata uang diganti ke ${nextCurrency}`);
                haptics.selection();
              }}
              className="min-h-[38px] px-3 text-xs font-mono font-medium rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark hover:bg-surface-dim active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label={`Ganti mata uang acuan, saat ini ${currency}`}
              title="Ganti mata uang"
            >
              {currency}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="min-w-[38px] min-h-[38px] rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label="Ganti tema gelap atau terang"
              title="Ganti tema"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.impact('light');
                loadData(true);
              }}
              className="min-w-[38px] min-h-[38px] rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label="Muat ulang dan sinkronkan portofolio"
              title="Muat ulang dan sinkronkan data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-primary dark:text-brand-primary-dark' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Safe-Area Padding */}
      <main
        className="flex-1 px-4 py-4 max-w-md mx-auto w-full flex flex-col gap-4"
        style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Tab Content: Home */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 animate-japandi-fade-up">
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

              {/* Sparkline Interactive Scrubber (Active in Demo Mode or when historical data exists) */}
              {isDemoMode && (
                <SparklineChart
                  data={[12100, 12250, 12180, 12300, 12280, 12390, 12450.85]}
                  changePercent={change24hPercent}
                  currency={currency}
                />
              )}
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
            <ChainAccordion
              assets={currentAssets}
              currency={currency}
              hasWallets={wallets.length > 0}
            />

            {/* Connected Wallets List (Watch-Only) */}
            {!isDemoMode && wallets.length > 0 && (
              <WalletList wallets={wallets} onRefresh={loadData} />
            )}

            {/* Recent Mutations Activity */}
            <RecentTransactions
              transactions={currentTransactions}
              currency={currency}
            />
          </div>
        )}

        {/* Tab Content: Perf (Performance) */}
        {activeTab === 'perf' && (
          <div className="animate-japandi-fade-up">
            <PerfTab totalValueUsd={totalValueUsd} currency={currency} />
          </div>
        )}

        {/* Tab Content: Settings */}
        {activeTab === 'settings' && (
          <div className="animate-japandi-fade-up">
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
              onOpenAdmin={() => setIsAdminModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Japandi Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-toast-enter">
          <div className="px-4 py-2 rounded-full bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary text-xs font-mono font-medium shadow-lg flex items-center gap-2 border border-brand-border/20 dark:border-brand-border-dark/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-semantic-gain shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar (Japandi Pill with Safe Area) */}
      <nav
        className="fixed left-4 right-4 max-w-md mx-auto z-30 pointer-events-auto"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="h-14 px-3 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-md border border-brand-border dark:border-brand-border-dark rounded-full shadow-md flex items-center justify-around">
          <button
            type="button"
            onClick={() => handleTabChange('home')}
            className={`min-h-[44px] min-w-[44px] px-3.5 flex items-center gap-1.5 rounded-full text-xs font-medium active:scale-95 transition-all ${
              activeTab === 'home'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold shadow-xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label="Buka tab Beranda"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('perf')}
            className={`min-h-[44px] min-w-[44px] px-3.5 flex items-center gap-1.5 rounded-full text-xs font-medium active:scale-95 transition-all ${
              activeTab === 'perf'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold shadow-xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label="Buka tab Performa"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Perf.</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            className={`min-h-[44px] min-w-[44px] px-3.5 flex items-center gap-1.5 rounded-full text-xs font-medium active:scale-95 transition-all ${
              activeTab === 'settings'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold shadow-xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label="Buka tab Pengaturan"
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
          setIsDemoMode(false);
          loadData();
        }}
      />

      {/* Admin Control Center Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
}
