import { Blockchain } from '@asset-tracker/shared';
import { RawTokenBalance, BalanceProvider } from './types';
import { resolveTokenPrices } from './prices';

export class TonApiProvider implements BalanceProvider {
  constructor(private apiKey?: string) {}

  async getBalances(address: string, chain: Blockchain = 'ton'): Promise<RawTokenBalance[]> {
    const results: RawTokenBalance[] = [];
    let nativeBalanceTon: number | null = null;

    // 1. Try TonAPI.io (if apiKey configured)
    if (this.apiKey) {
      try {
        const accountRes = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(address)}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });

        if (accountRes.ok) {
          const accountData = await accountRes.json<any>();
          if (accountData?.balance !== undefined) {
            nativeBalanceTon = Number(accountData.balance) / 1e9;
          }
        }
      } catch (err) {
        console.warn('[TonAPI Provider] tonapi.io request failed, falling back to toncenter:', err);
      }
    }

    // 2. Fallback to official public Toncenter RPC if balance not yet resolved
    if (nativeBalanceTon === null) {
      try {
        const tc2Res = await fetch(
          `https://toncenter.com/api/v2/getAddressInformation?address=${encodeURIComponent(address)}`
        );
        if (tc2Res.ok) {
          const tc2Data = await tc2Res.json<any>();
          if (tc2Data?.ok && tc2Data?.result?.balance !== undefined) {
            nativeBalanceTon = Number(tc2Data.result.balance) / 1e9;
          }
        }
      } catch (tcErr) {
        console.warn('[TonAPI Provider] toncenter v2 error, trying v3:', tcErr);
      }

      if (nativeBalanceTon === null) {
        try {
          const tc3Res = await fetch(
            `https://toncenter.com/api/v3/account?address=${encodeURIComponent(address)}`
          );
          if (tc3Res.ok) {
            const tc3Data = await tc3Res.json<any>();
            if (tc3Data?.balance !== undefined) {
              nativeBalanceTon = Number(tc3Data.balance) / 1e9;
            }
          }
        } catch (tc3Err) {
          console.warn('[TonAPI Provider] toncenter v3 error:', tc3Err);
        }
      }
    }

    // If native TON balance is found (even if 0, record it)
    if (nativeBalanceTon !== null && nativeBalanceTon >= 0) {
      results.push({
        symbol: 'TON',
        name: 'Toncoin',
        contractAddress: null,
        blockchain: 'ton',
        balance: nativeBalanceTon,
        balanceFormatted: nativeBalanceTon.toFixed(4),
        decimals: 9,
        priceUsd: 1.15,
        valueUsd: Number((nativeBalanceTon * 1.15).toFixed(2)),
        logoUrl: 'https://cryptologos.cc/logos/toncoin-ton-logo.png',
        isSpam: false,
      });
    }

    // 3. Fetch Jettons (Tokens on TON)
    if (this.apiKey) {
      try {
        const jettonsRes = await fetch(
          `https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/jettons`,
          { headers: { Authorization: `Bearer ${this.apiKey}` } }
        );

        if (jettonsRes.ok) {
          const jettonsData = await jettonsRes.json<any>();
          const jettons = jettonsData?.balances || [];

          for (const item of jettons) {
            const rawBal = Number(item.balance);
            const meta = item.jetton;
            const decimals = meta?.decimals ? parseInt(meta.decimals, 10) : 9;
            const balance = rawBal / 10 ** decimals;

            if (balance > 0) {
              results.push({
                symbol: meta?.symbol || 'JETTON',
                name: meta?.name || 'Jetton Token',
                contractAddress: meta?.address || null,
                blockchain: 'ton',
                balance,
                balanceFormatted: balance.toFixed(4),
                decimals,
                priceUsd: 0,
                valueUsd: 0,
                logoUrl: meta?.image || undefined,
                isSpam: false,
              });
            }
          }
        }
      } catch (jErr) {
        console.warn('[TonAPI Provider] Jettons fetch error:', jErr);
      }
    }

    // 4. Resolve live token prices
    try {
      const priceMap = await resolveTokenPrices(results);
      for (const item of results) {
        const key = `${item.blockchain}:${item.contractAddress || item.symbol}`;
        const priceInfo = priceMap.get(key);
        if (priceInfo && priceInfo.priceUsd > 0) {
          item.priceUsd = priceInfo.priceUsd;
          item.valueUsd = Number((item.balance * priceInfo.priceUsd).toFixed(2));
          item.isSpam = priceInfo.isSpam;
        }
      }
    } catch (pErr) {
      console.warn('[TonAPI Provider] Price resolution error:', pErr);
    }

    return results;
  }

  private getMockBalances(address: string): RawTokenBalance[] {
    return [
      {
        symbol: 'TON',
        name: 'Toncoin',
        contractAddress: null,
        blockchain: 'ton',
        balance: 240.0,
        balanceFormatted: '240.0000',
        decimals: 9,
        priceUsd: 5.1,
        valueUsd: 1224.0,
        isSpam: false,
      },
    ];
  }
}

