import { Blockchain, getTokenLogoUrl } from '@asset-tracker/shared';
import { RawTokenBalance, BalanceProvider } from './types';
import { resolveTokenPrices } from './prices';

const SOLANA_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const PUBLIC_SOLANA_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.rpc.extrnode.com',
];

export class HeliusProvider implements BalanceProvider {
  constructor(private apiKey?: string) {}

  async getBalances(address: string, chain: Blockchain = 'solana'): Promise<RawTokenBalance[]> {
    const rpcUrls = this.apiKey
      ? [`https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`]
      : PUBLIC_SOLANA_RPCS;
    const results: RawTokenBalance[] = [];

    try {
      // 1. Fetch Native SOL Balance
      let rawLamports: number | null = null;
      for (const rpcUrl of rpcUrls) {
        try {
          const solRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(4000),
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
              rawLamports = Number(solData.result.value);
              break;
            }
          }
        } catch {
          // try next rpc
        }
      }

      if (rawLamports !== null) {
        const balance = rawLamports / 1e9;
        if (balance > 0) {
          results.push({
            symbol: 'SOL',
            name: 'Solana',
            contractAddress: null,
            blockchain: 'solana',
            balance,
            balanceFormatted: balance.toFixed(4),
            decimals: 9,
            priceUsd: 0,
            valueUsd: 0,
            logoUrl: getTokenLogoUrl('SOL'),
            isSpam: false,
          });
        }
      }

      // 2. Fetch SPL Token Accounts
      for (const rpcUrl of rpcUrls) {
        try {
          const tokensRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(4000),
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
                  symbol: 'SPL',
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
            break;
          }
        } catch {
          // ignore token fetch error on public rpc
        }
      }

      // 3. Resolve live token prices
      if (results.length > 0) {
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
      }

      return results;
    } catch (err) {
      console.error('[Helius Provider] Solana balance lookup error:', err);
      return results;
    }
  }
}

