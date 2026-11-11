import { Blockchain } from '@asset-tracker/shared';
import { Env } from '../types';
import { getSupabaseClient } from './supabase';
import { formatMutationAlertMessage, sendTelegramNotification } from './telegramBot';
import { fetchTokenPrice } from '../providers/prices';

interface SyncTxOptions {
  notify?: boolean;
}

/**
 * Syncs recent on-chain transactions for a watched address.
 * Detects new mutations, inserts them into transactions table,
 * and notifies active subscribers via Telegram Bot.
 */
export async function syncWatchedAddressTransactions(
  env: Env,
  watchedAddressId: string,
  address: string,
  blockchain: Blockchain,
  options: SyncTxOptions = { notify: true }
): Promise<number> {
  const supabase = getSupabaseClient(env);
  let newTxCount = 0;

  if (blockchain === 'ton') {
    try {
      const res = await fetch(
        `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=10`
      );
      if (!res.ok) return 0;

      const data = await res.json<any>();
      const txs = data?.result || [];

      // Fetch subscribers watching this address
      const { data: subscribers } = await supabase
        .from('user_wallets')
        .select(`
          wallet_label,
          users (
            id,
            currency_pref,
            min_alert_usd,
            is_banned
          )
        `)
        .eq('watched_address_id', watchedAddressId);

      for (const item of txs) {
        const rawHash = item.transaction_id?.hash;
        if (!rawHash) continue;

        let hexHash = rawHash;
        if (rawHash.length === 44 && rawHash.includes('=')) {
          try {
            const bin = atob(rawHash);
            hexHash = Array.from(bin)
              .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join('');
          } catch {}
        }

        const utime = item.utime;
        const timestamp = new Date(utime * 1000).toISOString();
        const inMsg = item.in_msg;
        const outMsgs = item.out_msgs || [];

        // Inbound Transfer
        if (inMsg && Number(inMsg.value) > 0) {
          const amount = Number(inMsg.value) / 1e9;
          const fromAddr = inMsg.source || 'external';
          const toAddr = inMsg.destination || address;
          const direction = 'in';

          const inserted = await insertAndNotify({
            env,
            supabase,
            watchedAddressId,
            address,
            blockchain: 'ton',
            txHash: hexHash,
            direction,
            tokenSymbol: 'TON',
            amount,
            fromAddress: fromAddr,
            toAddress: toAddr,
            timestamp,
            subscribers: subscribers || [],
            notify: options.notify ?? true,
          });

          if (inserted) newTxCount++;
        }

        // Outbound Transfers
        for (const outMsg of outMsgs) {
          if (Number(outMsg.value) > 0) {
            const amount = Number(outMsg.value) / 1e9;
            const fromAddr = outMsg.source || address;
            const toAddr = outMsg.destination || 'external';
            const direction = 'out';

            const inserted = await insertAndNotify({
              env,
              supabase,
              watchedAddressId,
              address,
              blockchain: 'ton',
              txHash: hexHash,
              direction,
              tokenSymbol: 'TON',
              amount,
              fromAddress: fromAddr,
              toAddress: toAddr,
              timestamp,
              subscribers: subscribers || [],
              notify: options.notify ?? true,
            });

            if (inserted) newTxCount++;
          }
        }
      }
    } catch (err) {
      console.warn(`[Sync Transactions Error] ${address} on TON:`, err);
    }
  }

  return newTxCount;
}

async function insertAndNotify(params: {
  env: Env;
  supabase: any;
  watchedAddressId: string;
  address: string;
  blockchain: Blockchain;
  txHash: string;
  direction: 'in' | 'out';
  tokenSymbol: string;
  amount: number;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  subscribers: any[];
  notify: boolean;
}): Promise<boolean> {
  const {
    env,
    supabase,
    watchedAddressId,
    address,
    blockchain,
    txHash,
    direction,
    tokenSymbol,
    amount,
    fromAddress,
    toAddress,
    timestamp,
    subscribers,
    notify,
  } = params;

  // Estimate USD value
  const priceInfo = await fetchTokenPrice(tokenSymbol, null, blockchain);
  const priceUsd = priceInfo?.priceUsd || (tokenSymbol === 'TON' ? 1.15 : 0);
  const amountUsd = priceUsd > 0 ? Number((amount * priceUsd).toFixed(2)) : undefined;

  // Check if tx already recorded
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('watched_address_id', watchedAddressId)
    .eq('tx_hash', txHash)
    .maybeSingle();

  if (existing) {
    return false;
  }

  // Insert transaction
  const { data: insertedTx, error: txError } = await supabase
    .from('transactions')
    .insert({
      watched_address_id: watchedAddressId,
      tx_hash: txHash,
      blockchain,
      direction,
      token_symbol: tokenSymbol,
      amount,
      amount_usd: amountUsd,
      from_address: fromAddress,
      to_address: toAddress,
      timestamp,
    })
    .select('id')
    .maybeSingle();

  if (txError || !insertedTx) {
    return false;
  }

  // Send push notification to subscribers
  if (notify && subscribers.length > 0) {
    for (const sub of subscribers) {
      const u = sub.users;
      if (!u || u.is_banned) continue;

      const minAlert = typeof u.min_alert_usd === 'number' ? u.min_alert_usd : 0;
      if (amountUsd !== undefined && minAlert > 0 && amountUsd < minAlert) {
        continue;
      }

      const alertText = formatMutationAlertMessage({
        blockchain,
        direction,
        amount,
        tokenSymbol,
        amountUsd,
        walletLabel: sub.wallet_label || 'Dompet Saya',
        address,
        txHash,
        currencyPref: u.currency_pref || 'USD',
      });

      await sendTelegramNotification(
        env.TELEGRAM_BOT_TOKEN,
        u.id,
        alertText,
        env.MINI_APP_URL
      );
    }
  }

  return true;
}

