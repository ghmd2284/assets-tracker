import { describe, it, expect } from 'vitest';
import {
  detectEcosystem,
  detectAddress,
  normalizeAddress,
  parseBatchAddresses,
} from '../src/address';

describe('Address Detection and Normalization', () => {
  it('detects valid EVM addresses', () => {
    const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth
    expect(detectEcosystem(addr)).toBe('evm');
    const result = detectAddress(addr);
    expect(result).not.toBeNull();
    expect(result?.ecosystem).toBe('evm');
    expect(result?.targetChains).toHaveLength(5);
    expect(result?.normalized).toBe(addr.toLowerCase());
  });

  it('detects valid TON addresses (user-friendly and raw)', () => {
    // 48-char user-friendly
    const tonUserFriendly = 'EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU';
    expect(detectEcosystem(tonUserFriendly)).toBe('ton');

    const tonUQ = 'UQC1234567890abcdefghijklmnopqrstuvwxyzABCDEFGH_';
    expect(detectEcosystem(tonUQ)).toBe('ton');

    // 66-char raw
    const tonRaw = '0:729c13b6df2c07cbf0206ab63d34af454f3d320ec1afbeaaB6dd6eb58585168d';
    expect(detectEcosystem(tonRaw)).toBe('ton');
  });

  it('detects valid Solana addresses', () => {
    const solAddr = 'vines1vzrYbzLMRdu58syJa2uSz6DmEcYRVDZZ6255L';
    expect(detectEcosystem(solAddr)).toBe('solana');
    const result = detectAddress(solAddr);
    expect(result?.ecosystem).toBe('solana');
    expect(result?.targetChains).toEqual(['solana']);
  });

  it('rejects invalid addresses', () => {
    expect(detectEcosystem('not-an-address')).toBeNull();
    expect(detectEcosystem('0x123')).toBeNull(); // too short EVM
    expect(detectEcosystem('EQ123')).toBeNull(); // too short TON
    expect(detectEcosystem('0:123')).toBeNull(); // too short TON raw
  });

  it('parses batch addresses correctly with deduplication', () => {
    const raw = `
      0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045,
      EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU
      0xd8da6bf26964af9d7eed9e03e53415d37aa96045
      vines1vzrYbzLMRdu58syJa2uSz6DmEcYRVDZZ6255L
      invalid_address_string
    `;

    const { valid, invalid } = parseBatchAddresses(raw);
    expect(valid).toHaveLength(3); // 1 EVM (deduped), 1 TON, 1 Solana
    expect(invalid).toEqual(['invalid_address_string']);
    expect(valid[0].ecosystem).toBe('evm');
    expect(valid[1].ecosystem).toBe('ton');
    expect(valid[2].ecosystem).toBe('solana');
  });

  it('splits batch addresses using space, comma, and newline delimiters', () => {
    const raw = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU';
    const { valid } = parseBatchAddresses(raw);
    expect(valid).toHaveLength(2);
    expect(valid[0].ecosystem).toBe('evm');
    expect(valid[1].ecosystem).toBe('ton');
  });
});

