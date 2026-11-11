import { describe, it, expect } from 'vitest';
import { getExplorerTxUrl } from '../src/lib/telegramBot';

describe('Transaction Explorer and URL Formatting', () => {
  it('converts base64 TON transaction hashes to 64-char hex in explorer links', () => {
    const base64Hash = 'Ix7RJyHzGKQr4+C1moi10ir0fEwEd1uiVH4AgegJDQM=';
    const url = getExplorerTxUrl('ton', base64Hash);
    expect(url).toBe('https://tonviewer.com/transaction/231ed12721f318a42be3e0b59a88b5d22af47c4c04775ba2547e0081e8090d03');
  });

  it('preserves existing hex hashes for EVM and Solana chains', () => {
    const ethHash = '0x3a82f91b72c91823d0a928ef1c293812739281a9';
    expect(getExplorerTxUrl('ethereum', ethHash)).toBe(`https://etherscan.io/tx/${ethHash}`);

    const solHash = '5xY3q182987123984192847192837192837192837';
    expect(getExplorerTxUrl('solana', solHash)).toBe(`https://solscan.io/tx/${solHash}`);
  });
});

