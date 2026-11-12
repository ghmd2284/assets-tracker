import {
  GigaPubOfferItem,
  GigaPubRewardClaim,
  GigaPubRewardItem,
} from '@asset-tracker/shared';
import { verifyRewardClaim, recordVideoAdCompleted } from './api';
import { haptics } from './telegram';

export interface OfferWallSDK {
  open: () => void;
  close: () => void;
  confirmReward: (rewardId: string | number, hash: string) => Promise<boolean>;
  hasOffers: () => boolean;
  getOffers: () => Promise<{ available: GigaPubOfferItem[]; active: GigaPubOfferItem[] }>;
  openOffer: (offerId: string | number) => void;
  getRewards: () => Promise<GigaPubRewardItem[]>;
  claimReward: (rewardId: string | number) => Promise<any>;
  pending: () => Promise<GigaPubRewardClaim[]>;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    loadOfferWallSDK?: (config: { projectId: string }) => Promise<OfferWallSDK>;
    loadGigaSDKCallbacks?: Array<() => void>;
    gigaOfferWallSDK?: OfferWallSDK;
    showGiga?: () => Promise<void>;
    AdGigaFallback?: () => Promise<void>;
  }
}

// Global cached SDK reference
let sdkInstance: OfferWallSDK | null = null;
let isInitializing = false;
let scriptsInjected = false;

// Default GigaPub Project ID (from env or default public project)
export const GIGAPUB_PROJECT_ID =
  (import.meta.env.VITE_GIGAPUB_PROJECT_ID as string) || 'asset-tracker';

/**
 * Injects GigaPub scripts asynchronously without blocking initial render.
 * Includes enhanced failover for Rewarded Video Ads across primary & backup CDNs.
 */
function injectGigaScripts(projectId: string) {
  if (scriptsInjected || typeof document === 'undefined') return;
  scriptsInjected = true;

  // 1. OfferWall SDK Loader
  if (!window.loadOfferWallSDK && !document.getElementById('gigapub-offerwall-script')) {
    const wallScript = document.createElement('script');
    wallScript.id = 'gigapub-offerwall-script';
    wallScript.src = `https://wall.giga.pub/api/v1/loader.js?projectId=${encodeURIComponent(projectId)}`;
    wallScript.async = true;
    document.head.appendChild(wallScript);
  }

  // 2. Rewarded Video Ads Enhanced Loader with Automatic Backup CDNs
  if (!document.getElementById('gigapub-ads-script')) {
    const domains = ['https://ad.gigapub.tech', 'https://ru-ad.gigapub.tech'];
    let domainIndex = 0;
    let timer: any;

    const loadAdScript = () => {
      const adScript = document.createElement('script');
      adScript.id = 'gigapub-ads-script';
      adScript.async = true;
      adScript.src = `${domains[domainIndex]}/script?id=${encodeURIComponent(projectId)}`;

      clearTimeout(timer);
      timer = setTimeout(() => {
        adScript.onload = null;
        adScript.onerror = null;
        adScript.remove();
        domainIndex++;
        if (domainIndex < domains.length) {
          loadAdScript();
        }
      }, 12000);

      adScript.onload = () => clearTimeout(timer);
      adScript.onerror = () => {
        clearTimeout(timer);
        adScript.remove();
        domainIndex++;
        if (domainIndex < domains.length) {
          loadAdScript();
        }
      };

      document.head.appendChild(adScript);
    };

    loadAdScript();
  }
}

/**
 * Initializes GigaPub OfferWall & Rewarded Video SDK.
 * Registers event listeners for claim verification with server and auto-confirms.
 */
export async function initGigaPub(
  projectId: string = GIGAPUB_PROJECT_ID,
  onRewardClaimed?: (claim: GigaPubRewardClaim) => void
): Promise<OfferWallSDK | null> {
  if (typeof window === 'undefined') return null;

  if (sdkInstance) {
    return sdkInstance;
  }

  if (isInitializing) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (sdkInstance) {
          clearInterval(checkInterval);
          resolve(sdkInstance);
        }
      }, 200);
    });
  }

  isInitializing = true;
  injectGigaScripts(projectId);

  return new Promise<OfferWallSDK | null>((resolve) => {
    // OfferWall SDK safe callback registration
    (window.loadGigaSDKCallbacks || (window.loadGigaSDKCallbacks = [])).push(() => {
      if (typeof window.loadOfferWallSDK !== 'function') {
        console.warn('[GigaPub] loadOfferWallSDK function not available');
        isInitializing = false;
        resolve(null);
        return;
      }

      window
        .loadOfferWallSDK({ projectId })
        .then((sdk) => {
          sdkInstance = sdk;
          window.gigaOfferWallSDK = sdk;
          isInitializing = false;

          // Event: Reward Claim received from user completing tasks in OfferWall
          sdk.on('rewardClaim', async (data: GigaPubRewardClaim) => {
            console.log('[GigaPub OfferWall] Reward claim event received:', data);

            try {
              // 1. Verify with backend Cloudflare Worker
              const result = await verifyRewardClaim({
                rewardId: data.rewardId,
                userId: data.userId,
                projectId: data.projectId,
                amount: data.amount,
                hash: data.hash,
              });

              if (result.success && result.confirmationHash) {
                // 2. Cryptographically confirm reward with GigaPub SDK
                await sdk.confirmReward(data.rewardId, result.confirmationHash);
                haptics.notification('success');

                if (onRewardClaimed) {
                  onRewardClaimed(data);
                }
              }
            } catch (err) {
              console.error('[GigaPub] Failed to verify and confirm reward claim:', err);
            }
          });

          // Check and recover pending rewards from interrupted sessions
          checkPendingOfferWallRewards();

          resolve(sdk);
        })
        .catch((err) => {
          console.warn('[GigaPub OfferWall] Init warning (will run in fallback mode):', err);
          isInitializing = false;
          resolve(null);
        });
    });

    // Safety timeout in case of ad blockers or offline network
    setTimeout(() => {
      if (!sdkInstance && isInitializing) {
        console.info('[GigaPub] SDK script load timed out or blocked (offline/preview fallback)');
        isInitializing = false;
        resolve(null);
      }
    }, 8000);
  });
}

