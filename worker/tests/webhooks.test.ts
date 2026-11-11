import { describe, it, expect } from 'vitest';
import {
  verifyAlchemySignature,
  verifyHeliusAuth,
  verifyTonApiAuth,
} from '../src/lib/webhookAuth';
import {
  parseAlchemyPayload,
  parseHeliusPayload,
  parseTonPayload,
  mapAlchemyNetwork,
} from '../src/lib/webhookParsers';
import {
  formatMutationAlertMessage,
  getExplorerTxUrl,
} from '../src/lib/telegramBot';

describe('Webhook Auth Verification', () => {
  it('verifies Alchemy HMAC-SHA256 signature accurately using WebCrypto', async () => {
    const rawBody = JSON.stringify({ type: 'ADDRESS_ACTIVITY', test: 123 });
    const signingKey = 'my_super_secret_alchemy_key_123';

    // Compute expected HMAC-SHA256 signature
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    const validSignature = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const isValid = await verifyAlchemySignature(rawBody, validSignature, signingKey);
    expect(isValid).toBe(true);

    const isInvalid = await verifyAlchemySignature(rawBody, 'deadbeef1234', signingKey);
    expect(isInvalid).toBe(false);
  });

  it('verifies Helius Bearer auth header', () => {
    const secret = 'helius_secret_abc';
    expect(verifyHeliusAuth('Bearer helius_secret_abc', secret)).toBe(true);
    expect(verifyHeliusAuth('helius_secret_abc', secret)).toBe(true);
    expect(verifyHeliusAuth('Bearer wrong_secret', secret)).toBe(false);
    expect(verifyHeliusAuth(null, secret)).toBe(false);
  });

  it('verifies TonAPI secret header', () => {
    const secret = 'ton_secret_xyz';
    expect(verifyTonApiAuth('ton_secret_xyz', secret)).toBe(true);
    expect(verifyTonApiAuth('Bearer ton_secret_xyz', secret)).toBe(true);
    expect(verifyTonApiAuth('wrong', secret)).toBe(false);
  });
});

describe('Webhook Payload Parsers', () => {
  it('maps Alchemy networks properly including BSC', () => {
    expect(mapAlchemyNetwork('ETH_MAINNET')).toBe('ethereum');
    expect(mapAlchemyNetwork('BNB_MAINNET')).toBe('bsc');
    expect(mapAlchemyNetwork('BASE_MAINNET')).toBe('base');
    expect(mapAlchemyNetwork('ARB_MAINNET')).toBe('arbitrum');
    expect(mapAlchemyNetwork('MATIC_MAINNET')).toBe('polygon');
  });

  it('parses Alchemy EVM and ERC-20 transfer activities', () => {
    const alchemyPayload = {
      event: {
        network: 'BNB_MAINNET',
        activity: [
          {
            fromAddress: '0x1111111111111111111111111111111111111111',
            toAddress: '0x2222222222222222222222222222222222222222',
            value: 2.5,
            asset: 'BNB',
            hash: '0xhash123',
            category: 'external',
          },
          {
            fromAddress: '0x3333333333333333333333333333333333333333',
            toAddress: '0x4444444444444444444444444444444444444444',
            value: 100.0,
            asset: 'USDT',
            hash: '0xhash456',
            category: 'erc20',
            rawContract: {
              address: '0x55d398326f99059fF775485246999027B3197955',
            },
          },
        ],
      },
    };

    const mutations = parseAlchemyPayload(alchemyPayload);
    expect(mutations).toHaveLength(2);
    expect(mutations[0].blockchain).toBe('bsc');
    expect(mutations[0].tokenSymbol).toBe('BNB');
    expect(mutations[0].amount).toBe(2.5);
    expect(mutations[0].contractAddress).toBeNull();

    expect(mutations[1].blockchain).toBe('bsc');
    expect(mutations[1].tokenSymbol).toBe('USDT');
    expect(mutations[1].amount).toBe(100.0);
    expect(mutations[1].contractAddress).toBe(
      '0x55d398326f99059ff775485246999027b3197955'
    );
  });

  it('parses Helius Solana native SOL and SPL transfers', () => {
    const heliusPayload = [
      {
        signature: '5xTestSig12345',
        timestamp: 1700000000,
        nativeTransfers: [
          {
            fromUserAccount: 'SenderSolAddr1',
            toUserAccount: 'ReceiverSolAddr2',
            amount: 2500000000, // 2.5 SOL
          },
        ],
        tokenTransfers: [
          {
            fromUserAccount: 'SenderTokenAddr',
            toUserAccount: 'ReceiverTokenAddr',
            tokenAmount: 42.5,
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          },
        ],
      },
    ];

    const mutations = parseHeliusPayload(heliusPayload);
    expect(mutations).toHaveLength(2);

    expect(mutations[0].blockchain).toBe('solana');
    expect(mutations[0].tokenSymbol).toBe('SOL');
    expect(mutations[0].amount).toBe(2.5);
    expect(mutations[0].txHash).toBe('5xTestSig12345');

    expect(mutations[1].blockchain).toBe('solana');
    expect(mutations[1].amount).toBe(42.5);
    expect(mutations[1].contractAddress).toBe(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    );
  });

  it('parses TonAPI native TON and Jetton transfers', () => {
    const tonPayload = {
      tx_hash: 'ton_hash_789',
      actions: [
        {
          type: 'TonTransfer',
          status: 'ok',
          TonTransfer: {
            sender: { address: 'EQSenderTon1' },
            recipient: { address: 'EQRecipientTon2' },
            amount: 5000000000, // 5 TON
          },
        },
        {
          type: 'JettonTransfer',
          status: 'ok',
          JettonTransfer: {
            sender: { address: 'EQSenderJetton' },
            recipient: { address: 'EQRecipientJetton' },
            amount: '15000000', // 15 USDT (6 decimals)
            jetton: {
              address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
              symbol: 'USD₮',
              decimals: 6,
            },
          },
        },
      ],
    };

    const mutations = parseTonPayload(tonPayload);
    expect(mutations).toHaveLength(2);

    expect(mutations[0].blockchain).toBe('ton');
    expect(mutations[0].tokenSymbol).toBe('TON');
    expect(mutations[0].amount).toBe(5);

    expect(mutations[1].blockchain).toBe('ton');
    expect(mutations[1].amount).toBe(15);
  });
});

