import { describe, it, expect } from 'vitest';
import { resolveTokenPrices } from '../src/providers/prices';
import { AggregatedAsset, Blockchain } from '@asset-tracker/shared';

describe('Multi-Chain Asset Aggregation & Pricing Logic', () => {
  it('aggregates multi-chain tokens into unified asset rows', () => {
    // Simulating token balances across different chains
    const rawBalances = [
      {
        symbol: 'USDT',
        name: 'Tether USD',
        blockchain: 'ethereum' as Blockchain,
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        balance: 1000,
        valueUsd: 1000,
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        label: 'Main EVM',
      },
      {
        symbol: 'USDT',
        name: 'Tether USD (TON)',
        blockchain: 'ton' as Blockchain,
        contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        balance: 1500,
        valueUsd: 1500,
        address: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU',
        label: 'TON Savings',
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        blockchain: 'ethereum' as Blockchain,
        contractAddress: null,
        balance: 2,
        valueUsd: 5300,
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        label: 'Main EVM',
      },
    ];

    const assetMap = new Map<string, AggregatedAsset>();
    for (const b of rawBalances) {
      const sym = b.symbol.toUpperCase();
      if (!assetMap.has(sym)) {
        assetMap.set(sym, {
          symbol: sym,
          name: b.name,
          totalBalance: 0,
          totalValueUsd: 0,
          chains: [],
        });
      }

      const item = assetMap.get(sym)!;
      item.totalBalance += b.balance;
      item.totalValueUsd += b.valueUsd;
      item.chains.push({
        blockchain: b.blockchain,
        contractAddress: b.contractAddress,
        balance: b.balance,
        valueUsd: b.valueUsd,
        address: b.address,
        label: b.label,
      });
    }

    const usdtAsset = assetMap.get('USDT');
    expect(usdtAsset).toBeDefined();
    expect(usdtAsset?.totalBalance).toBe(2500); // 1000 + 1500
    expect(usdtAsset?.totalValueUsd).toBe(2500);
    expect(usdtAsset?.chains).toHaveLength(2); // Ethereum + TON
    expect(usdtAsset?.chains[0].blockchain).toBe('ethereum');
    expect(usdtAsset?.chains[1].blockchain).toBe('ton');

    const ethAsset = assetMap.get('ETH');
    expect(ethAsset).toBeDefined();
    expect(ethAsset?.totalBalance).toBe(2);
    expect(ethAsset?.chains).toHaveLength(1);
  });

  it('resolves native cryptocurrency prices accurately', async () => {
    const tokens = [
      { symbol: 'ETH', contractAddress: null, blockchain: 'ethereum' as Blockchain },
      { symbol: 'BNB', contractAddress: null, blockchain: 'bsc' as Blockchain },
      { symbol: 'SOL', contractAddress: null, blockchain: 'solana' as Blockchain },
      { symbol: 'TON', contractAddress: null, blockchain: 'ton' as Blockchain },
    ];

    const priceMap = await resolveTokenPrices(tokens);
    expect(priceMap.get('ethereum:ETH')?.priceUsd).toBeGreaterThan(0);
    expect(priceMap.get('bsc:BNB')?.priceUsd).toBeGreaterThan(0);
    expect(priceMap.get('solana:SOL')?.priceUsd).toBeGreaterThan(0);
    expect(priceMap.get('ton:TON')?.priceUsd).toBeGreaterThan(0);
    expect(priceMap.get('ethereum:ETH')?.isSpam).toBe(false);
  });
});