/**
 * Checks whether any tasks/offers are available in the OfferWall.
 */
export function hasOfferWallOffers(): boolean {
  if (sdkInstance && typeof sdkInstance.hasOffers === 'function') {
    try {
      return sdkInstance.hasOffers();
    } catch {
      return false;
    }
  }
  return true; // Optimistic default so button is visible
}

/**
 * Opens the GigaPub OfferWall modal/iframe.
 */
export function openOfferWall(): boolean {
  if (sdkInstance && typeof sdkInstance.open === 'function') {
    haptics.impact('medium');
    sdkInstance.open();
    return true;
  }

  if (window.gigaOfferWallSDK && typeof window.gigaOfferWallSDK.open === 'function') {
    haptics.impact('medium');
    window.gigaOfferWallSDK.open();
    return true;
  }

  console.info('[GigaPub] OfferWall SDK not ready yet, attempting lazy initialization...');
  initGigaPub().then((sdk) => {
    if (sdk) {
      haptics.impact('medium');
      sdk.open();
    }
  });

  return false;
}

/**
 * Checks and auto-processes pending/interrupted rewards from previous sessions.
 */
export async function checkPendingOfferWallRewards(): Promise<number> {
  const sdk = sdkInstance || window.gigaOfferWallSDK;
  if (!sdk || typeof sdk.pending !== 'function') return 0;

  try {
    const pendingRewards = await sdk.pending();
    if (!pendingRewards || pendingRewards.length === 0) return 0;

    console.log(`[GigaPub] Found ${pendingRewards.length} pending reward(s) to recover`);

    let recovered = 0;
    for (const reward of pendingRewards) {
      try {
        const verifyRes = await verifyRewardClaim({
          rewardId: reward.rewardId,
          userId: reward.userId,
          projectId: reward.projectId,
          amount: reward.amount,
          hash: reward.hash,
        });

        if (verifyRes.success && verifyRes.confirmationHash) {
          await sdk.confirmReward(reward.rewardId, verifyRes.confirmationHash);
          recovered++;
        }
      } catch (err) {
        console.error('[GigaPub] Error processing pending reward:', err);
      }
    }

    if (recovered > 0) {
      haptics.notification('success');
    }

    return recovered;
  } catch (err) {
    console.warn('[GigaPub] Pending rewards check skipped:', err);
    return 0;
  }
}

/**
 * Fetches available and active offers to preview in custom Japandi UI.
 */
export async function getOfferWallOffers(): Promise<{
  available: GigaPubOfferItem[];
  active: GigaPubOfferItem[];
}> {
  const sdk = sdkInstance || window.gigaOfferWallSDK;
  if (!sdk || typeof sdk.getOffers !== 'function') {
    return { available: [], active: [] };
  }

  try {
    return await sdk.getOffers();
  } catch (err) {
    console.warn('[GigaPub] getOffers error:', err);
    return { available: [], active: [] };
  }
}

/**
 * Plays a GigaPub Rewarded Video Ad with automatic fallback.
 * Grants rewards on completion (+10 Pts & Fast Sync trigger).
 */
export async function showGigaRewardedAd(): Promise<{
  success: boolean;
  simulated?: boolean;
  error?: string;
}> {
  haptics.impact('medium');

  // Check if live GigaPub ad function is available
  if (typeof window.showGiga === 'function') {
    try {
      await window.showGiga();
      // On successful ad view, credit server
      await recordVideoAdCompleted();
      haptics.notification('success');
      return { success: true, simulated: false };
    } catch (err: any) {
      console.warn('[GigaPub Ad] Video dismissed or error:', err);
      return { success: false, error: err?.message || 'Ad skipped or closed early' };
    }
  }

  // Fallback simulator for preview / local development or ad blockers
  console.info('[GigaPub Ad] showGiga not loaded, running simulation fallback');
  try {
    await new Promise((res) => setTimeout(res, 1500));
    await recordVideoAdCompleted();
    haptics.notification('success');
    return { success: true, simulated: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
