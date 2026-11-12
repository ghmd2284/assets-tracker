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

// Default GigaPub Project ID:
// 1. LocalStorage override (configured by user/admin in-app)
// 2. Environment variable VITE_GIGAPUB_PROJECT_ID
// 3. User's registered GigaPub Project ID: "9093"
export function getGigaPubProjectId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('gigapub_project_id');
    if (saved && saved.trim()) return saved.trim();
  }
  const envId = (import.meta.env.VITE_GIGAPUB_PROJECT_ID as string)?.trim();
  if (envId && envId !== 'asset-tracker') return envId;
  return '9093';
}

export function setGigaPubProjectId(newId: string): void {
  if (typeof window !== 'undefined') {
    const clean = newId.trim();
    if (clean) {
      localStorage.setItem('gigapub_project_id', clean);
    } else {
      localStorage.removeItem('gigapub_project_id');
    }
    // Reset instance so next call initializes with new project ID
    sdkInstance = null;
    injectGigaScripts(clean || getGigaPubProjectId(), true);
  }
}

/**
 * Injects GigaPub scripts asynchronously without blocking initial render.
 * Includes enhanced failover for Rewarded Video Ads across primary & backup CDNs.
 */
export function injectGigaScripts(projectId: string = getGigaPubProjectId(), forceReload = false) {
  if (typeof document === 'undefined') return;

  const encodedId = encodeURIComponent(projectId);

  // 1. OfferWall SDK Loader
  const existingWallScript = document.getElementById('gigapub-offerwall-script') as HTMLScriptElement | null;
  const expectedWallSrc = `https://wall.giga.pub/api/v1/loader.js?projectId=${encodedId}`;

  if (!existingWallScript) {
    const wallScript = document.createElement('script');
    wallScript.id = 'gigapub-offerwall-script';
    wallScript.src = expectedWallSrc;
    wallScript.async = true;
    document.head.appendChild(wallScript);
  } else if (forceReload && !existingWallScript.src.includes(`projectId=${encodedId}`)) {
    existingWallScript.src = expectedWallSrc;
  }

  // 2. Rewarded Video Ads Enhanced Loader with Automatic Backup CDNs
  const existingAdScript = document.getElementById('gigapub-ads-script') as HTMLScriptElement | null;
  const expectedAdSrc = `https://ad.gigapub.tech/script?id=${encodedId}`;

  if (!existingAdScript) {
    const domains = ['https://ad.gigapub.tech', 'https://ru-ad.gigapub.tech'];
    let domainIndex = 0;
    let timer: any;

    const loadAdScript = () => {
      const adScript = document.createElement('script');
      adScript.id = 'gigapub-ads-script';
      adScript.async = true;
      adScript.src = `${domains[domainIndex]}/script?id=${encodedId}`;

      clearTimeout(timer);
      timer = setTimeout(() => {
        adScript.onload = null;
        adScript.onerror = null;
        adScript.remove();
        domainIndex++;
        if (domainIndex < domains.length) {
          loadAdScript();
        }
      }, 10000);

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
  } else if (forceReload && !existingAdScript.src.includes(`id=${encodedId}`)) {
    existingAdScript.src = expectedAdSrc;
  }
}

/**
 * Waits for window.showGiga to be available with timeout.
 */
async function waitForShowGiga(timeoutMs = 3500): Promise<boolean> {
  if (typeof window.showGiga === 'function') return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
    if (typeof window.showGiga === 'function') return true;
  }
  return typeof window.showGiga === 'function';
}

/**
 * Initializes GigaPub OfferWall & Rewarded Video SDK.
 * Registers event listeners for claim verification with server and auto-confirms.
 */
