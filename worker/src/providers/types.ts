import { Blockchain } from '@asset-tracker/shared';

export interface RawTokenBalance {
  symbol: string;
  name: string;
  contractAddress: string | null; // null for native coins (ETH, BNB, SOL, TON)
  blockchain: Blockchain;
  balance: number;
  balanceFormatted: string;
  decimals: number;
  priceUsd: number;
  valueUsd: number;
  logoUrl?: string;
  isSpam: boolean;
}

export interface BalanceProvider {
  getBalances(address: string, chain: Blockchain): Promise<RawTokenBalance[]>;
}

