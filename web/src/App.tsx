import React, { useEffect, useState, useCallback } from 'react';
import {
  initTelegram,
  TelegramUserState,
  haptics,
  syncTheme,
} from './lib/telegram';
import { syncUserProfile, fetchPortfolio, fetchWallets, fetchTransactions, syncBalances, fetchRewardsSummary } from './lib/api';
import {
  formatFiat,
  formatSignedPercent,
  CurrencyPref,
  UserProfile,
  AggregatedAsset,
  PortfolioSummary,
  WatchedWallet,
  MutationTransaction,
  UserRewardSummary,
  getChainLogoUrl,
} from '@asset-tracker/shared';
import { AddWalletModal } from './components/AddWalletModal';
import { ChainAccordion, NetworkFilterType } from './components/ChainAccordion';
import { AllocationDonut } from './components/AllocationDonut';
import { SparklineChart } from './components/SparklineChart';
import { RecentTransactions } from './components/RecentTransactions';
import { AllTransactionsModal } from './components/AllTransactionsModal';
import { PerfTab } from './components/PerfTab';
import { SettingsTab } from './components/SettingsTab';
import { RewardsModal } from './components/RewardsModal';
import { AdminModal } from './components/AdminModal';
import { HomeSkeleton } from './components/Skeletons';
import { Language, translations } from './lib/i18n';
import { initGigaPub, checkPendingOfferWallRewards } from './lib/gigapub';
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
  Gift,
} from 'lucide-react';

