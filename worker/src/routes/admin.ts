import { Hono } from 'hono';
import { Env, TelegramAuthContext } from '../types';
import { validateTelegramInitData } from '../lib/telegramAuth';
import { getSupabaseClient } from '../lib/supabase';
import { sendTelegramNotification } from '../lib/telegramBot';

export const adminRoutes = new Hono<{
  Bindings: Env;
  Variables: { telegramAuth: TelegramAuthContext };
}>();

/**
 * Admin Authentication Middleware:
 * Validates Telegram initData and verifies user ID against ADMIN_TELEGRAM_IDS.
 */
adminRoutes.use('*', async (c, next) => {
  const initData = c.req.header('X-Telegram-Init-Data');
  if (!initData) {
    return c.json({ error: 'Unauthorized: Missing X-Telegram-Init-Data' }, 401);
  }

  const { valid, context, error } = await validateTelegramInitData(
    initData,
    c.env.TELEGRAM_BOT_TOKEN
  );

  if (!valid || !context) {
    return c.json({ error: `Unauthorized: ${error}` }, 401);
  }

  const adminIds = (c.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const userIdStr = context.user.id.toString();

  // If ADMIN_TELEGRAM_IDS is set, enforce strict match
  if (adminIds.length > 0 && !adminIds.includes(userIdStr)) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  c.set('telegramAuth', context);
  await next();
});

// GET /api/admin/stats - Retrieve system-wide analytics
adminRoutes.get('/stats', async (c) => {
  const supabase = getSupabaseClient(c.env);

  const [
    { count: totalUsers },
    { count: totalWatchedAddresses },
    { count: totalTransactions },
    { data: maintenanceConfig },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('watched_addresses').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('app_config').select('value').eq('key', 'maintenance_mode').maybeSingle(),
  ]);

  return c.json({
    totalUsers: totalUsers || 0,
    totalWatchedAddresses: totalWatchedAddresses || 0,
    totalTransactions: totalTransactions || 0,
    maintenanceMode: maintenanceConfig?.value || { enabled: false, message: '' },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/admin/maintenance - Toggle system maintenance killswitch
adminRoutes.post('/maintenance', async (c) => {
  const supabase = getSupabaseClient(c.env);
  const body = await c.req.json<{ enabled: boolean; message?: string }>();

  const configValue = {
    enabled: !!body.enabled,
    message: body.message || 'Sistem sedang dalam pemeliharaan berkala.',
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('app_config')
    .upsert(
      {
        key: 'maintenance_mode',
        value: configValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

  if (error) {
    return c.json({ error: 'Failed to update maintenance configuration' }, 500);
  }

  return c.json({ ok: true, maintenanceMode: configValue });
});

// POST /api/admin/broadcast - Send announcement to active bot users (rate-limited <= 25 msg/s)
adminRoutes.post('/broadcast', async (c) => {
  const supabase = getSupabaseClient(c.env);
  const { message, previewOnly } = await c.req.json<{
    message: string;
    previewOnly?: boolean;
  }>();

  if (!message || message.trim().length === 0) {
    return c.json({ error: 'Message cannot be empty' }, 400);
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .eq('is_banned', false);

  if (error || !users) {
    return c.json({ error: 'Failed to retrieve recipients' }, 500);
  }

  if (previewOnly) {
    return c.json({
      ok: true,
      preview: true,
      recipientCount: users.length,
      sampleText: message,
    });
  }

  let sentCount = 0;
  let failCount = 0;

  // Process in throttled batches of 20 messages with 1s pause
  const batchSize = 20;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (u) => {
        const ok = await sendTelegramNotification(
          c.env.TELEGRAM_BOT_TOKEN,
          u.id,
          message,
          c.env.MINI_APP_URL
        );
        if (ok) sentCount++;
        else failCount++;
      })
    );

    if (i + batchSize < users.length) {
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return c.json({ ok: true, sentCount, failCount, totalRecipients: users.length });
});
