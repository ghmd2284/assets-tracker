import {
  UserProfile,
  WatchedWallet,
  AggregatedAsset,
  PortfolioSummary,
  MutationTransaction,
  PerformanceResponse,
  RewardVerificationRequest,
  RewardVerificationResponse,
  UserRewardSummary,
} from '@asset-tracker/shared';
import { getTelegramInitData } from './telegram';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const initData = getTelegramInitData();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (initData) {
    headers.set('X-Telegram-Init-Data', initData);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error (${response.status})`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch {
      // Non-JSON response
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Syncs the current Telegram user profile with the database.
 */
export async function syncUserProfile(): Promise<UserProfile | null> {
  const initData = getTelegramInitData();
  if (!initData) {
    return null; // Local browser preview without active initData
  }

  const result = await apiFetch<{ profile: UserProfile }>('/api/me', {
    method: 'POST',
  });

  return result.profile;
}

/**
 * Fetches all tracked wallets for the authenticated user.
 */
export async function fetchWallets(): Promise<WatchedWallet[]> {
  const initData = getTelegramInitData();
  if (!initData) return [];

  const result = await apiFetch<{ wallets: WatchedWallet[] }>('/api/wallets');
  return result.wallets || [];
}

/**
 * Adds one or more addresses to track.
 */
export async function addWallets(
  addresses: string,
  label?: string
): Promise<{ ok: boolean; created: any[]; invalid: string[] }> {
  return apiFetch('/api/wallets', {
    method: 'POST',
    body: JSON.stringify({ addresses, label }),
  });
}

/**
 * Deletes a tracked wallet.
 */
export async function deleteWallet(walletId: string): Promise<boolean> {
  const result = await apiFetch<{ ok: boolean }>(`/api/wallets/${walletId}`, {
    method: 'DELETE',
  });
  return result.ok;
}

/**
 * Triggers a real-time balance re-sync across all watched addresses.
 */
export async function syncBalances(): Promise<boolean> {
  const initData = getTelegramInitData();
  if (!initData) return false;

  try {
    await apiFetch('/api/wallets/sync', {
      method: 'POST',
    });
    return true;
  } catch (err) {
    console.warn('[Sync Balances Warning]:', err);
    return false;
  }
}

/**
 * Fetches the aggregated multi-chain portfolio.
 */
export async function fetchPortfolio(): Promise<{
  summary: PortfolioSummary;
  assets: AggregatedAsset[];
}> {
  const initData = getTelegramInitData();
  if (!initData) {
    // Return empty portfolio in standalone browser preview if no backend connection
    return {
      summary: {
        totalValueUsd: 0,
        totalValueIdr: 0,
        change24hUsd: 0,
        change24hPercent: 0,
        allocation: { tonPercent: 0, evmPercent: 0, solanaPercent: 0 },
      },
      assets: [],
    };
  }

  return apiFetch('/api/wallets/portfolio');
}

/**
 * Fetches recent transactions for the user's tracked wallets.
 */
export async function fetchTransactions(limit = 10): Promise<MutationTransaction[]> {
  const initData = getTelegramInitData();
  if (!initData) return [];

  try {
    const result = await apiFetch<{ transactions: MutationTransaction[] }>(
      `/api/wallets/transactions?limit=${limit}`
    );
    return result.transactions || [];
  } catch (err) {
    console.warn('[Transactions Fetch Info] Fallback to empty list:', err);
    return [];
  }
}

/**
 * Fetches historical portfolio snapshots and deltas.
 */
export async function fetchPerformance(range = '1W'): Promise<PerformanceResponse | null> {
  const initData = getTelegramInitData();
  if (!initData) return null;

  try {
    return await apiFetch<PerformanceResponse>(`/api/wallets/performance?range=${range}`);
  } catch (err) {
    console.warn('[Performance Fetch Info] Fallback to empty:', err);
    return null;
  }
}

/**
 * Updates user preferences in the database.
 */
export async function updatePreferences(prefs: {
  currencyPref?: 'USD' | 'IDR';
  hideSpam?: boolean;
  minAlertUsd?: number;
}): Promise<boolean> {
  const initData = getTelegramInitData();
  if (!initData) return true;

  try {
    await apiFetch('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
    return true;
  } catch (err) {
    console.error('[Update Preferences Error]:', err);
    return false;
  }
}

/**
 * Verifies a GigaPub OfferWall reward claim with the server.
 */
export async function verifyRewardClaim(
  data: RewardVerificationRequest
): Promise<RewardVerificationResponse> {
  const initData = getTelegramInitData();
  if (!initData) {
    // Demo/browser preview fallback: return incoming hash as confirmationHash
    return {
      success: true,
      confirmationHash: data.hash,
      rewardPoints: data.amount,
      bonusWalletSlots: 1,
    };
  }

  try {
    return await apiFetch<RewardVerificationResponse>('/api/rewards/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    console.warn('[Rewards Verify Warning]:', err);
    return {
      success: false,
      error: err.message || 'Reward verification failed',
    };
  }
}

/**
 * Records completion of a GigaPub Rewarded Video Ad and credits user perks.
 */
export async function recordVideoAdCompleted(): Promise<{
  success: boolean;
  rewardPoints: number;
  bonusWalletSlots: number;
  pointsEarned: number;
}> {
  const initData = getTelegramInitData();
  if (!initData) {
    return {
      success: true,
      rewardPoints: 10,
      bonusWalletSlots: 0,
      pointsEarned: 10,
    };
  }

  try {
    return await apiFetch('/api/rewards/video-complete', {
      method: 'POST',
    });
  } catch (err: any) {
    console.warn('[Video Ad Complete Warning]:', err);
    return {
      success: true,
      rewardPoints: 10,
      bonusWalletSlots: 0,
      pointsEarned: 10,
    };
  }
}

/**
 * Fetches user's current reward points and bonus wallet slots.
 */
export async function fetchRewardsSummary(): Promise<UserRewardSummary> {
  const initData = getTelegramInitData();
  if (!initData) {
    return {
      rewardPoints: 0,
      bonusWalletSlots: 0,
      maxWallets: 10,
      totalRewardsClaimed: 0,
    };
  }

  try {
    const res = await apiFetch<{ summary: UserRewardSummary }>('/api/rewards/summary');
    return res.summary;
  } catch (err) {
    console.warn('[Rewards Summary Warning]:', err);
    return {
      rewardPoints: 0,
      bonusWalletSlots: 0,
      maxWallets: 10,
      totalRewardsClaimed: 0,
    };
  }
}

