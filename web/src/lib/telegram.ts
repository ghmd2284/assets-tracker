// Declare Telegram WebApp types on window
declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export interface TelegramUserState {
  id?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  isDark: boolean;
  isAvailable: boolean;
}

/**
 * Initializes the Telegram Mini App environment, expands the viewport,
 * locks vertical swipe gestures, and applies the active color scheme.
 */
export function initTelegram(): TelegramUserState {
  const tg = window.Telegram?.WebApp;

  if (!tg) {
    console.warn('[Telegram SDK] WebApp not found. Running in browser preview mode.');
    // Check system preference for dark mode in browser
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    syncTheme(prefersDark);
    return {
      isDark: prefersDark,
      isAvailable: false,
    };
  }

  try {
    tg.ready();
    tg.expand();

    // Prevent accidental dismiss on vertical scroll
    if (tg.isVerticalSwipesEnabled !== undefined) {
      tg.disableVerticalSwipes?.();
    }

    const isDark = tg.colorScheme === 'dark' || tg.themeParams?.is_dark === true;
    syncTheme(isDark);

    // Listen for theme changes from Telegram client
    tg.onEvent?.('themeChanged', () => {
      const darkNow = tg.colorScheme === 'dark' || tg.themeParams?.is_dark === true;
      syncTheme(darkNow);
    });

    const user = tg.initDataUnsafe?.user;

    return {
      id: user?.id,
      firstName: user?.first_name,
      lastName: user?.last_name,
      username: user?.username,
      isDark,
      isAvailable: true,
    };
  } catch (err) {
    console.error('[Telegram SDK] Initialization error:', err);
    return {
      isDark: false,
      isAvailable: false,
    };
  }
}

/**
 * Synchronizes HTML root element dark theme attributes.
 */
export function syncTheme(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
  }
}

/**
 * Retrieves the raw initData string to pass to the Cloudflare Worker API.
 */
export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

/**
 * Safe Telegram Haptics triggers
 */
export const haptics = {
  impact: (style: 'light' | 'medium' | 'heavy' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
  },
  notification: (type: 'success' | 'warning' | 'error' = 'success') => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(type);
  },
  selection: () => {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  },
};
