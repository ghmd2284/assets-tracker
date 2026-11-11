export const DEFAULT_TOKEN_LOGOS: Record<string, string> = {
  ETH: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/info/logo.png',
  BNB: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/binance/info/logo.png',
  SOL: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png',
  POL: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/polygon/info/logo.png',
  MATIC: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/polygon/info/logo.png',
  TON: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ton/info/logo.png',
  BTC: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/bitcoin/info/logo.png',
  USDT: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  USDC: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};

export const CHAIN_LOGOS: Record<string, string> = {
  ethereum: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/info/logo.png',
  bsc: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/binance/info/logo.png',
  base: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/base/info/logo.png',
  arbitrum: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/arbitrum/info/logo.png',
  polygon: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/polygon/info/logo.png',
  solana: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png',
  ton: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ton/info/logo.png',
};

export function getTokenLogoUrl(symbol: string, customLogoUrl?: string | null): string | undefined {
  if (customLogoUrl && customLogoUrl.trim().length > 0) {
    // If custom logo URL is from raw.githubusercontent.com, convert to cdn.jsdelivr.net
    if (customLogoUrl.includes('raw.githubusercontent.com/trustwallet/assets/master/')) {
      return customLogoUrl.replace(
        'raw.githubusercontent.com/trustwallet/assets/master/',
        'cdn.jsdelivr.net/gh/trustwallet/assets@master/'
      );
    }
    return customLogoUrl;
  }
  return DEFAULT_TOKEN_LOGOS[symbol.toUpperCase()];
}

export function getChainLogoUrl(chain: string): string | undefined {
  return CHAIN_LOGOS[chain.toLowerCase()];
}
