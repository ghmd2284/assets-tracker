import { Blockchain, EVM_CHAINS } from '@asset-tracker/shared';
import { Env } from '../types';
import { RawTokenBalance } from './types';
import { AlchemyProvider } from './alchemy';
import { HeliusProvider } from './helius';
import { TonApiProvider } from './tonapi';

export * from './types';
export * from './prices';
export * from './alchemy';
export * from './helius';
export * from './tonapi';

/**
 * Dispatches balance lookup to the appropriate multi-chain provider.
 */
export async function fetchChainBalances(
  address: string,
  chain: Blockchain,
  env: Env
): Promise<RawTokenBalance[]> {
  if (EVM_CHAINS.includes(chain)) {
    const alchemy = new AlchemyProvider(env.ALCHEMY_API_KEY);
    return alchemy.getBalances(address, chain);
  }

  if (chain === 'solana') {
    const helius = new HeliusProvider(env.HELIUS_API_KEY);
    return helius.getBalances(address);
  }

  if (chain === 'ton') {
    const tonApi = new TonApiProvider(env.TONAPI_KEY);
    return tonApi.getBalances(address);
  }

  return [];
}
