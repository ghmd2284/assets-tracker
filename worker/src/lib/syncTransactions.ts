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
  } else if (blockchain === 'solana') {
    try {
      const rpcUrls = env.HELIUS_API_KEY
        ? [`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`]
        : [
            'https://api.mainnet-beta.solana.com',
            'https://solana-rpc.publicnode.com',
            'https://api.mainnet.solana.com',
          ];

      let signatures: any[] = [];
      let activeRpcUrl = rpcUrls[0];
      for (const rpcUrl of rpcUrls) {
        try {
          const sigRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getSignaturesForAddress',
              params: [address, { limit: 10 }],
            }),
          });

          if (sigRes.ok) {
            const sigData = await sigRes.json<any>();
            if (sigData?.result) {
              signatures = sigData.result;
              activeRpcUrl = rpcUrl;
              break;
            }
          }
        } catch {
          // try next rpc
        }
      }

      if (signatures.length > 0) {

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

        for (const item of signatures) {
          if (!item.signature || item.err) continue;

          const timestamp = item.blockTime
            ? new Date(item.blockTime * 1000).toISOString()
            : new Date().toISOString();

          // Check if transaction already exists in database
          const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('tx_hash', item.signature)
            .eq('watched_address_id', watchedAddressId)
            .maybeSingle();

          if (existing) continue;

          try {
            const txRes = await fetch(activeRpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'getTransaction',
                params: [
                  item.signature,
                  { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
                ],
              }),
            });

            if (txRes.ok) {
              const txData = await txRes.json<any>();
              const meta = txData?.result?.meta;
              const accountKeys = txData?.result?.transaction?.message?.accountKeys || [];

              if (meta && accountKeys.length > 0) {
                const addrIndex = accountKeys.findIndex((k: any) => {
                  const pubkey = typeof k === 'string' ? k : k.pubkey;
                  return pubkey === address;
                });

                if (addrIndex >= 0) {
                  const preBal = meta.preBalances?.[addrIndex] ?? 0;
                  const postBal = meta.postBalances?.[addrIndex] ?? 0;
                  const diff = postBal - preBal;
                  const fee = addrIndex === 0 ? (meta.fee ?? 0) : 0;
                  const netChange = diff + fee;

                  if (Math.abs(diff) > 5000) {
                    const direction: 'in' | 'out' = diff > 0 ? 'in' : 'out';
                    const amount = Math.abs(netChange !== 0 ? netChange : diff) / 1e9;

                    const inserted = await insertAndNotify({
                      env,
                      supabase,
                      watchedAddressId,
                      address,
                      blockchain: 'solana',
                      txHash: item.signature,
                      direction,
                      tokenSymbol: 'SOL',
                      amount,
                      fromAddress: direction === 'in' ? 'external' : address,
                      toAddress: direction === 'in' ? address : 'external',
                      timestamp,
                      subscribers: subscribers || [],
                      notify: options.notify ?? true,
                    });

                    if (inserted) newTxCount++;
                  }
                }
              }
            }
          } catch (txErr) {
            console.warn(`[Sync Tx Solana Details Error] ${item.signature}:`, txErr);
          }
        }
      }
    } catch (err) {
      console.warn(`[Sync Transactions Error] ${address} on Solana:`, err);
    }
  } else if (['ethereum', 'bsc', 'base', 'arbitrum', 'polygon'].includes(blockchain) && env.ALCHEMY_API_KEY) {
    try {
      const chainPrefix = blockchain === 'bsc' ? 'bnb' : blockchain === 'arbitrum' ? 'arb' : blockchain;
      const rpcUrl = `https://${chainPrefix}-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [
            {
              fromBlock: '0x0',
              toAddress: address,
              category: ['external', 'erc20'],
              maxCount: '0xa',
              order: 'desc',
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json<any>();
        const transfers = data?.result?.transfers || [];

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

        for (const tr of transfers) {
          if (!tr.hash) continue;

          const inserted = await insertAndNotify({
            env,
            supabase,
            watchedAddressId,
            address,
            blockchain,
            txHash: tr.hash,
            direction: 'in',
            tokenSymbol: tr.asset || (blockchain === 'polygon' ? 'POL' : blockchain === 'bsc' ? 'BNB' : 'ETH'),
            amount: Number(tr.value) || 0,
            fromAddress: tr.from || 'external',
            toAddress: tr.to || address,
            timestamp: new Date().toISOString(),
            subscribers: subscribers || [],
            notify: options.notify ?? true,
          });

          if (inserted) newTxCount++;
        }
      }
    } catch (err) {
      console.warn(`[Sync Transactions Error] ${address} on ${blockchain}:`, err);
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

