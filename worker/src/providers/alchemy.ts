import { Blockchain, getTokenLogoUrl } from '@asset-tracker/shared';
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

const PUBLIC_EVM_RPCS: Record<string, string[]> = {
  ethereum: ['https://1rpc.io/eth', 'https://eth.llamarpc.com'],
  bsc: ['https://1rpc.io/bnb', 'https://bsc-dataseed.binance.org'],
  base: ['https://1rpc.io/base', 'https://mainnet.base.org'],
  arbitrum: ['https://1rpc.io/arb', 'https://arb1.arbitrum.io/rpc'],
  polygon: ['https://1rpc.io/matic', 'https://polygon-bor-rpc.publicnode.com'],
};

function getRpcUrls(chain: Blockchain, apiKey?: string): string[] {
  if (apiKey) {
    switch (chain) {
      case 'ethereum':
        return [`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`];
      case 'bsc':
        return [`https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`];
      case 'base':
        return [`https://base-mainnet.g.alchemy.com/v2/${apiKey}`];
      case 'arbitrum':
        return [`https://arb-mainnet.g.alchemy.com/v2/${apiKey}`];
      case 'polygon':
        return [`https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`];
      default:
        throw new Error(`Unsupported EVM chain: ${chain}`);
    }
  }

  const list = PUBLIC_EVM_RPCS[chain];
  if (!list || list.length === 0) {
    throw new Error(`No public RPC configured for EVM chain: ${chain}`);
  }
  return list;
}

export class AlchemyProvider implements BalanceProvider {
  constructor(private apiKey?: string) {}

  async getBalances(address: string, chain: Blockchain): Promise<RawTokenBalance[]> {
    const rpcUrls = getRpcUrls(chain, this.apiKey);
    const results: RawTokenBalance[] = [];
    const nativeInfo = EVM_NATIVE_MAP[chain] || { symbol: 'ETH', name: 'Ethereum', decimals: 18 };

    try {
      // 1. Fetch Native Coin Balance via standard JSON-RPC with fallback
      let rawResult: any = null;
      for (const rpcUrl of rpcUrls) {
        try {
          const nativeRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(4000),
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
              rawResult = nativeData.result;
              break;
            }
          }
        } catch {
          // try next rpc
        }
      }

      if (rawResult === null && !this.apiKey) {
        throw new Error(`AlchemyProvider: All RPC endpoints failed for ${chain} on ${address}`);
      }

      if (rawResult) {
        const rawWei = BigInt(rawResult);
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
            logoUrl: getTokenLogoUrl(nativeInfo.symbol),
            isSpam: false,
          });
        }
      }

      // 2. Fetch ERC-20 Token Balances (only supported if Alchemy API key is provided)
      if (this.apiKey) {
        const rpcUrl = rpcUrls[0];
        const tokensRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(4000),
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
      console.error(`[Alchemy Provider] Balance lookup error on ${chain}:`, err);
      return results;
    }
  }
}

