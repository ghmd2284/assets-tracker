import { TelegramUser, TelegramAuthContext } from '../types';

/**
 * Validates Telegram Mini App initData cryptographic HMAC-SHA256 signature using standard WebCrypto.
 * @param initData The raw URL-encoded initData string sent from TMA
 * @param botToken The bot token from @BotFather
 * @param maxAgeSeconds Maximum allowed age for auth_date (default 86400 = 24 hours)
 */
export async function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): Promise<{ valid: boolean; context?: TelegramAuthContext; error?: string }> {
  if (!initData || !botToken) {
    return { valid: false, error: 'Missing initData or botToken' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return { valid: false, error: 'Missing hash parameter' };
    }

    // Collect all parameters except 'hash' and sort alphabetically
    const dataCheckArr: string[] = [];
    params.forEach((val, key) => {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${val}`);
      }
    });

    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // 1. Secret key = HMAC_SHA256(key = "WebAppData", data = botToken)
    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const secretKeyBytes = await crypto.subtle.sign(
      'HMAC',
      webAppDataKey,
      encoder.encode(botToken)
    );

    // 2. Data key = secretKeyBytes
    const dataKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // 3. Calculated hash = HMAC_SHA256(key = dataKey, data = dataCheckString)
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      dataKey,
      encoder.encode(dataCheckString)
    );

    // Convert signature to hex string
    const hashArray = Array.from(new Uint8Array(signatureBytes));
    const calculatedHash = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    // 4. Verify auth_date expiration
    const authDateStr = params.get('auth_date');
    if (!authDateStr) {
      return { valid: false, error: 'Missing auth_date' };
    }

    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);

    if (isNaN(authDate) || now - authDate > maxAgeSeconds) {
      return { valid: false, error: 'auth_date has expired (> 24 hours)' };
    }

    // 5. Parse user data
    const userStr = params.get('user');
    if (!userStr) {
      return { valid: false, error: 'Missing user parameter' };
    }

    const user = JSON.parse(userStr) as TelegramUser;
    if (!user || !user.id) {
      return { valid: false, error: 'Invalid user payload' };
    }

    return {
      valid: true,
      context: {
        user,
        authDate,
      },
    };
  } catch (err: any) {
    return { valid: false, error: `Parsing failed: ${err.message}` };
  }
}
