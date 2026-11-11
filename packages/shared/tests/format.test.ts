import { describe, it, expect } from 'vitest';
import {
  formatFiat,
  formatCrypto,
  truncateAddress,
  formatSignedPercent,
} from '../src/format';

describe('Formatters', () => {
  it('formats fiat currency for USD and IDR', () => {
    expect(formatFiat(12450.5, 'USD')).toBe('$12,450.50');
    // 100 USD * 16200 = 1,620,000 IDR
    expect(formatFiat(100, 'IDR', 16200)).toBe('Rp 1.620.000');
  });

  it('formats crypto amounts cleanly', () => {
    expect(formatCrypto(0)).toBe('0');
    expect(formatCrypto(0.0000001)).toBe('<0.000001');
    expect(formatCrypto(4.123456, 4)).toBe('4.1235');
  });

  it('truncates public addresses', () => {
    const evm = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    expect(truncateAddress(evm, 6, 4)).toBe('0xd8dA...6045');
    expect(truncateAddress('short')).toBe('short');
  });

  it('formats signed percentage', () => {
    expect(formatSignedPercent(2.45)).toBe('+2.45%');
    expect(formatSignedPercent(-1.12)).toBe('-1.12%');
    expect(formatSignedPercent(0)).toBe('0.00%');
  });
});
