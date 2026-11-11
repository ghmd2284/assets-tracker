import { Blockchain } from '@asset-tracker/shared';

interface CachedPrice {
  priceUsd: number;
  isSpam: boolean;
  timestamp: number;
}

const priceCache = new Map<string, CachedPrice>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

let idrRateCache = {
  rate: 16200,
  timestamp: 0,
};

// Fallback baseline prices for native cryptocurrencies
export const NATIVE_FALLBACK_PRICES: Record<string, number> = {
  ETH: 2650.0,
  BNB: 580.0,
  SOL: 185.0,
  TON: 5.1,
  POL: 0.38,
};

/**
 * Retrieves the current USD to IDR conversion rate.
 */
export async function getUsdToIdrRate(): Promise<number> {
  const now = Date.now();
  if (now - idrRateCache.timestamp < 3600 * 1000) {
    return idrRateCache.rate;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json<any>();
      if (data?.rates?.IDR) {
        idrRateCache = {
          rate: Math.round(data.rates.IDR),
          timestamp: now,
        };
        return idrRateCache.rate;
      }
    }
  } catch (err) {
    console.warn('[Price Service] Failed to fetch live USD/IDR rate, using fallback:', err);
  }

  return idrRateCache.rate;
}

const NATIVE_COINGECKO_MAP: Record<string, string> = {
  TON: 'the-open-network',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  POL: 'matic-network',
};

/**
 * Resolves live prices and spam status using DexScreener & DeFiLlama.
 */
export async function resolveTokenPrices(
  tokens: { symbol: string; contractAddress: string | null; blockchain: Blockchain }[]
): Promise<Map<string, { priceUsd: number; isSpam: boolean }>> {
  const results = new Map<string, { priceUsd: number; isSpam: boolean }>();
  const now = Date.now();
  const toFetchContracts: string[] = [];
  const nativeToFetch = new Set<string>();

  for (const token of tokens) {
    const key = `${token.blockchain}:${token.contractAddress || token.symbol}`;
    const cached = priceCache.get(key);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      results.set(key, { priceUsd: cached.priceUsd, isSpam: cached.isSpam });
      continue;
    }

    // Native token without contract
    if (!token.contractAddress) {
      nativeToFetch.add(token.symbol.toUpperCase());
      continue;
    }

    toFetchContracts.push(token.contractAddress);
  }

  // Fetch live native token prices via DeFiLlama
  if (nativeToFetch.size > 0) {
    const llamaIds = Array.from(nativeToFetch)
      .map((sym) => NATIVE_COINGECKO_MAP[sym])
      .filter(Boolean)
      .map((id) => `coingecko:${id}`)
      .join(',');

    if (llamaIds) {
      try {
        const llamaRes = await fetch(`https://coins.llama.fi/prices/current/${llamaIds}`);
        if (llamaRes.ok) {
          const llamaData = await llamaRes.json<any>();
          for (const sym of nativeToFetch) {
            const cgId = NATIVE_COINGECKO_MAP[sym];
            const livePrice = llamaData?.coins?.[`coingecko:${cgId}`]?.price;
            if (typeof livePrice === 'number' && livePrice > 0) {
              for (const token of tokens) {
                if (!token.contractAddress && token.symbol.toUpperCase() === sym) {
                  const key = `${token.blockchain}:${token.symbol}`;
                  results.set(key, { priceUsd: livePrice, isSpam: false });
                  priceCache.set(key, { priceUsd: livePrice, isSpam: false, timestamp: now });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Price Service] DeFiLlama native fetch error, using fallbacks:', err);
      }
    }

    // Apply baseline fallbacks for any native tokens not retrieved
    for (const sym of nativeToFetch) {
      for (const token of tokens) {
        if (!token.contractAddress && token.symbol.toUpperCase() === sym) {
          const key = `${token.blockchain}:${token.symbol}`;
          if (!results.has(key)) {
            const fallbackPrice = NATIVE_FALLBACK_PRICES[sym] || 0;
            results.set(key, { priceUsd: fallbackPrice, isSpam: false });
            priceCache.set(key, { priceUsd: fallbackPrice, isSpam: false, timestamp: now });
          }
        }
      }
    }
  }

  if (toFetchContracts.length === 0) {
    return results;
  }

  // Fetch up to 30 contract addresses in batches from DexScreener
  const chunks: string[][] = [];
  for (let i = 0; i < toFetchContracts.length; i += 30) {
    chunks.push(toFetchContracts.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json<any>();
      const pairs: any[] = data.pairs || [];

      // Map pair with highest liquidity for each token
      for (const pair of pairs) {
        const baseAddr = pair.baseToken?.address?.toLowerCase();
        const priceUsd = parseFloat(pair.priceUsd) || 0;
        const liquidityUsd = parseFloat(pair.liquidity?.usd) || 0;
        const isSpam = liquidityUsd < 10000; // PRD: liquidity < $10k flagged as spam

        // Match against tokens
        for (const token of tokens) {
          if (token.contractAddress && token.contractAddress.toLowerCase() === baseAddr) {
            const key = `${token.blockchain}:${token.contractAddress}`;
            if (!results.has(key) || (pair.liquidity?.usd && liquidityUsd > 10000)) {
              results.set(key, { priceUsd, isSpam });
              priceCache.set(key, { priceUsd, isSpam, timestamp: now });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Price Service] DexScreener batch fetch error:', err);
    }
  }

  // Ensure all tokens have at least a zero entry
  for (const token of tokens) {
    const key = `${token.blockchain}:${token.contractAddress || token.symbol}`;
    if (!results.has(key)) {
      results.set(key, { priceUsd: 0, isSpam: false });
    }
  }

  return results;
}

/**
 * Resolves a single token price and spam status using DexScreener.
 */
export async function fetchTokenPrice(
  symbol: string,
  contractAddress: string | null,
  blockchain: Blockchain
): Promise<{ priceUsd: number; isSpam: boolean }> {
  const map = await resolveTokenPrices([{ symbol, contractAddress, blockchain }]);
  const key = `${blockchain}:${contractAddress || symbol}`;
  return map.get(key) || { priceUsd: 0, isSpam: false };
}