export function App() {
  const [tgUser, setTgUser] = useState<TelegramUserState>({
    isDark: false,
    isAvailable: false,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lang, setLang] = useState<Language>('id');
  const [currency, setCurrency] = useState<CurrencyPref>('USD');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [networkFilter, setNetworkFilter] = useState<NetworkFilterType>('all');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'perf' | 'settings'>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAllTxModalOpen, setIsAllTxModalOpen] = useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  const [rewardsSummary, setRewardsSummary] = useState<UserRewardSummary>({
    rewardPoints: 0,
    bonusWalletSlots: 0,
    maxWallets: 10,
    totalRewardsClaimed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const t = translations[lang];

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

  const loadData = useCallback(
    async (withSync = false) => {
      setLoading(true);
      if (withSync) setIsSyncing(true);
      try {
        if (withSync) {
          await syncBalances();
        }
        const [port, wList, txList] = await Promise.all([
          fetchPortfolio(),
          fetchWallets(),
          fetchTransactions(50),
        ]);
        if (port?.summary) {
          setPortfolio(port);
        }
        setWallets(wList);
        setTransactions(txList);
        if (withSync) {
          showToast(translations[lang].common.syncedSuccess);
        }
      } catch (err) {
        console.info('[Data Load Info] Running with local preview state:', err);
      } finally {
        setLoading(false);
        setIsSyncing(false);
        setInitialLoading(false);
      }
    },
    [showToast, lang]
  );

  useEffect(() => {
    const userState = initTelegram();
    setTgUser(userState);
    setIsDarkMode(userState.isDark);

    if (userState.isAvailable) {
      syncUserProfile()
        .then((profile) => {
          if (profile) {
            setUserProfile(profile);
            if (profile.currencyPref) {
              setCurrency(profile.currencyPref);
            }
          }
          return loadData();
        })
        .catch(console.error);

      // Fetch user rewards stats
      fetchRewardsSummary().then(setRewardsSummary).catch(console.warn);
    }

    // Initialize GigaPub OfferWall & Rewarded Ads SDK
    initGigaPub(undefined, (claim) => {
      showToast(translations[lang].rewards.claimSuccessToast(claim.amount));
      fetchRewardsSummary().then(setRewardsSummary).catch(console.warn);
    }).then(async (sdk) => {
      if (sdk) {
        const recovered = await checkPendingOfferWallRewards();
        if (recovered > 0) {
          showToast(translations[lang].rewards.recoveredToast(recovered));
          fetchRewardsSummary().then(setRewardsSummary).catch(console.warn);
        }
      }
    });
  }, [loadData, lang, showToast]);

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
      showToast(next ? t.home.demoWhaleOn : t.home.demoWhaleOff);
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
      {/* Indeterminate Top API Loading Bar */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-brand-border/20 overflow-hidden pointer-events-none">
          <div className="h-full w-2/3 bg-gradient-to-r from-chain-ton via-chain-evm to-chain-solana animate-top-progress" />
        </div>
      )}

      {/* Floating On-Chain Balance Syncing Pill */}
      {isSyncing && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 animate-toast-enter pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-md border border-brand-border/80 dark:border-brand-border-dark/80 text-brand-primary dark:text-brand-primary-dark text-xs font-mono font-medium shadow-md flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-chain-ton shrink-0" />
            <span>{t.common.syncing}</span>
          </div>
        </div>
      )}

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-brand-accent-light dark:bg-brand-border-dark border-b border-brand-border dark:border-brand-border-dark">
          <div className="max-w-md mx-auto px-4 py-2 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-brand-primary dark:text-brand-primary-dark font-medium">
              <Sparkles className="w-3.5 h-3.5 text-chain-evm" />
              {t.home.demoNotice}
            </span>
            <button
              type="button"
              onClick={handleToggleDemo}
              className="text-xs font-semibold underline hover:opacity-80 active:scale-95 transition-transform"
              aria-label={t.home.demoExit}
            >
              {t.home.demoExit}
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-brand-divider dark:border-brand-divider-dark bg-canvas/80 dark:bg-canvas-dark/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 pt-3.5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-brand-accent-light dark:bg-surface-container-high-dark flex items-center justify-center border border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold text-xs font-mono shadow-xs shrink-0 overflow-hidden">
              {tgUser.photoUrl ? (
                <img
                  src={tgUser.photoUrl}
                  alt={tgUser.firstName || 'User'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : tgUser.firstName ? (
                tgUser.firstName.charAt(0).toUpperCase()
              ) : (
                '🌿'
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight text-brand-primary dark:text-brand-primary-dark truncate">
                {t.header.greeting(tgUser.firstName || '')}
              </h1>
              <p className="text-[11px] font-mono text-brand-subdued dark:text-brand-subdued-dark flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-semantic-gain animate-pulse-glow" />
                {t.header.watchOnlyStatus}
              </p>
            </div>
          </div>

          {/* Header Controls: Language Toggle, Currency, Theme & Sync */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Switcher: US <-> ID with Transition */}
            <button
              type="button"
              onClick={() => {
                const nextLang: Language = lang === 'id' ? 'en' : 'id';
                setLang(nextLang);
                showToast(translations[nextLang].common.langSwitched);
                haptics.selection();
              }}
              className="min-h-[36px] px-2.5 text-xs font-mono font-semibold rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark hover:bg-surface-dim active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label={t.header.switchLang}
              title={t.header.switchLang}
            >
              <span key={lang} className="animate-japandi-fade">
                {lang === 'id' ? '🇮🇩 ID' : '🇺🇸 US'}
              </span>
            </button>

            {/* Currency Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextCurrency = currency === 'USD' ? 'IDR' : 'USD';
                setCurrency(nextCurrency);
                showToast(lang === 'id' ? `Mata uang diubah ke ${nextCurrency}` : `Currency changed to ${nextCurrency}`);
                haptics.selection();
              }}
              className="min-h-[36px] px-2.5 text-xs font-mono font-medium rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark hover:bg-surface-dim active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label={`Currency ${currency}`}
              title="Currency"
            >
              <span key={currency} className="animate-japandi-fade">
                {currency}
              </span>
            </button>

            {/* Theme Toggle with Animated Icon Rotation */}
            <button
              type="button"
              onClick={toggleTheme}
              className="min-w-[36px] min-h-[36px] rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark active:scale-95 transition-transform duration-300 flex items-center justify-center shadow-xs"
              aria-label={t.header.toggleTheme}
              title={t.header.toggleTheme}
            >
              <div key={isDarkMode ? 'dark' : 'light'} className="animate-japandi-fade">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              </div>
            </button>

            {/* Tasks & Rewards (GigaPub) Button */}
            <button
              type="button"
              onClick={() => {
                haptics.impact('light');
                setIsRewardsModalOpen(true);
              }}
              className="relative min-w-[36px] min-h-[36px] rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-amber-500 dark:hover:text-amber-400 active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label={t.rewards.title}
              title={t.rewards.title}
            >
              <Gift className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </button>

            {/* Sync Refresh Button */}
            <button
              type="button"
              onClick={() => {
                haptics.impact('light');
                loadData(true);
              }}
              className="min-w-[36px] min-h-[36px] rounded-full border border-brand-border dark:border-brand-border-dark bg-surface dark:bg-surface-dark text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark active:scale-95 transition-all flex items-center justify-center shadow-xs"
              aria-label={t.header.syncButton}
              title={t.header.syncButton}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin text-brand-primary dark:text-brand-primary-dark' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className="flex-1 px-4 py-4 max-w-md mx-auto w-full flex flex-col gap-4"
        style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Tab Content: Home */}
        {activeTab === 'home' &&
          (initialLoading ? (
            <HomeSkeleton />
          ) : (
            <div className="flex flex-col gap-4 animate-japandi-fade-up">
              {/* Hero Portfolio Card */}
              <div className="bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-bento p-5 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-brand-subdued dark:text-brand-subdued-dark font-medium">
                  <span>{t.home.netWorth}</span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-semantic-gain" />
                    {t.common.verifiedSafe}
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
                    {formatSignedPercent(change24hPercent)} {t.common.today}
                  </span>
                  {currency === 'USD' && (
                    <span className="text-xs font-mono text-brand-subdued dark:text-brand-subdued-dark">
                      (~{formatFiat(totalValueUsd, 'IDR')})
                    </span>
                  )}
                </div>

                {/* Sparkline Interactive Scrubber with Entrance Animation & Loading State */}
                {isDemoMode && (
                  <SparklineChart
                    data={[12100, 12250, 12180, 12300, 12280, 12390, 12450.85]}
                    changePercent={change24hPercent}
                    currency={currency}
                    isLoading={loading}
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
                  {t.home.addNewAddress}
                </button>

                {!isDemoMode && wallets.length === 0 && (
                  <button
                    onClick={handleToggleDemo}
                    className="min-h-[44px] px-3.5 bg-surface dark:bg-surface-dark border border-brand-border dark:border-brand-border-dark rounded-button text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-surface-dim transition-colors"
                    title={t.common.demo}
                  >
                    <Eye className="w-4 h-4 text-brand-subdued" />
                    {t.common.demo}
                  </button>
                )}
              </div>

              {/* Ecosystem Allocation Donut Chart */}
              <AllocationDonut
                summary={currentSummary}
                currency={currency}
                isDark={isDarkMode}
                lang={lang}
              />

              {/* Jaringan Terhubung with Official Crypto Logos & Interactive Filtering */}
              <div className="flex flex-col gap-2 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-subdued dark:text-brand-subdued-dark">
                    {t.home.connectedNetworks}
                  </span>
                  {networkFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setNetworkFilter('all');
                        haptics.selection();
                      }}
                      className="text-[11px] font-mono text-brand-primary dark:text-brand-primary-dark underline hover:opacity-80"
                    >
                      {lang === 'id' ? 'Reset Filter' : 'Reset Filter'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px] overflow-x-auto pb-0.5">
                  {/* All Filter Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkFilter('all');
                      haptics.selection();
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0 ${
                      networkFilter === 'all'
                        ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary border-brand-primary'
                        : 'bg-surface dark:bg-surface-dark border-brand-border dark:border-brand-border-dark text-brand-subdued hover:text-brand-primary'
                    }`}
                  >
                    {t.home.filterAll}
                  </button>

                  {/* TON Chain Pill with Official Logo */}
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkFilter((prev) => (prev === 'ton' ? 'all' : 'ton'));
                      haptics.selection();
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0 ${
                      networkFilter === 'ton'
                        ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary border-brand-primary'
                        : 'bg-surface dark:bg-surface-dark border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark'
                    }`}
                  >
                    {getChainLogoUrl('ton') && (
                      <img
                        src={getChainLogoUrl('ton')}
                        alt="TON"
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span>TON</span>
                  </button>

                  {/* EVM (5) Chain Pill with Ethereum Logo */}
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkFilter((prev) => (prev === 'evm' ? 'all' : 'evm'));
                      haptics.selection();
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0 ${
                      networkFilter === 'evm'
                        ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary border-brand-primary'
                        : 'bg-surface dark:bg-surface-dark border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark'
                    }`}
                  >
                    {getChainLogoUrl('ethereum') && (
                      <img
                        src={getChainLogoUrl('ethereum')}
                        alt="EVM"
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span>EVM (5)</span>
                  </button>

                  {/* Solana Chain Pill with Solana Logo */}
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkFilter((prev) => (prev === 'solana' ? 'all' : 'solana'));
                      haptics.selection();
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0 ${
                      networkFilter === 'solana'
                        ? 'bg-brand-primary dark:bg-brand-primary-dark text-white dark:text-brand-primary border-brand-primary'
                        : 'bg-surface dark:bg-surface-dark border-brand-border dark:border-brand-border-dark text-brand-primary dark:text-brand-primary-dark'
                    }`}
                  >
                    {getChainLogoUrl('solana') && (
                      <img
                        src={getChainLogoUrl('solana')}
                        alt="SOL"
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span>SOL</span>
                  </button>
                </div>
              </div>

              {/* Chain Abstraction Accordion with Active Network Filter */}
              <ChainAccordion
                assets={currentAssets}
                currency={currency}
                hasWallets={wallets.length > 0}
                networkFilter={networkFilter}
                lang={lang}
              />

              {/* Recent Mutations Activity (with View All CTA & In/Out indicators) */}
              <RecentTransactions
                transactions={currentTransactions}
                currency={currency}
                lang={lang}
                onOpenAll={() => setIsAllTxModalOpen(true)}
              />
            </div>
          ))}

        {/* Tab Content: Perf (Performance) */}
        {activeTab === 'perf' && (
          <div className="animate-japandi-fade-up">
            <PerfTab totalValueUsd={totalValueUsd} currency={currency} lang={lang} />
          </div>
        )}

        {/* Tab Content: Settings */}
        {activeTab === 'settings' && (
          <div className="animate-japandi-fade-up">
            <SettingsTab
              userProfile={
                userProfile
                  ? {
                      ...userProfile,
                      photoUrl: tgUser.photoUrl,
                      firstName: tgUser.firstName || userProfile.firstName,
                      lastName: tgUser.lastName || userProfile.lastName,
                      username: tgUser.username || userProfile.username,
                    }
                  : {
                      id: tgUser.id || 0,
                      firstName: tgUser.firstName,
                      lastName: tgUser.lastName,
                      username: tgUser.username,
                      photoUrl: tgUser.photoUrl,
                      currencyPref: currency,
                      minAlertUsd: 1.0,
                      hideSpam: true,
                      isBanned: false,
                      createdAt: new Date().toISOString(),
                    }
              }
              wallets={wallets}
              currency={currency}
              onCurrencyChange={(c) => {
                setCurrency(c);
                if (userProfile) {
                  setUserProfile({ ...userProfile, currencyPref: c });
                }
              }}
              onRefreshWallets={loadData}
              onOpenAddWallet={() => setIsAddModalOpen(true)}
              onOpenAdmin={() => setIsAdminModalOpen(true)}
              onOpenRewards={() => setIsRewardsModalOpen(true)}
              rewardsSummary={rewardsSummary}
              lang={lang}
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
        <div className="h-14 px-3 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-xl border border-brand-border/80 dark:border-brand-border-dark/80 rounded-full shadow-lg flex items-center justify-around transition-all">
          <button
            type="button"
            onClick={() => handleTabChange('home')}
            className={`min-h-[44px] min-w-[44px] px-4 flex items-center gap-2 rounded-full text-xs font-medium active:scale-90 transition-all ${
              activeTab === 'home'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold shadow-2xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label="Buka tab Beranda"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>{t.nav.home}</span>
            {activeTab === 'home' && (
              <span className="w-1 h-1 rounded-full bg-brand-primary dark:bg-brand-primary-dark shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('perf')}
            className={`min-h-[44px] min-w-[44px] px-4 flex items-center gap-2 rounded-full text-xs font-medium active:scale-90 transition-all ${
              activeTab === 'perf'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold shadow-2xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label="Buka tab Performa"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>{t.nav.perf}</span>
            {activeTab === 'perf' && (
              <span className="w-1 h-1 rounded-full bg-brand-primary dark:bg-brand-primary-dark shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            className={`min-h-[44px] min-w-[44px] px-4 flex items-center gap-2 rounded-full text-xs font-medium active:scale-90 transition-all ${
              activeTab === 'settings'
                ? 'bg-brand-accent-light dark:bg-brand-border-dark text-brand-primary dark:text-brand-primary-dark font-semibold shadow-2xs'
                : 'text-brand-subdued hover:text-brand-primary dark:hover:text-brand-primary-dark'
            }`}
            aria-label="Buka tab Pengaturan"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>{t.nav.settings}</span>
            {activeTab === 'settings' && (
              <span className="w-1 h-1 rounded-full bg-brand-primary dark:bg-brand-primary-dark shrink-0" />
            )}
          </button>
        </div>
      </nav>

      {/* Smart Textarea Add Wallet Modal */}
      <AddWalletModal
        isOpen={isAddModalOpen}
        lang={lang}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsDemoMode(false);
          loadData();
        }}
      />

      {/* All Transactions Mutation Modal */}
      <AllTransactionsModal
        isOpen={isAllTxModalOpen}
        onClose={() => setIsAllTxModalOpen(false)}
        transactions={currentTransactions}
        currency={currency}
        lang={lang}
      />

      {/* Admin Control Center Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* GigaPub Tasks & Rewards Modal */}
      <RewardsModal
        isOpen={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
        summary={rewardsSummary}
        onRewardClaimed={(newPoints, newSlots) => {
          setRewardsSummary((prev) => ({
            ...prev,
            rewardPoints: newPoints,
            bonusWalletSlots: newSlots,
            maxWallets: 10 + newSlots,
          }));
        }}
        onTriggerFastSync={async () => {
          await loadData(true);
        }}
        lang={lang}
      />
    </div>
  );
}
