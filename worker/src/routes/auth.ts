import { Hono } from 'hono';
import { Env, TelegramAuthContext } from '../types';
import { validateTelegramInitData } from '../lib/telegramAuth';
import { getSupabaseClient } from '../lib/supabase';
import { UserProfile } from '@asset-tracker/shared';

export const authRoutes = new Hono<{
  Bindings: Env;
  Variables: { telegramAuth: TelegramAuthContext };
}>();

// Telegram initData Authentication Middleware
authRoutes.use('*', async (c, next) => {
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

// GET /api/me - Retrieve current authenticated user profile
authRoutes.get('/me', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return c.json({ error: 'User not found' }, 404);
  }

  const profile: UserProfile = {
    id: data.id,
    username: data.username,
    firstName: data.first_name,
    currencyPref: data.currency_pref,
    minAlertUsd: Number(data.min_alert_usd),
    hideSpam: data.hide_spam,
    isBanned: data.is_banned,
    createdAt: data.created_at,
  };

  return c.json({ profile });
});

// POST /api/me - Upsert profile when opening Mini App
authRoutes.post('/me', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        username: user.username || null,
        first_name: user.first_name || null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    return c.json({ error: `Database error: ${error.message}` }, 500);
  }

  const profile: UserProfile = {
    id: data.id,
    username: data.username,
    firstName: data.first_name,
    currencyPref: data.currency_pref,
    minAlertUsd: Number(data.min_alert_usd),
    hideSpam: data.hide_spam,
    isBanned: data.is_banned,
    createdAt: data.created_at,
  };

  return c.json({ profile });
});

// PATCH /api/preferences - Update user preferences
authRoutes.patch('/preferences', async (c) => {
  const { user } = c.get('telegramAuth');
  const body = await c.req.json<{
    currencyPref?: 'USD' | 'IDR';
    hideSpam?: boolean;
    minAlertUsd?: number;
  }>();

  const supabase = getSupabaseClient(c.env);

  const updates: Record<string, any> = {};
  if (body.currencyPref && (body.currencyPref === 'USD' || body.currencyPref === 'IDR')) {
    updates.currency_pref = body.currencyPref;
  }
  if (typeof body.hideSpam === 'boolean') {
    updates.hide_spam = body.hideSpam;
  }
  if (typeof body.minAlertUsd === 'number' && body.minAlertUsd >= 0) {
    updates.min_alert_usd = body.minAlertUsd;
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No valid preferences to update' }, 400);
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error || !data) {
    return c.json({ error: 'Failed to update preferences' }, 500);
  }

  const profile: UserProfile = {
    id: data.id,
    username: data.username,
    firstName: data.first_name,
    currencyPref: data.currency_pref,
    minAlertUsd: Number(data.min_alert_usd),
    hideSpam: data.hide_spam,
    isBanned: data.is_banned,
    createdAt: data.created_at,
  };

  return c.json({ ok: true, profile });
});

