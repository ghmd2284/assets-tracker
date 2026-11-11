import { Blockchain } from '@asset-tracker/shared';
import { RawTokenBalance, BalanceProvider } from './types';
import { resolveTokenPrices } from './prices';

interface NativeConfig {
  symbol: string;
  name: string;
  decimals: number;
}

const EVM_NATIVE_MAP: Record<string, NativeConfig> = {
  ethereum: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  bsc: { symbol: 'BNB', name: 'BNB', decimals: 18 },
  base: { symbol: 'ETH', name: 'Ethereum (Base)', decimals: 18 },
  arbitrum: { symbol: 'ETH', name: 'Ethereum (Arbitrum)', decimals: 18 },
  polygon: { symbol: 'POL', name: 'Polygon', decimals: 18 },
};

function getRpcUrl(chain: Blockchain, apiKey: string): string {
  switch (chain) {
    case 'ethereum':
      return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
    case 'bsc':
      return `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`;
    case 'base':
      return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
    case 'arbitrum':
      return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
    case 'polygon':
      return `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`;
    default:
      throw new Error(`Unsupported EVM chain: ${chain}`);
  }
}

export class AlchemyProvider implements BalanceProvider {
  constructor(private apiKey?: string) {}

  async getBalances(address: string, chain: Blockchain): Promise<RawTokenBalance[]> {
    if (!this.apiKey) {
      console.warn(`[Alchemy Provider] No ALCHEMY_API_KEY set for ${chain}, returning demo stub.`);
      return this.getMockBalances(address, chain);
    }

    const rpcUrl = getRpcUrl(chain, this.apiKey);
    const results: RawTokenBalance[] = [];
    const nativeInfo = EVM_NATIVE_MAP[chain] || { symbol: 'ETH', name: 'Ethereum', decimals: 18 };

    try {
      // 1. Fetch Native Coin Balance
      const nativeRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
      });

      if (nativeRes.ok) {
        const nativeData = await nativeRes.json<any>();
        if (nativeData?.result) {
          const rawWei = BigInt(nativeData.result);
          const balance = Number(rawWei) / 10 ** nativeInfo.decimals;
          if (balance > 0) {
            results.push({
              symbol: nativeInfo.symbol,
              name: nativeInfo.name,
              contractAddress: null,
              blockchain: chain,
              balance,
              balanceFormatted: balance.toFixed(4),
              decimals: nativeInfo.decimals,
              priceUsd: 0,
              valueUsd: 0,
              isSpam: false,
            });
          }
        }
      }

      // 2. Fetch ERC-20 Token Balances
      const tokensRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20'],
        }),
      });

      if (tokensRes.ok) {
        const tokensData = await tokensRes.json<any>();
        const tokenBalances = tokensData?.result?.tokenBalances || [];

        // Filter tokens with non-zero balance (limit to top 15 to stay within free RPC limits)
        const activeTokens = tokenBalances
          .filter((t: any) => t.tokenBalance && t.tokenBalance !== '0x' && t.tokenBalance !== '0x0')
          .slice(0, 15);

        for (const token of activeTokens) {
          try {
            const metaRes = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'alchemy_getTokenMetadata',
                params: [token.contractAddress],
              }),
            });

            if (metaRes.ok) {
              const metaData = await metaRes.json<any>();
              const meta = metaData?.result;
              if (meta && meta.decimals) {
                const rawBal = BigInt(token.tokenBalance);
                const balance = Number(rawBal) / 10 ** meta.decimals;
                if (balance > 0) {
                  results.push({
                    symbol: meta.symbol || 'UNKNOWN',
                    name: meta.name || 'Token',
                    contractAddress: token.contractAddress.toLowerCase(),
                    blockchain: chain,
                    balance,
                    balanceFormatted: balance.toFixed(4),
                    decimals: meta.decimals,
                    priceUsd: 0,
                    valueUsd: 0,
                    logoUrl: meta.logo || undefined,
                    isSpam: false,
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`[Alchemy Provider] Failed metadata for ${token.contractAddress}:`, err);
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
      console.error(`[Alchemy Provider] Balance lookup error on ${chain}:`, err);
      return results;
    }
  }

  private getMockBalances(address: string, chain: Blockchain): RawTokenBalance[] {
    const native = EVM_NATIVE_MAP[chain] || { symbol: 'ETH', name: 'Ethereum', decimals: 18 };
    return [
      {
        symbol: native.symbol,
        name: native.name,
        contractAddress: null,
        blockchain: chain,
        balance: 1.25,
        balanceFormatted: '1.2500',
        decimals: 18,
        priceUsd: 2650.0,
        valueUsd: 3312.5,
        isSpam: false,
      },
    ];
  }
}

