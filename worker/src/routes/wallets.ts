import { Hono } from 'hono';
import { Env, TelegramAuthContext } from '../types';
import { validateTelegramInitData } from '../lib/telegramAuth';
import { getSupabaseClient } from '../lib/supabase';
import {
  parseBatchAddresses,
  Blockchain,
  AggregatedAsset,
  PortfolioSummary,
  WatchedWallet,
  MutationTransaction,
} from '@asset-tracker/shared';
import { fetchChainBalances, getUsdToIdrRate } from '../providers';

export const walletRoutes = new Hono<{
  Bindings: Env;
  Variables: { telegramAuth: TelegramAuthContext };
}>();

// Telegram initData Authentication Middleware for all wallet endpoints
walletRoutes.use('*', async (c, next) => {
  const initData = c.req.header('X-Telegram-Init-Data');

  if (!initData) {
    return c.json({ error: 'Unauthorized: Missing X-Telegram-Init-Data header' }, 401);
  }

  const { valid, context, error } = await validateTelegramInitData(
    initData,
    c.env.TELEGRAM_BOT_TOKEN
  );

  if (!valid || !context) {
    return c.json({ error: `Unauthorized: ${error}` }, 401);
  }

  c.set('telegramAuth', context);
  await next();
});

// GET /api/wallets - List all user's tracked wallets
walletRoutes.get('/', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('user_wallets')
    .select(
      `
      id,
      wallet_label,
      is_demo,
      created_at,
      watched_addresses (
        id,
        address,
        blockchain,
        is_active
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const wallets: WatchedWallet[] = (data || []).map((row: any) => ({
    id: row.id,
    address: row.watched_addresses?.address,
    blockchain: row.watched_addresses?.blockchain,
    label: row.wallet_label,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  }));

  return c.json({ wallets });
});

// POST /api/wallets - Add new address(es) to track
walletRoutes.post('/', async (c) => {
  const { user } = c.get('telegramAuth');
  const body = await c.req.json<{ addresses: string[] | string; label?: string }>();
  const supabase = getSupabaseClient(c.env);

  const rawInput = Array.isArray(body.addresses) ? body.addresses.join('\n') : body.addresses;
  const { valid, invalid } = parseBatchAddresses(rawInput || '');

  if (valid.length === 0) {
    return c.json({ error: 'No valid addresses detected', invalid }, 400);
  }

  // Check user wallet limit (maximum 10 distinct addresses per user)
  const { count } = await supabase
    .from('user_wallets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_demo', false);

  if ((count || 0) + valid.length > 10) {
    return c.json(
      { error: 'Batas maksimal 10 alamat dompet per akun gratis tercapai.' },
      400
    );
  }

  const createdWallets: any[] = [];

  for (const item of valid) {
    const label = body.label?.trim() || `${item.ecosystem.toUpperCase()} Wallet`;

    for (const chain of item.targetChains) {
      // 1. Upsert master watched_addresses
      const { data: watchedAddr, error: addrErr } = await supabase
        .from('watched_addresses')
        .upsert(
          {
            address: item.normalized,
            blockchain: chain,
            is_active: true,
          },
          { onConflict: 'address,blockchain' }
        )
        .select()
        .single();

      if (addrErr || !watchedAddr) {
        console.error('[Wallet Add] Failed watched_addresses:', addrErr);
        continue;
      }

      // 2. Upsert user_wallets link
      const { data: userWallet, error: uwErr } = await supabase
        .from('user_wallets')
        .upsert(
          {
            user_id: user.id,
            watched_address_id: watchedAddr.id,
            wallet_label: label,
            is_demo: false,
          },
          { onConflict: 'user_id,watched_address_id' }
        )
        .select()
        .single();

      if (userWallet) {
        createdWallets.push({
          id: userWallet.id,
          address: item.normalized,
          blockchain: chain,
          label,
        });

        // 3. Fetch initial balances and cache into token_balances (async / non-blocking)
        c.executionCtx.waitUntil(
          (async () => {
            try {
              const balances = await fetchChainBalances(item.normalized, chain, c.env);
              for (const bal of balances) {
                await supabase.from('token_balances').upsert(
                  {
                    watched_address_id: watchedAddr.id,
                    token_symbol: bal.symbol,
                    token_name: bal.name,
                    contract_address: bal.contractAddress,
                    balance: bal.balance,
                    price_usd: bal.priceUsd,
                    value_usd: bal.valueUsd,
                    logo_url: bal.logoUrl || null,
                    is_spam: bal.isSpam,
                  },
                  { onConflict: 'watched_address_id,token_symbol,contract_address' }
                );
              }
            } catch (err) {
              console.error(`[Initial Balance Fetch Error] for ${item.normalized} on ${chain}:`, err);
            }
          })()
        );
      }
    }
  }

  return c.json({ ok: true, created: createdWallets, invalid });
});

// PATCH /api/wallets/:id - Update wallet label
walletRoutes.patch('/:id', async (c) => {
  const { user } = c.get('telegramAuth');
  const walletId = c.req.param('id');
  const body = await c.req.json<{ label: string }>();

  if (!body.label?.trim()) {
    return c.json({ error: 'Label is required' }, 400);
  }

  const supabase = getSupabaseClient(c.env);
  const { data, error } = await supabase
    .from('user_wallets')
    .update({ wallet_label: body.label.trim() })
    .eq('id', walletId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return c.json({ error: 'Wallet not found or update failed' }, 404);
  }

  return c.json({ ok: true, wallet: data });
});

// DELETE /api/wallets/:id - Delete tracked wallet
walletRoutes.delete('/:id', async (c) => {
  const { user } = c.get('telegramAuth');
  const walletId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);

  // Find the watched_address_id first
  const { data: uw } = await supabase
    .from('user_wallets')
    .select('watched_address_id')
    .eq('id', walletId)
    .eq('user_id', user.id)
    .single();

  if (!uw) {
    return c.json({ error: 'Wallet not found' }, 404);
  }

  // Delete from user_wallets
  await supabase.from('user_wallets').delete().eq('id', walletId);

  // Reference counting check: if no other user is watching this address, mark inactive
  const { count } = await supabase
    .from('user_wallets')
    .select('id', { count: 'exact', head: true })
    .eq('watched_address_id', uw.watched_address_id);

  if (count === 0) {
    await supabase
      .from('watched_addresses')
      .update({ is_active: false })
      .eq('id', uw.watched_address_id);
  }

  return c.json({ ok: true });
});

// GET /api/wallets/portfolio - Aggregated multi-chain asset portfolio
walletRoutes.get('/portfolio', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  // Fetch all user's watched addresses and their token balances
  const { data, error } = await supabase
    .from('user_wallets')
    .select(
      `
      wallet_label,
      is_demo,
      watched_addresses (
        id,
        address,
        blockchain,
        token_balances (
          token_symbol,
          token_name,
          contract_address,
          balance,
          price_usd,
          value_usd,
          logo_url,
          is_spam
        )
      )
    `
    )
    .eq('user_id', user.id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const assetMap = new Map<string, AggregatedAsset>();
  let totalValueUsd = 0;
  let tonValue = 0;
  let evmValue = 0;
  let solanaValue = 0;

  for (const uw of data || []) {
    const watched = uw.watched_addresses as any;
    if (!watched) continue;

    const blockchain = watched.blockchain as Blockchain;
    const balances = watched.token_balances || [];

    for (const bal of balances) {
      if (bal.is_spam) continue; // Filter scam tokens

      const symbol = bal.token_symbol.toUpperCase();
      const valUsd = Number(bal.value_usd) || 0;
      const amount = Number(bal.balance) || 0;

      totalValueUsd += valUsd;

      if (blockchain === 'ton') {
        tonValue += valUsd;
      } else if (blockchain === 'solana') {
        solanaValue += valUsd;
      } else {
        evmValue += valUsd;
      }

      if (!assetMap.has(symbol)) {
        assetMap.set(symbol, {
          symbol,
          name: bal.token_name,
          logoUrl: bal.logo_url || undefined,
          totalBalance: 0,
          totalValueUsd: 0,
          chains: [],
        });
      }

      const item = assetMap.get(symbol)!;
      item.totalBalance += amount;
      item.totalValueUsd += valUsd;
      item.chains.push({
        blockchain,
        contractAddress: bal.contract_address,
        balance: amount,
        valueUsd: valUsd,
        address: watched.address,
        label: uw.wallet_label,
      });
    }
  }

  const idrRate = await getUsdToIdrRate();
  const totalValueIdr = Math.round(totalValueUsd * idrRate);

  // Compute Allocation Percentages
  const tonPercent = totalValueUsd > 0 ? Number(((tonValue / totalValueUsd) * 100).toFixed(1)) : 0;
  const evmPercent = totalValueUsd > 0 ? Number(((evmValue / totalValueUsd) * 100).toFixed(1)) : 0;
  const solanaPercent = totalValueUsd > 0 ? Number(((solanaValue / totalValueUsd) * 100).toFixed(1)) : 0;

  const summary: PortfolioSummary = {
    totalValueUsd: Number(totalValueUsd.toFixed(2)),
    totalValueIdr,
    change24hUsd: 0,
    change24hPercent: 0,
    allocation: {
      tonPercent,
      evmPercent,
      solanaPercent,
    },
  };

  const assets = Array.from(assetMap.values()).sort(
    (a, b) => b.totalValueUsd - a.totalValueUsd
  );

  return c.json({ summary, assets });
});

// GET /api/wallets/transactions - Recent transactions for user's watched wallets
walletRoutes.get('/transactions', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  // 1. Get all watched_address_ids for this user
  const { data: uwList } = await supabase
    .from('user_wallets')
    .select('watched_address_id')
    .eq('user_id', user.id);

  if (!uwList || uwList.length === 0) {
    return c.json({ transactions: [] });
  }

  const watchedIds = uwList.map((uw) => uw.watched_address_id);

  // 2. Fetch latest 10 transactions
  const { data: txList, error } = await supabase
    .from('transactions')
    .select('*')
    .in('watched_address_id', watchedIds)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const transactions: MutationTransaction[] = (txList || []).map((tx: any) => ({
    id: tx.id,
    txHash: tx.tx_hash,
    blockchain: tx.blockchain as Blockchain,
    direction: tx.direction,
    tokenSymbol: tx.token_symbol,
    amount: Number(tx.amount),
    amountUsd: tx.amount_usd ? Number(tx.amount_usd) : undefined,
    fromAddress: tx.from_address,
    toAddress: tx.to_address,
    timestamp: tx.timestamp,
  }));

  return c.json({ transactions });
});
