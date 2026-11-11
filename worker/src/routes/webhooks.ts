import { Hono } from 'hono';
import { Env } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import {
  verifyAlchemySignature,
  verifyHeliusAuth,
  verifyTonApiAuth,
} from '../lib/webhookAuth';
import {
  parseAlchemyPayload,
  parseHeliusPayload,
  parseTonPayload,
  ParsedMutation,
} from '../lib/webhookParsers';
import {
  formatMutationAlertMessage,
  sendTelegramNotification,
} from '../lib/telegramBot';
import { syncWatchedAddressBalances } from '../lib/syncBalances';
import { fetchTokenPrice } from '../providers/prices';

export const webhookRoutes = new Hono<{ Bindings: Env }>();

/**
 * Core mutation processor:
 * 1. Resolves matching active watched_addresses.
 * 2. Calculates USD value & inserts idempotently into transactions table.
 * 3. Notifies subscribers via Telegram Bot (with dust threshold filter).
 * 4. Schedules async balance refresh for the address.
 */
export async function processMutation(
  env: Env,
  mutation: ParsedMutation,
  ctx?: { waitUntil: (promise: Promise<any>) => void }
): Promise<{ processed: boolean; notifiedCount: number }> {
  const supabase = getSupabaseClient(env);

  const candidates = [
    mutation.fromAddress,
    mutation.toAddress,
    mutation.fromAddress.toLowerCase(),
    mutation.toAddress.toLowerCase(),
  ];

  const { data: matchedAddresses, error: matchErr } = await supabase
    .from('watched_addresses')
    .select('id, address, blockchain, is_active')
    .eq('blockchain', mutation.blockchain)
    .eq('is_active', true)
    .in('address', candidates);

  if (matchErr || !matchedAddresses || matchedAddresses.length === 0) {
    return { processed: false, notifiedCount: 0 };
  }

  let totalNotified = 0;

  for (const watched of matchedAddresses) {
    const isTo = watched.address.toLowerCase() === mutation.toAddress.toLowerCase();
    const direction: 'in' | 'out' = isTo ? 'in' : 'out';

    // Estimate USD value
    let priceUsd = 0;
    const sym = mutation.tokenSymbol.toUpperCase();
    if (sym === 'ETH') priceUsd = 2650;
    else if (sym === 'BNB') priceUsd = 580;
    else if (sym === 'SOL') priceUsd = 150;
    else if (sym === 'TON') priceUsd = 5.0;
    else if (sym === 'USDT' || sym === 'USDC' || sym === 'DAI') priceUsd = 1.0;
    else {
      try {
        const dp = await fetchTokenPrice(mutation.tokenSymbol, mutation.contractAddress, mutation.blockchain);
        if (dp) priceUsd = dp.priceUsd;
      } catch {
        // ignore lookup error
      }
    }

    const amountUsd = priceUsd > 0 ? mutation.amount * priceUsd : undefined;

    // Idempotent insertion into transactions table
    const { data: insertedTx, error: txError } = await supabase
      .from('transactions')
      .insert({
        watched_address_id: watched.id,
        tx_hash: mutation.txHash,
        blockchain: mutation.blockchain,
        direction,
        token_symbol: mutation.tokenSymbol,
        amount: mutation.amount,
        amount_usd: amountUsd !== undefined ? amountUsd : null,
        from_address: mutation.fromAddress,
        to_address: mutation.toAddress,
        timestamp: mutation.timestamp,
      })
      .select('id')
      .maybeSingle();

    // Idempotency: If duplicate key or already recorded, skip to prevent double alerts
    if (txError || !insertedTx) {
      console.log(`[Webhook Idempotency] Tx ${mutation.txHash} for ${watched.address} already recorded.`);
      continue;
    }

    // Retrieve subscribers watching this address
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
      .eq('watched_address_id', watched.id);

    if (subscribers && subscribers.length > 0) {
      for (const item of subscribers) {
        const u = (item as any).users;
        if (!u || u.is_banned) continue;

        const minAlert = typeof u.min_alert_usd === 'number' ? u.min_alert_usd : 0;
        // Dust filter: if USD amount is known and threshold is set, skip if below min_alert_usd
        if (amountUsd !== undefined && minAlert > 0 && amountUsd < minAlert) {
          continue;
        }

        const alertText = formatMutationAlertMessage({
          blockchain: mutation.blockchain,
          direction,
          amount: mutation.amount,
          tokenSymbol: mutation.tokenSymbol,
          amountUsd,
          walletLabel: item.wallet_label || 'Dompet Saya',
          address: watched.address,
          txHash: mutation.txHash,
          currencyPref: u.currency_pref || 'USD',
        });

        const sent = await sendTelegramNotification(
          env.TELEGRAM_BOT_TOKEN,
          u.id,
          alertText,
          env.MINI_APP_URL
        );

        if (sent) totalNotified++;
      }
    }

    // Asynchronously refresh balances for this address
    if (ctx?.waitUntil) {
      ctx.waitUntil(syncWatchedAddressBalances(env, watched.id, watched.address, watched.blockchain));
    }
  }

  return { processed: true, notifiedCount: totalNotified };
}

// ============================================================================
// Webhook Receivers
// ============================================================================

// POST /webhooks/alchemy - Alchemy Address Activity Webhook (Ethereum, BSC, Base, Arbitrum, Polygon)
webhookRoutes.post('/alchemy', async (c) => {
  const signature = c.req.header('x-alchemy-signature');
  const rawBody = await c.req.text();

  const isValid = await verifyAlchemySignature(
    rawBody,
    signature,
    c.env.ALCHEMY_WEBHOOK_SIGNING_KEY
  );

  if (!isValid) {
    return c.text('Unauthorized: Invalid Alchemy Signature', 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.text('Invalid JSON payload', 400);
  }

  const mutations = parseAlchemyPayload(payload);
  let processedCount = 0;

  for (const m of mutations) {
    const res = await processMutation(c.env, m, c.executionCtx);
    if (res.processed) processedCount++;
  }

  return c.json({ ok: true, detected: mutations.length, processed: processedCount });
});

// POST /webhooks/helius - Helius Solana Enhanced Webhook
webhookRoutes.post('/helius', async (c) => {
  const authHeader = c.req.header('Authorization');

  const isValid = verifyHeliusAuth(authHeader, c.env.HELIUS_WEBHOOK_SECRET);
  if (!isValid) {
    return c.text('Unauthorized: Invalid Helius Auth', 401);
  }

  const payload = await c.req.json<any>();
  const mutations = parseHeliusPayload(payload);
  let processedCount = 0;

  for (const m of mutations) {
    const res = await processMutation(c.env, m, c.executionCtx);
    if (res.processed) processedCount++;
  }

  return c.json({ ok: true, detected: mutations.length, processed: processedCount });
});

// POST /webhooks/ton - TonAPI Transaction Webhook
webhookRoutes.post('/ton', async (c) => {
  const secretHeader = c.req.header('X-Tonapi-Secret') || c.req.header('Authorization');

  const isValid = verifyTonApiAuth(secretHeader, c.env.TONAPI_SECRET);
  if (!isValid) {
    return c.text('Unauthorized: Invalid TonAPI Secret', 401);
  }

  const payload = await c.req.json<any>();
  const mutations = parseTonPayload(payload);
  let processedCount = 0;

  for (const m of mutations) {
    const res = await processMutation(c.env, m, c.executionCtx);
    if (res.processed) processedCount++;
  }

  return c.json({ ok: true, detected: mutations.length, processed: processedCount });
});
