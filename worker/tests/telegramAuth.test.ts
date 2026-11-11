import { describe, it, expect } from 'vitest';
import { validateTelegramInitData } from '../src/lib/telegramAuth';

async function createValidInitData(
  params: Record<string, string>,
  botToken: string
): Promise<string> {
  const dataCheckArr: string[] = [];
  const entries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));

  for (const [key, val] of entries) {
    dataCheckArr.push(`${key}=${val}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

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

  const dataKey = await crypto.subtle.importKey(
    'raw',
    secretKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    dataKey,
    encoder.encode(dataCheckString)
  );

  const hash = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const searchParams = new URLSearchParams(params);
  searchParams.set('hash', hash);
  return searchParams.toString();
}

describe('Telegram initData WebCrypto Authentication', () => {
  const mockBotToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

  it('validates authentic initData correctly', async () => {
    const now = Math.floor(Date.now() / 1000);
    const userPayload = JSON.stringify({
      id: 99887766,
      first_name: 'Ghomi',
      username: 'ghomi_user',
    });

    const initData = await createValidInitData(
      {
        auth_date: now.toString(),
        query_id: 'AAHdF60gAAAAAN0XrSAz3k4Z',
        user: userPayload,
      },
      mockBotToken
    );

    const result = await validateTelegramInitData(initData, mockBotToken);
    expect(result.valid).toBe(true);
    expect(result.context?.user.id).toBe(99887766);
    expect(result.context?.user.first_name).toBe('Ghomi');
    expect(result.context?.user.username).toBe('ghomi_user');
  });

  it('rejects tampered or invalid hash', async () => {
    const now = Math.floor(Date.now() / 1000);
    const userPayload = JSON.stringify({ id: 99887766, first_name: 'Ghomi' });

    const validInitData = await createValidInitData(
      {
        auth_date: now.toString(),
        user: userPayload,
      },
      mockBotToken
    );

    // Tamper the hash
    const tamperedInitData = validInitData.replace(/hash=[0-9a-f]+/, 'hash=deadbeef001122');
    const result = await validateTelegramInitData(tamperedInitData, mockBotToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid HMAC signature');
  });

  it('rejects expired auth_date (> 24 hours)', async () => {
    // 25 hours ago
    const expiredTime = Math.floor(Date.now() / 1000) - 25 * 3600;
    const userPayload = JSON.stringify({ id: 99887766, first_name: 'Ghomi' });

    const initData = await createValidInitData(
      {
        auth_date: expiredTime.toString(),
        user: userPayload,
      },
      mockBotToken
    );

    const result = await validateTelegramInitData(initData, mockBotToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('auth_date has expired');
  });

  it('rejects missing user or hash', async () => {
    const result = await validateTelegramInitData('', mockBotToken);
    expect(result.valid).toBe(false);

    const noHash = await validateTelegramInitData('auth_date=123', mockBotToken);
    expect(noHash.valid).toBe(false);
    expect(noHash.error).toContain('Missing hash');
  });
});

