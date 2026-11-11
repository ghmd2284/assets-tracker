import { Hono } from 'hono';
import { Env, TelegramAuthContext } from '../types';
import { validateTelegramInitData } from '../lib/telegramAuth';
import { getSupabaseClient } from '../lib/supabase';
import {
  parseBatchAddresses,
  Blockchain,
  EVM_CHAINS,
  AggregatedAsset,
  PortfolioSummary,
  WatchedWallet,
  MutationTransaction,
  PortfolioSnapshot,
  PerformanceResponse,
  truncateAddress,
} from '@asset-tracker/shared';
import { fetchChainBalances, getUsdToIdrRate } from '../providers';
import { syncWatchedAddressBalances } from '../lib/syncBalances';
import { syncWatchedAddressTransactions } from '../lib/syncTransactions';
import { escapeHtml, sendTelegramNotification } from '../lib/telegramBot';

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

// GET /api/wallets - List all user's tracked wallets (grouped by distinct address)
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

  // Deduplicate distinct physical addresses so 1 EVM wallet displays as 1 row
  const groupedWallets = new Map<string, WatchedWallet>();
  for (const row of (data || []) as any[]) {
    const addr = row.watched_addresses?.address;
    if (!addr) continue;

    const key = addr.toLowerCase();
    const chain = row.watched_addresses?.blockchain as Blockchain;
    const isEvm = EVM_CHAINS.includes(chain);

    if (!groupedWallets.has(key)) {
      groupedWallets.set(key, {
        id: row.id,
        address: addr,
        blockchain: isEvm ? 'ethereum' : chain,
        label: row.wallet_label,
        isDemo: row.is_demo,
        createdAt: row.created_at,
      });
    }
  }

  const wallets = Array.from(groupedWallets.values());
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

  // Check user wallet limit based on distinct physical addresses
  const { data: existingWallets } = await supabase
    .from('user_wallets')
    .select('watched_addresses(address)')
    .eq('user_id', user.id)
    .eq('is_demo', false);

  const distinctExistingAddresses = new Set<string>();
  for (const w of (existingWallets || []) as any[]) {
    const a = w.watched_addresses?.address?.toLowerCase();
    if (a) distinctExistingAddresses.add(a);
  }

  const newDistinctCount = new Set(valid.map((v) => v.normalized.toLowerCase())).size;

  if (distinctExistingAddresses.size + newDistinctCount > 10) {
    return c.json(
      { error: 'Batas maksimal 10 alamat dompet unik per akun gratis tercapai.' },
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

        // 3. Fetch initial balances and cache into token_balances synchronously
        try {
          await syncWatchedAddressBalances(c.env, watchedAddr.id, item.normalized, chain);
          // 4. Backfill initial transaction history asynchronously
          c.executionCtx.waitUntil(
            syncWatchedAddressTransactions(c.env, watchedAddr.id, item.normalized, chain, {
              notify: false,
            })
          );
        } catch (syncErr) {
          console.error('[Initial Sync Error]:', syncErr);
        }
      }
    }
  }

  // Send Telegram confirmation notification to the user
  if (createdWallets.length > 0) {
    try {
      const descriptions = createdWallets
        .map(
          (w) =>
            `• <b>${escapeHtml(w.label)}</b> (${w.blockchain.toUpperCase()}): <code>${truncateAddress(w.address, 6, 4)}</code>`
        )
        .join('\n');

      const confirmMsg = `
🌿 <b>Dompet Berhasil Ditambahkan</b>
━━━━━━━━━━━━━━━━━━━━
${descriptions}

🔔 <i>Notifikasi mutasi real-time otomatis aktif untuk dompet ini.</i>
`.trim();

      await sendTelegramNotification(
        c.env.TELEGRAM_BOT_TOKEN,
        user.id,
        confirmMsg,
        c.env.MINI_APP_URL
      );
    } catch (notifErr) {
      console.warn('[Wallet Added Notification Error]:', notifErr);
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

  // Find the target watched address info
  const { data: uw } = await supabase
    .from('user_wallets')
    .select('watched_address_id, watched_addresses(address, blockchain)')
    .eq('id', walletId)
    .eq('user_id', user.id)
    .single();

  if (!uw || !(uw as any).watched_addresses) {
    return c.json({ error: 'Wallet not found' }, 404);
  }

  const targetAddress = (uw as any).watched_addresses.address;
  const targetChain = (uw as any).watched_addresses.blockchain as Blockchain;
  const isEvm = EVM_CHAINS.includes(targetChain);

  let userWalletIdsToDelete = [walletId];
  let watchedAddressIdsToCheck = [uw.watched_address_id];

  if (isEvm) {
    // For EVM, find all user_wallets for this user sharing the same 0x address
    const { data: allEvmRows } = await supabase
      .from('user_wallets')
      .select('id, watched_address_id, watched_addresses!inner(address)')
      .eq('user_id', user.id)
      .eq('watched_addresses.address', targetAddress);

    if (allEvmRows && allEvmRows.length > 0) {
      userWalletIdsToDelete = allEvmRows.map((r: any) => r.id);
      watchedAddressIdsToCheck = allEvmRows.map((r: any) => r.watched_address_id);
    }
  }

  // Delete all matching user_wallets entries for this user
  await supabase
    .from('user_wallets')
    .delete()
    .in('id', userWalletIdsToDelete);

  // Reference counting check: if no other user is watching these addresses, mark inactive
  for (const waId of watchedAddressIdsToCheck) {
    const { count } = await supabase
      .from('user_wallets')
      .select('id', { count: 'exact', head: true })
      .eq('watched_address_id', waId);

    if (count === 0) {
      await supabase
        .from('watched_addresses')
        .update({ is_active: false })
        .eq('id', waId);
    }
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

    // Auto-heal empty token balance cache in background
    if (balances.length === 0 && watched.is_active) {
      c.executionCtx.waitUntil(
        syncWatchedAddressBalances(c.env, watched.id, watched.address, blockchain)
      );
    }

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

// POST /api/wallets/sync - Manually re-sync balances and check for new transactions
walletRoutes.post('/sync', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  const { data: userWallets } = await supabase
    .from('user_wallets')
    .select('watched_address_id, watched_addresses(id, address, blockchain)')
    .eq('user_id', user.id);

  if (userWallets && userWallets.length > 0) {
    const syncPromises = userWallets.flatMap((uw: any) => {
      const wa = uw.watched_addresses;
      if (!wa) return [];
      return [
        syncWatchedAddressBalances(c.env, wa.id, wa.address, wa.blockchain),
        syncWatchedAddressTransactions(c.env, wa.id, wa.address, wa.blockchain, { notify: true }),
      ];
    });

    await Promise.allSettled(syncPromises);
  }

  return c.json({ ok: true });
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

  // 3. Auto-backfill transactions in background if empty
  if ((!txList || txList.length === 0) && watchedIds.length > 0) {
    const { data: waList } = await supabase
      .from('watched_addresses')
      .select('id, address, blockchain')
      .in('id', watchedIds);

    if (waList) {
      c.executionCtx.waitUntil(
        Promise.allSettled(
          waList.map((wa: any) =>
            syncWatchedAddressTransactions(c.env, wa.id, wa.address, wa.blockchain as Blockchain, {
              notify: false,
            })
          )
        )
      );
    }
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

// GET /api/wallets/performance - Retrieve historical portfolio snapshots and deltas
walletRoutes.get('/performance', async (c) => {
  const { user } = c.get('telegramAuth');
  const range = c.req.query('range') || '1W';
  const supabase = getSupabaseClient(c.env);

  const now = new Date();
  let days = 7;
  if (range === '1D') days = 1;
  else if (range === '1W') days = 7;
  else if (range === '1M') days = 30;
  else if (range === '1Y') days = 365;
  else if (range === 'ALL') days = 3650;

  const startDate = new Date(now.getTime() - days * 24 * 3600 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: snapshots, error } = await supabase
    .from('portfolio_snapshots')
    .select('recorded_at, total_value_usd')
    .eq('user_id', user.id)
    .gte('recorded_at', startDate)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('[Performance Endpoint Error]:', error);
    return c.json({ snapshots: [], currentValueUsd: 0, changeUsd: 0, changePercent: 0, range });
  }

  const formattedSnapshots: PortfolioSnapshot[] = (snapshots || []).map((s) => ({
    recordedAt: s.recorded_at,
    totalValueUsd: Number(s.total_value_usd) || 0,
  }));

  let changeUsd = 0;
  let changePercent = 0;
  let currentValueUsd = 0;

  if (formattedSnapshots.length > 0) {
    currentValueUsd = formattedSnapshots[formattedSnapshots.length - 1].totalValueUsd;
    const initialValueUsd = formattedSnapshots[0].totalValueUsd;
    changeUsd = currentValueUsd - initialValueUsd;
    changePercent = initialValueUsd > 0 ? (changeUsd / initialValueUsd) * 100 : 0;
  }

  const response: PerformanceResponse = {
    snapshots: formattedSnapshots,
    currentValueUsd,
    changeUsd: Math.round(changeUsd * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    range,
  };

  return c.json(response);
});
