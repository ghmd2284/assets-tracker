/**
 * Webhook signature and authentication verification utilities for
 * Alchemy, Helius, and TonAPI using WebCrypto.
 */

/**
 * Verifies Alchemy webhook signature (HMAC-SHA256 of raw body).
 */
export async function verifyAlchemySignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  signingKey: string | undefined
): Promise<boolean> {
  // If no signing key configured in environment, allow in development/testing
  if (!signingKey) {
    return true;
  }
  if (!signatureHeader) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(rawBody)
    );

    // Convert signature buffer to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare case-insensitively
    return computedSignature.toLowerCase() === signatureHeader.trim().toLowerCase();
  } catch (err) {
    console.error('[Alchemy Signature Error]', err);
    return false;
  }
}

/**
 * Verifies Helius webhook authentication header.
 */
export function verifyHeliusAuth(
  authHeader: string | null | undefined,
  expectedSecret: string | undefined
): boolean {
  if (!expectedSecret) {
    return true;
  }
  if (!authHeader) {
    return false;
  }

  const cleanHeader = authHeader.replace(/^Bearer\s+/i, '').trim();
  return cleanHeader === expectedSecret.trim();
}

/**
 * Verifies TonAPI webhook secret token.
 */
export function verifyTonApiAuth(
  secretHeader: string | null | undefined,
  expectedSecret: string | undefined
): boolean {
  if (!expectedSecret) {
    return true;
  }
  if (!secretHeader) {
    return false;
  }

  const cleanHeader = secretHeader.replace(/^Bearer\s+/i, '').trim();
  return cleanHeader === expectedSecret.trim();
}

