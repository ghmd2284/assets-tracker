import { Blockchain } from '@asset-tracker/shared';
import { Env } from '../types';
import { getSupabaseClient } from './supabase';
import { fetchChainBalances } from '../providers';

/**
 * Syncs and updates the token_balances cache for a watched address.
 */
export async function syncWatchedAddressBalances(
  env: Env,
  watchedAddressId: string,
  address: string,
  blockchain: Blockchain
): Promise<void> {
  const supabase = getSupabaseClient(env);

  try {
    const balances = await fetchChainBalances(address, blockchain, env);

    // Clear stale cached balances for this watched address so no phantom or zero-balance tokens remain
    await supabase
      .from('token_balances')
      .delete()
      .eq('watched_address_id', watchedAddressId);

    // Insert fresh balances with non-zero amounts
    if (balances.length > 0) {
      await supabase.from('token_balances').insert(
        balances.map((bal) => ({
          watched_address_id: watchedAddressId,
          token_symbol: bal.symbol,
          token_name: bal.name,
          contract_address: bal.contractAddress,
          balance: bal.balance,
          price_usd: bal.priceUsd,
          value_usd: bal.valueUsd,
          logo_url: bal.logoUrl || null,
          is_spam: bal.isSpam,
          updated_at: new Date().toISOString(),
        }))
      );
    }

    // Update last_synced_at timestamp on watched_addresses
    await supabase
      .from('watched_addresses')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', watchedAddressId);
  } catch (err) {
    console.error(`[Sync Balances Error] ${address} on ${blockchain}:`, err);
  }
}

