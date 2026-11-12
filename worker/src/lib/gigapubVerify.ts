import { Env } from '../types';
import { getSupabaseClient } from './supabase';
import { RewardVerificationRequest, RewardVerificationResponse } from '@asset-tracker/shared';

/**
 * Computes SHA-1 hash using WebCrypto (standard in Cloudflare Workers and browsers).
 */
export async function sha1(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes expected incoming hash for a GigaPub reward claim:
 * sha1("${userId}:${projectId}:${rewardId}:${amount}:${secretKey}")
 */
export async function computeIncomingHash(
  userId: string | number,
  projectId: string | number,
  rewardId: string | number,
  amount: number,
  secretKey: string
): Promise<string> {
  return sha1(`${userId}:${projectId}:${rewardId}:${amount}:${secretKey}`);
}

/**
 * Computes confirmation hash for GigaPub SDK:
 * sha1("${userId}:${projectId}:${rewardId}:${amount}:confirm:${secretKey}")
 */
export async function computeConfirmationHash(
  userId: string | number,
  projectId: string | number,
  rewardId: string | number,
  amount: number,
  secretKey: string
): Promise<string> {
  return sha1(`${userId}:${projectId}:${rewardId}:${amount}:confirm:${secretKey}`);
}

/**
 * Verifies a GigaPub reward claim with server-side validation and records it idempotently.
 */
export async function verifyAndRecordReward(
  req: RewardVerificationRequest,
  authUserId: number,
  env: Env
): Promise<RewardVerificationResponse> {
  const { rewardId, userId, projectId, amount, hash } = req;

  // 1. Authenticated user integrity check: user cannot claim rewards for other Telegram IDs
  if (String(userId) !== String(authUserId)) {
    return {
      success: false,
      error: 'User ID mismatch with authenticated session',
    };
  }

  const secretKey = env.GIGAPUB_SECRET_KEY;

  // 2. Cryptographic SHA-1 validation (if secret key configured)
  let confirmationHash = hash; // fallback to incoming hash in simplified/default mode
  if (secretKey) {
    const expectedHash = await computeIncomingHash(userId, projectId, rewardId, amount, secretKey);
    if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
      return {
        success: false,
        error: 'Invalid hash signature',
      };
    }
    confirmationHash = await computeConfirmationHash(userId, projectId, rewardId, amount, secretKey);
  }

  // 3. Supabase Idempotency & Reward Crediting
  const supabase = getSupabaseClient(env);
  const numericAmount = Number(amount) || 0;

  try {
    // Check if reward was already claimed
    const { data: existingClaim, error: fetchErr } = await supabase
      .from('user_rewards')
      .select('id, confirmation_hash')
      .eq('user_id', authUserId)
      .eq('reward_id', String(rewardId))
      .maybeSingle();

    if (!fetchErr && existingClaim) {
      return {
        success: true,
        confirmationHash: existingClaim.confirmation_hash || confirmationHash,
        alreadyClaimed: true,
      };
    }

    // Insert new reward claim record
    await supabase.from('user_rewards').insert({
      user_id: authUserId,
      reward_id: String(rewardId),
      project_id: String(projectId),
      reward_type: 'offerwall',
      amount: numericAmount,
      hash,
      confirmation_hash: confirmationHash,
    });

    // Credit user's reward points and bonus wallet slots (1 bonus slot every 500 reward points)
    const { data: userProfile } = await supabase
      .from('users')
      .select('reward_points, bonus_wallet_slots')
      .eq('id', authUserId)
      .maybeSingle();

    const currentPoints = Number(userProfile?.reward_points || 0);
    const newPoints = currentPoints + numericAmount;
    const currentBonusSlots = Number(userProfile?.bonus_wallet_slots || 0);
    // Every 500 points awards +1 bonus wallet slot
    const newBonusSlots = Math.max(currentBonusSlots, Math.floor(newPoints / 500));

    await supabase
      .from('users')
      .update({
        reward_points: newPoints,
        bonus_wallet_slots: newBonusSlots,
      })
      .eq('id', authUserId);

    return {
      success: true,
      confirmationHash,
      rewardPoints: newPoints,
      bonusWalletSlots: newBonusSlots,
    };
  } catch (err: any) {
    console.warn('[GigaPub] Database logging error (table may not exist yet):', err?.message || err);
    // Even if Supabase table is not yet migrated, return the valid cryptographic confirmationHash
    // so GigaPub OfferWall user doesn't get blocked!
    return {
      success: true,
      confirmationHash,
      rewardPoints: numericAmount,
      bonusWalletSlots: 0,
    };
  }
}