describe('Telegram Bot Notification Formatting', () => {
  it('formats Explorer transaction links correctly for all networks', () => {
    expect(getExplorerTxUrl('ethereum', '0x123')).toBe('https://etherscan.io/tx/0x123');
    expect(getExplorerTxUrl('bsc', '0x123')).toBe('https://bscscan.com/tx/0x123');
    expect(getExplorerTxUrl('base', '0x123')).toBe('https://basescan.org/tx/0x123');
    expect(getExplorerTxUrl('arbitrum', '0x123')).toBe('https://arbiscan.io/tx/0x123');
    expect(getExplorerTxUrl('polygon', '0x123')).toBe('https://polygonscan.com/tx/0x123');
    expect(getExplorerTxUrl('ton', 'abc123hash')).toBe('https://tonviewer.com/transaction/abc123hash');
    expect(getExplorerTxUrl('solana', '5xSolSig')).toBe('https://solscan.io/tx/5xSolSig');
  });

  it('formats HTML message for inbound and outbound assets', () => {
    const inMsg = formatMutationAlertMessage({
      blockchain: 'ethereum',
      direction: 'in',
      amount: 1.5,
      tokenSymbol: 'ETH',
      amountUsd: 4125.0,
      walletLabel: 'Dompet Utama',
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      txHash: '0x3a82f91b72c91823d0a928ef1c293812739281a9',
      currencyPref: 'USD',
    });

    expect(inMsg).toContain('🟢 <b>Aset Masuk Terdeteksi</b>');
    expect(inMsg).toContain('+1.5 ETH');
    expect(inMsg).toContain('Dompet Utama');
    expect(inMsg).toContain('https://etherscan.io/tx/0x3a82f91b72c91823d0a928ef1c293812739281a9');

    const outMsg = formatMutationAlertMessage({
      blockchain: 'solana',
      direction: 'out',
      amount: 10.0,
      tokenSymbol: 'SOL',
      amountUsd: 1500.0,
      walletLabel: 'Solana Staking',
      address: '4Nd1mBQtrMJVYVfKf2PJy9NZGad3TkLqcpkShG5maVe5',
      txHash: '5xY3q182987123984192847192837192837192837',
      currencyPref: 'USD',
    });

    expect(outMsg).toContain('🔴 <b>Aset Keluar Terdeteksi</b>');
    expect(outMsg).toContain('−10 SOL');
  });
});
