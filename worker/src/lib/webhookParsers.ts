import { Blockchain } from '@asset-tracker/shared';

export interface ParsedMutation {
  blockchain: Blockchain;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  tokenSymbol: string;
  contractAddress: string | null;
  amount: number;
  timestamp: string;
}

/**
 * Maps Alchemy network string to internal Blockchain type.
 */
export function mapAlchemyNetwork(network: string): Blockchain {
  const norm = (network || '').toUpperCase();
  if (norm.includes('BNB') || norm.includes('BSC')) return 'bsc';
  if (norm.includes('BASE')) return 'base';
  if (norm.includes('ARB')) return 'arbitrum';
  if (norm.includes('MATIC') || norm.includes('POLYGON')) return 'polygon';
  return 'ethereum';
}

/**
 * Parses Alchemy Address Activity webhook payload.
 */
export function parseAlchemyPayload(payload: any): ParsedMutation[] {
  const mutations: ParsedMutation[] = [];
  const event = payload?.event;
  if (!event || !Array.isArray(event.activity)) {
    return mutations;
  }

  const blockchain = mapAlchemyNetwork(event.network);
  const now = new Date().toISOString();

  for (const act of event.activity) {
    if (!act.fromAddress || !act.toAddress || !act.hash) {
      continue;
    }

    const isToken = act.category === 'token' || act.category === 'erc20';
    const contractAddress = isToken && act.rawContract?.address ? act.rawContract.address : null;
    const tokenSymbol = act.asset || (blockchain === 'bsc' ? 'BNB' : blockchain === 'polygon' ? 'POL' : 'ETH');
    const amount = Number(act.value) || 0;

    if (amount > 0) {
      mutations.push({
        blockchain,
        txHash: act.hash,
        fromAddress: act.fromAddress.toLowerCase(),
        toAddress: act.toAddress.toLowerCase(),
        tokenSymbol: tokenSymbol.toUpperCase(),
        contractAddress: contractAddress ? contractAddress.toLowerCase() : null,
        amount,
        timestamp: act.blockTimestamp || payload.createdAt || now,
      });
    }
  }

  return mutations;
}

/**
 * Parses Helius Solana webhook payload.
 */
export function parseHeliusPayload(payload: any): ParsedMutation[] {
  const mutations: ParsedMutation[] = [];
  const transactions = Array.isArray(payload) ? payload : [payload];

  for (const tx of transactions) {
    if (!tx || !tx.signature) continue;

    const txHash = tx.signature;
    const timestamp = tx.timestamp
      ? new Date(tx.timestamp * 1000).toISOString()
      : new Date().toISOString();

    // 1. Native SOL transfers
    if (Array.isArray(tx.nativeTransfers)) {
      for (const nat of tx.nativeTransfers) {
        const amountSol = (Number(nat.amount) || 0) / 1e9;
        if (amountSol > 0 && nat.fromUserAccount && nat.toUserAccount) {
          mutations.push({
            blockchain: 'solana',
            txHash,
            fromAddress: nat.fromUserAccount,
            toAddress: nat.toUserAccount,
            tokenSymbol: 'SOL',
            contractAddress: null,
            amount: amountSol,
            timestamp,
          });
        }
      }
    }

    // 2. SPL Token transfers
    if (Array.isArray(tx.tokenTransfers)) {
      for (const tok of tx.tokenTransfers) {
        const amount = Number(tok.tokenAmount) || 0;
        if (amount > 0 && tok.fromUserAccount && tok.toUserAccount) {
          mutations.push({
            blockchain: 'solana',
            txHash,
            fromAddress: tok.fromUserAccount,
            toAddress: tok.toUserAccount,
            tokenSymbol: (tok.mint || 'SPL').slice(0, 6).toUpperCase(),
            contractAddress: tok.mint || null,
            amount,
            timestamp,
          });
        }
      }
    }
  }

  return mutations;
}

/**
 * Parses TonAPI webhook payload.
 */
export function parseTonPayload(payload: any): ParsedMutation[] {
  const mutations: ParsedMutation[] = [];
  if (!payload) return mutations;

  const txHash = payload.tx_hash || payload.hash || `ton-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const actions = Array.isArray(payload.actions) ? payload.actions : [];

  for (const action of actions) {
    if (action.status && action.status !== 'ok') continue;

    // 1. Native Ton Transfer
    if (action.type === 'TonTransfer' && action.TonTransfer) {
      const transfer = action.TonTransfer;
      const amountTon = (Number(transfer.amount) || 0) / 1e9;
      const fromAddr = transfer.sender?.address;
      const toAddr = transfer.recipient?.address;

      if (amountTon > 0 && fromAddr && toAddr) {
        mutations.push({
          blockchain: 'ton',
          txHash,
          fromAddress: fromAddr,
          toAddress: toAddr,
          tokenSymbol: 'TON',
          contractAddress: null,
          amount: amountTon,
          timestamp,
        });
      }
    }

    // 2. Jetton Transfer
    if (action.type === 'JettonTransfer' && action.JettonTransfer) {
      const transfer = action.JettonTransfer;
      const decimals = transfer.jetton?.decimals || 9;
      const rawAmount = Number(transfer.amount) || 0;
      const amount = rawAmount / Math.pow(10, decimals);
      const fromAddr = transfer.sender?.address;
      const toAddr = transfer.recipient?.address;

      if (amount > 0 && fromAddr && toAddr) {
        mutations.push({
          blockchain: 'ton',
          txHash,
          fromAddress: fromAddr,
          toAddress: toAddr,
          tokenSymbol: (transfer.jetton?.symbol || 'JETTON').toUpperCase(),
          contractAddress: transfer.jetton?.address || null,
          amount,
          timestamp,
        });
      }
    }
  }

  return mutations;
}