export async function initGigaPub(
  projectId: string = getGigaPubProjectId(),
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
      }, 150);
    });
  }

  isInitializing = true;
  injectGigaScripts(projectId);

  const setupSdk = async (sdk: OfferWallSDK) => {
    sdkInstance = sdk;
    window.gigaOfferWallSDK = sdk;
    isInitializing = false;

    // Listen for reward claims from OfferWall
    sdk.on('rewardClaim', async (data: GigaPubRewardClaim) => {
      console.log('[GigaPub OfferWall] Reward claim event received:', data);

      try {
        const result = await verifyRewardClaim({
          rewardId: data.rewardId,
          userId: data.userId,
          projectId: data.projectId,
          amount: data.amount,
          hash: data.hash,
        });

        if (result.success && result.confirmationHash) {
          await sdk.confirmReward(data.rewardId, result.confirmationHash);
          haptics.notification('success');

          if (onRewardClaimed) {
            onRewardClaimed(data);
          }
        }
      } catch (err) {
        console.error('[GigaPub] Verification failed:', err);
      }
    });

    // Check and recover pending rewards
    checkPendingOfferWallRewards();
    return sdk;
  };

  // Immediate check: if window.loadOfferWallSDK is already loaded
  if (typeof window.loadOfferWallSDK === 'function') {
    try {
      const sdk = await window.loadOfferWallSDK({ projectId });
      return setupSdk(sdk);
    } catch (err) {
      console.warn('[GigaPub] Direct loadOfferWallSDK warning:', err);
    }
  }

  return new Promise<OfferWallSDK | null>((resolve) => {
    (window.loadGigaSDKCallbacks || (window.loadGigaSDKCallbacks = [])).push(() => {
      if (typeof window.loadOfferWallSDK !== 'function') {
        isInitializing = false;
        resolve(null);
        return;
      }

      window
        .loadOfferWallSDK({ projectId })
        .then(async (sdk) => {
          const readySdk = await setupSdk(sdk);
          resolve(readySdk);
        })
        .catch((err) => {
          console.warn('[GigaPub OfferWall] Init error:', err);
          isInitializing = false;
          resolve(null);
        });
    });

    // Timeout safety
    setTimeout(() => {
      if (!sdkInstance && isInitializing) {
        isInitializing = false;
        resolve(null);
      }
    }, 6000);
  });
}

/**
 * Checks whether any tasks/offers are available in the OfferWall.
 */
export function hasOfferWallOffers(): boolean {
  const sdk = sdkInstance || window.gigaOfferWallSDK;
  if (sdk && typeof sdk.hasOffers === 'function') {
    try {
      return sdk.hasOffers();
    } catch {
      return true;
    }
  }
  return true;
}

/**
 * Opens the GigaPub OfferWall modal/iframe.
 */
export function openOfferWall(): boolean {
  const sdk = sdkInstance || window.gigaOfferWallSDK;

  if (sdk && typeof sdk.open === 'function') {
    haptics.impact('medium');
    sdk.open();
    return true;
  }

  // Attempt lazy initialization if not ready yet
  console.info('[GigaPub] OfferWall SDK not ready yet, loading...');
  initGigaPub().then((readySdk) => {
    if (readySdk && typeof readySdk.open === 'function') {
      haptics.impact('medium');
      readySdk.open();
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
    console.warn('[GigaPub] Pending rewards check error:', err);
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
 * Plays a GigaPub Rewarded Video Ad.
 * Waits for the ad player, displays the real ad, and records completion on success.
 */
export async function showGigaRewardedAd(): Promise<{
  success: boolean;
  simulated?: boolean;
  error?: string;
}> {
  haptics.impact('medium');

  // 1. Wait for live GigaPub ad function
  const isReady = await waitForShowGiga(3500);

  if (isReady && typeof window.showGiga === 'function') {
    try {
      console.log('[GigaPub Ad] Launching window.showGiga()...');
      await window.showGiga();
      // On completed video, credit server
      await recordVideoAdCompleted();
      haptics.notification('success');
      return { success: true, simulated: false };
    } catch (err: any) {
      console.warn('[GigaPub Ad] User dismissed or error:', err);
      return {
        success: false,
        error: err?.message || 'Iklan ditutup sebelum selesai.',
      };
    }
  }

  // 2. If ad script could not be loaded (e.g. adblocker or network error)
  console.warn('[GigaPub Ad] window.showGiga not available after timeout');
  return {
    success: false,
    error: 'Iklan GigaPub belum siap atau diblokir adblocker. Pastikan koneksi internet aktif.',
  };
}
