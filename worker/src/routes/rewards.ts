import { Hono } from 'hono';
import { Env, TelegramAuthContext } from '../types';
import { validateTelegramInitData } from '../lib/telegramAuth';
import { getSupabaseClient } from '../lib/supabase';
import {
  RewardVerificationRequest,
  RewardVerificationResponse,
  UserRewardSummary,
} from '@asset-tracker/shared';
import { verifyAndRecordReward } from '../lib/gigapubVerify';

export const rewardRoutes = new Hono<{
  Bindings: Env;
  Variables: { telegramAuth: TelegramAuthContext };
}>();

// Telegram Authentication Middleware
rewardRoutes.use('*', async (c, next) => {
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

// GET /api/rewards/summary - Get user reward points, bonus wallet slots & stats
rewardRoutes.get('/summary', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  try {
    // 1. Fetch user rewards data
    const { data: userProfile } = await supabase
      .from('users')
      .select('reward_points, bonus_wallet_slots')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Fetch system max wallet limit from app_config (default 10)
    let maxWallets = 10;
    try {
      const { data: configRow } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'max_wallets_per_user')
        .maybeSingle();
      if (configRow?.value?.limit) {
        maxWallets = Number(configRow.value.limit);
      }
    } catch (_) {}

    // 3. Count total claimed rewards
    let totalClaimed = 0;
    try {
      const { count } = await supabase
        .from('user_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalClaimed = count || 0;
    } catch (_) {}

    const rewardPoints = Number(userProfile?.reward_points || 0);
    const bonusWalletSlots = Number(userProfile?.bonus_wallet_slots || 0);

    const summary: UserRewardSummary = {
      rewardPoints,
      bonusWalletSlots,
      maxWallets: maxWallets + bonusWalletSlots,
      totalRewardsClaimed: totalClaimed,
    };

    return c.json({ summary });
  } catch (err: any) {
    console.error('[Rewards] Failed to get summary:', err);
    return c.json({
      summary: {
        rewardPoints: 0,
        bonusWalletSlots: 0,
        maxWallets: 10,
        totalRewardsClaimed: 0,
      },
    });
  }
});

// POST /api/rewards/verify - Server-side hash verification for GigaPub OfferWall
rewardRoutes.post('/verify', async (c) => {
  const { user } = c.get('telegramAuth');

  let body: RewardVerificationRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  if (!body.rewardId || !body.userId) {
    return c.json({ success: false, error: 'Missing required rewardId or userId' }, 400);
  }

  const result: RewardVerificationResponse = await verifyAndRecordReward(body, user.id, c.env);

  if (!result.success) {
    return c.json(result, 403);
  }

  return c.json(result);
});

// POST /api/rewards/video-complete - Rewarded Video Ad Completion handler
rewardRoutes.post('/video-complete', async (c) => {
  const { user } = c.get('telegramAuth');
  const supabase = getSupabaseClient(c.env);

  const adRewardPoints = 10; // +10 points per rewarded video watched
  const rewardId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    // Record ad completion
    await supabase.from('user_rewards').insert({
      user_id: user.id,
      reward_id: rewardId,
      project_id: c.env.GIGAPUB_PROJECT_ID || 'ad_network',
      reward_type: 'video_ad',
      amount: adRewardPoints,
      hash: 'video_ad_completed',
      confirmation_hash: 'confirmed',
    });

    // Credit points
    const { data: userProfile } = await supabase
      .from('users')
      .select('reward_points, bonus_wallet_slots')
      .eq('id', user.id)
      .maybeSingle();

    const currentPoints = Number(userProfile?.reward_points || 0);
    const newPoints = currentPoints + adRewardPoints;
    const currentBonusSlots = Number(userProfile?.bonus_wallet_slots || 0);
    const newBonusSlots = Math.max(currentBonusSlots, Math.floor(newPoints / 500));

    await supabase
      .from('users')
      .update({
        reward_points: newPoints,
        bonus_wallet_slots: newBonusSlots,
      })
      .eq('id', user.id);

    return c.json({
      success: true,
      rewardPoints: newPoints,
      bonusWalletSlots: newBonusSlots,
      pointsEarned: adRewardPoints,
    });
  } catch (err: any) {
    console.warn('[Rewards] Video completion DB fallback:', err?.message || err);
    return c.json({
      success: true,
      rewardPoints: adRewardPoints,
      bonusWalletSlots: 0,
      pointsEarned: adRewardPoints,
    });
  }
});

