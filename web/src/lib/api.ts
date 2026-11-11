import { UserProfile } from '@asset-tracker/shared';
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
 * Syncs the current Telegram user profile with the Cloudflare Worker database.
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
