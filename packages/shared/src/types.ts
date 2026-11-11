export type Ecosystem = 'evm' | 'ton' | 'solana';

export type Blockchain =
  | 'ethereum'
  | 'bsc'
  | 'base'
  | 'arbitrum'
  | 'polygon'
  | 'ton'
  | 'solana';

export const EVM_CHAINS: Blockchain[] = [
  'ethereum',
  'bsc',
  'base',
  'arbitrum',
  'polygon',
];

export type CurrencyPref = 'USD' | 'IDR';

export interface UserProfile {
  id: number; // Telegram User ID
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  currencyPref: CurrencyPref;
  minAlertUsd: number;
  hideSpam: boolean;
  isBanned: boolean;
  createdAt: string;
}

export interface WatchedWallet {
  id: string; // uuid
  address: string;
  blockchain: Blockchain;
  label: string;
  isDemo: boolean;
  createdAt: string;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  contractAddress: string | null; // null for native coins (ETH, BNB, SOL, TON)
  blockchain: Blockchain;
  balance: number;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
  logoUrl?: string;
  isSpam: boolean;
  updatedAt?: string;
}

export interface AggregatedAssetChain {
  blockchain: Blockchain;
  contractAddress: string | null;
  balance: number;
  valueUsd: number;
  address: string;
  label: string;
}

export interface AggregatedAsset {
  symbol: string;
  name: string;
  logoUrl?: string;
  totalBalance: number;
  totalValueUsd: number;
  chains: AggregatedAssetChain[];
}

export interface MutationTransaction {
  id: string;
  txHash: string;
  blockchain: Blockchain;
  direction: 'in' | 'out';
  tokenSymbol: string;
  amount: number;
  amountUsd?: number;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  totalValueIdr: number;
  change24hUsd: number;
  change24hPercent: number;
  allocation: {
    tonPercent: number;
    evmPercent: number;
    solanaPercent: number;
  };
}

export interface PortfolioSnapshot {
  recordedAt: string;
  totalValueUsd: number;
}

export interface PerformanceResponse {
  snapshots: PortfolioSnapshot[];
  currentValueUsd: number;
  changeUsd: number;
  changePercent: number;
  range: string;
}

