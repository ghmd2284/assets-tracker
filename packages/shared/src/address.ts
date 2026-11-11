import { Ecosystem, Blockchain, EVM_CHAINS } from './types';

const EVM_REGEX = /^0x[0-9a-fA-F]{40}$/;
const TON_USER_FRIENDLY_REGEX = /^[EUK0euk0][A-Za-z0-9_-]{47}$/;
const TON_RAW_REGEX = /^(-1|0):[0-9a-fA-F]{64}$/;
const SOLANA_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export interface DetectedAddressResult {
  ecosystem: Ecosystem;
  targetChains: Blockchain[];
  normalized: string;
}

/**
 * Detects the ecosystem of an input blockchain address.
 * Returns null if the address does not match EVM, TON, or Solana patterns.
 */
export function detectEcosystem(address: string): Ecosystem | null {
  const trimmed = address.trim();
  if (EVM_REGEX.test(trimmed)) {
    return 'evm';
  }
  if (TON_USER_FRIENDLY_REGEX.test(trimmed) || TON_RAW_REGEX.test(trimmed)) {
    return 'ton';
  }
  if (SOLANA_REGEX.test(trimmed)) {
    return 'solana';
  }
  return null;
}

/**
 * Normalizes an address based on its ecosystem.
 * EVM is lowercased; TON & Solana preserve their canonical case.
 */
export function normalizeAddress(address: string, ecosystem: Ecosystem): string {
  const trimmed = address.trim();
  if (ecosystem === 'evm') {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Detects address ecosystem and returns its target blockchains.
 * For EVM, it targets all 5 supported EVM chains (Ethereum, BSC, Base, Arbitrum, Polygon).
 */
export function detectAddress(input: string): DetectedAddressResult | null {
  const ecosystem = detectEcosystem(input);
  if (!ecosystem) return null;

  const normalized = normalizeAddress(input, ecosystem);
  let targetChains: Blockchain[] = [];

  switch (ecosystem) {
    case 'evm':
      targetChains = [...EVM_CHAINS];
      break;
    case 'ton':
      targetChains = ['ton'];
      break;
    case 'solana':
      targetChains = ['solana'];
      break;
  }

  return {
    ecosystem,
    targetChains,
    normalized,
  };
}

/**
 * Parses raw input from Smart Textarea (supports newlines, commas, or spaces).
 * Deduplicates and returns valid addresses only (maximum limit: 5 per batch).
 */
export function parseBatchAddresses(
  rawText: string,
  maxBatch = 5
): {
  valid: DetectedAddressResult[];
  invalid: string[];
} {
  const tokens = rawText
    .split(/[\r\n,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const seen = new Set<string>();
  const valid: DetectedAddressResult[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    if (seen.has(token.toLowerCase())) {
      continue;
    }

    const detected = detectAddress(token);
    if (detected) {
      if (valid.length < maxBatch) {
        seen.add(token.toLowerCase());
        valid.push(detected);
      }
    } else {
      invalid.push(token);
    }
  }

  return { valid, invalid };
}

