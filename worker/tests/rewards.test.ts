import { describe, it, expect } from 'vitest';
import {
  sha1,
  computeIncomingHash,
  computeConfirmationHash,
  verifyAndRecordReward,
} from '../src/lib/gigapubVerify';
import { Env } from '../src/types';

describe('GigaPub Server-Side Hash Verification', () => {
  const secretKey = 'test_secret_key_12345';
  const userId = '12345678';
  const projectId = 'proj_xyz';
  const rewardId = 'rew_999';
  const amount = 500;

  it('computes valid SHA-1 hash string format', async () => {
    const hash = await sha1('hello world');
    expect(hash).toHaveLength(40);
    // standard sha1('hello world') = 2aae6c35c94fcfb415dbe95f408b9ce91ee846ed
    expect(hash).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
  });

  it('correctly calculates incoming hash according to GigaPub spec', async () => {
    // Spec: sha1("${userId}:${projectId}:${rewardId}:${amount}:${secretKey}")
    const incoming = await computeIncomingHash(userId, projectId, rewardId, amount, secretKey);
    const expected = await sha1(`${userId}:${projectId}:${rewardId}:${amount}:${secretKey}`);
    expect(incoming).toBe(expected);
    expect(incoming).toHaveLength(40);
  });

  it('correctly calculates confirmation hash according to GigaPub spec', async () => {
    // Spec: sha1("${userId}:${projectId}:${rewardId}:${amount}:confirm:${secretKey}")
    const confirmation = await computeConfirmationHash(userId, projectId, rewardId, amount, secretKey);
    const expected = await sha1(`${userId}:${projectId}:${rewardId}:${amount}:confirm:${secretKey}`);
    expect(confirmation).toBe(expected);
    expect(confirmation).toHaveLength(40);
    expect(confirmation).not.toBe(await computeIncomingHash(userId, projectId, rewardId, amount, secretKey));
  });

  it('rejects reward claim if Telegram user does not match claimant userId', async () => {
    const mockEnv: Env = {
      ENVIRONMENT: 'test',
      MINI_APP_URL: '',
      TELEGRAM_BOT_TOKEN: 'test',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test',
      GIGAPUB_SECRET_KEY: secretKey,
    };

    const incomingHash = await computeIncomingHash(userId, projectId, rewardId, amount, secretKey);

    const result = await verifyAndRecordReward(
      {
        userId,
        projectId,
        rewardId,
        amount,
        hash: incomingHash,
      },
      88888888, // different Telegram user
      mockEnv
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('User ID mismatch');
  });

  it('rejects claim with forged/invalid hash signature', async () => {
    const mockEnv: Env = {
      ENVIRONMENT: 'test',
      MINI_APP_URL: '',
      TELEGRAM_BOT_TOKEN: 'test',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test',
      GIGAPUB_SECRET_KEY: secretKey,
    };

    const result = await verifyAndRecordReward(
      {
        userId,
        projectId,
        rewardId,
        amount,
        hash: 'invalid_forged_hash_abc123',
      },
      Number(userId),
      mockEnv
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid hash signature');
  });
});

