import { Blockchain } from '@asset-tracker/shared';
import { RawTokenBalance, BalanceProvider } from './types';
import { resolveTokenPrices } from './prices';

const SOLANA_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export class HeliusProvider implements BalanceProvider {
  constructor(private apiKey?: string) {}

  async getBalances(address: string, chain: Blockchain = 'solana'): Promise<RawTokenBalance[]> {
    if (!this.apiKey) {
      console.warn('[Helius Provider] No HELIUS_API_KEY set, returning demo stub.');
      return this.getMockBalances(address);
    }

    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;
    const results: RawTokenBalance[] = [];

    try {
      // 1. Fetch Native SOL Balance
      const solRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      if (solRes.ok) {
        const solData = await solRes.json<any>();
        if (solData?.result?.value !== undefined) {
          const lamports = Number(solData.result.value);
          const balance = lamports / 1e9;
          if (balance > 0) {
            results.push({
              symbol: 'SOL',
              name: 'Solana',
              contractAddress: null,
              blockchain: 'solana',
              balance,
              balanceFormatted: balance.toFixed(4),
              decimals: 9,
              priceUsd: 185.0,
              valueUsd: Number((balance * 185.0).toFixed(2)),
              isSpam: false,
            });
          }
        }
      }

      // 2. Fetch SPL Token Accounts
      const tokensRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { programId: SOLANA_TOKEN_PROGRAM },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      if (tokensRes.ok) {
        const tokensData = await tokensRes.json<any>();
        const accounts = tokensData?.result?.value || [];

        for (const acc of accounts) {
          const info = acc?.account?.data?.parsed?.info;
          if (!info) continue;

          const amount = info.tokenAmount?.uiAmount;
          const mint = info.mint;
          const decimals = info.tokenAmount?.decimals || 0;

          if (amount && amount > 0) {
            results.push({
              symbol: 'SPL', // Default placeholder; resolved if known mint (e.g. USDC/USDT)
              name: 'Solana Token',
              contractAddress: mint,
              blockchain: 'solana',
              balance: amount,
              balanceFormatted: amount.toFixed(4),
              decimals,
              priceUsd: 0,
              valueUsd: 0,
              isSpam: false,
            });
          }
        }
      }

      // 3. Resolve live token prices
      const priceMap = await resolveTokenPrices(results);
      for (const item of results) {
        const key = `${item.blockchain}:${item.contractAddress || item.symbol}`;
        const priceInfo = priceMap.get(key);
        if (priceInfo) {
          item.priceUsd = priceInfo.priceUsd;
          item.valueUsd = Number((item.balance * priceInfo.priceUsd).toFixed(2));
          item.isSpam = priceInfo.isSpam;
        }
      }

      return results;
    } catch (err) {
      console.error('[Helius Provider] Solana balance lookup error:', err);
      return results;
    }
  }

  private getMockBalances(address: string): RawTokenBalance[] {
    return [
      {
        symbol: 'SOL',
        name: 'Solana',
        contractAddress: null,
        blockchain: 'solana',
        balance: 14.5,
        balanceFormatted: '14.5000',
        decimals: 9,
        priceUsd: 185.0,
        valueUsd: 2682.5,
        isSpam: false,
      },
    ];
  }
}
