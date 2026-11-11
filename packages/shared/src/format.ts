import { CurrencyPref } from './types';

export const DEFAULT_USD_TO_IDR = 16200;

/**
 * Formats a fiat currency amount into clean Japandi tabular notation.
 */
export function formatFiat(
  amountUsd: number,
  currency: CurrencyPref = 'USD',
  idrRate = DEFAULT_USD_TO_IDR
): string {
  if (currency === 'IDR') {
    const amountIdr = Math.round(amountUsd * idrRate);
    return `Rp ${new Intl.NumberFormat('id-ID').format(amountIdr)}`;
  }

  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountUsd)}`;
}

/**
 * Formats crypto token amounts cleanly, avoiding scientific notation and excessive decimal clutter.
 */
export function formatCrypto(amount: number, maxDecimals = 4): string {
  if (amount === 0) return '0';
  if (amount < 0.000001) return '<0.000001';

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(amount);
}

/**
 * Truncates long public keys and hex hashes (e.g., 0x71C...3a9).
 */
export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (!address || address.length <= lead + tail) {
    return address;
  }
  return `${address.slice(0, lead)}...${address.slice(-tail)}`;
}

/**
 * Formats signed percentage delta with explicit + or - sign.
 */
export function formatSignedPercent(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

