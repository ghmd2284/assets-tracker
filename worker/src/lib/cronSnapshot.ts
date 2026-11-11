import { Env } from '../types';
import { getSupabaseClient } from './supabase';

/**
 * Executes daily at 00:00 UTC via Cloudflare Workers Cron Trigger.
 * Aggregates non-spam balances and records a daily portfolio snapshot
 * for each active user into `portfolio_snapshots` using concurrent chunking.
 */
export async function recordDailyPortfolioSnapshots(
  env: Env
): Promise<{ usersProcessed: number; errors: number }> {
  const supabase = getSupabaseClient(env);
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Fetch all non-banned users
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id')
    .eq('is_banned', false);

  if (usersErr || !users) {
    console.error('[Cron Snapshot] Failed to fetch users:', usersErr);
    return { usersProcessed: 0, errors: 1 };
  }

  let usersProcessed = 0;
  let errors = 0;

  // Process in concurrent chunks of 10 users to prevent execution timeout
  const CHUNK_SIZE = 10;
  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (user) => {
        try {
          // 2. Fetch all watched address IDs for this user
          const { data: userWallets } = await supabase
            .from('user_wallets')
            .select('watched_address_id')
            .eq('user_id', user.id);

          if (!userWallets || userWallets.length === 0) {
            return;
          }

          const watchedAddressIds = userWallets.map((w) => w.watched_address_id);

          // 3. Sum total USD value of non-spam token balances
          const { data: balances } = await supabase
            .from('token_balances')
            .select('value_usd')
            .in('watched_address_id', watchedAddressIds)
            .eq('is_spam', false);

          const totalValueUsd = (balances || []).reduce(
            (sum, b) => sum + (Number(b.value_usd) || 0),
            0
          );

          // 4. Upsert snapshot into portfolio_snapshots
          const { error: upsertErr } = await supabase
            .from('portfolio_snapshots')
            .upsert(
              {
                user_id: user.id,
                total_value_usd: Math.round(totalValueUsd * 100) / 100,
                recorded_at: todayDate,
              },
              { onConflict: 'user_id,recorded_at' }
            );

          if (upsertErr) {
            console.error(`[Cron Snapshot] Upsert error for user ${user.id}:`, upsertErr);
            errors++;
          } else {
            usersProcessed++;
          }
        } catch (err) {
          console.error(`[Cron Snapshot] User ${user.id} processing error:`, err);
          errors++;
        }
      })
    );
  }

  console.log(
    `[Cron Snapshot] Completed: ${usersProcessed} users recorded, ${errors} errors for date ${todayDate}`
  );
  return { usersProcessed, errors };
}
