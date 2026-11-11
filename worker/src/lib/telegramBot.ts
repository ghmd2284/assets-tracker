import { Blockchain, truncateAddress, formatCrypto, formatFiat } from '@asset-tracker/shared';

export interface MutationAlertPayload {
  blockchain: Blockchain;
  direction: 'in' | 'out';
  amount: number;
  tokenSymbol: string;
  amountUsd?: number;
  walletLabel: string;
  address: string;
  txHash: string;
  currencyPref?: 'USD' | 'IDR';
}

/**
 * Returns the public explorer transaction URL for any supported blockchain.
 */
export function getExplorerTxUrl(chain: Blockchain, txHash: string): string {
  switch (chain) {
    case 'ethereum':
      return `https://etherscan.io/tx/${txHash}`;
    case 'bsc':
      return `https://bscscan.com/tx/${txHash}`;
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    case 'arbitrum':
      return `https://arbiscan.io/tx/${txHash}`;
    case 'polygon':
      return `https://polygonscan.com/tx/${txHash}`;
    case 'ton':
      return `https://tonviewer.com/transaction/${txHash}`;
    case 'solana':
      return `https://solscan.io/tx/${txHash}`;
    default:
      return '#';
  }
}

/**
 * Formats a clean, readable Japandi Telegram HTML push notification.
 */
export function formatMutationAlertMessage(alert: MutationAlertPayload): string {
  const isInbound = alert.direction === 'in';
  const icon = isInbound ? '🟢' : '🔴';
  const title = isInbound ? 'Aset Masuk Terdeteksi' : 'Aset Keluar Terdeteksi';
  const sign = isInbound ? '+' : '−';
  const explorerUrl = getExplorerTxUrl(alert.blockchain, alert.txHash);
  const shortHash = truncateAddress(alert.txHash, 6, 4);
  const shortAddr = truncateAddress(alert.address, 6, 4);

  const fiatFormatted = alert.amountUsd && alert.amountUsd > 0
    ? ` (~${formatFiat(alert.amountUsd, alert.currencyPref || 'USD')})`
    : '';

  const networkName =
    alert.blockchain === 'bsc'
      ? 'BNB Smart Chain (BSC)'
      : alert.blockchain.charAt(0).toUpperCase() + alert.blockchain.slice(1);

  return `
${icon} <b>${title}</b>
━━━━━━━━━━━━━━━━━━━━
💰 <b>Nominal:</b> <code>${sign}${formatCrypto(alert.amount)} ${alert.tokenSymbol}</code>${fiatFormatted}
🏷️ <b>Dompet:</b> ${alert.walletLabel}
🌐 <b>Jaringan:</b> ${networkName}
📍 <b>Alamat:</b> <code>${shortAddr}</code>
🔗 <b>Tx Hash:</b> <a href="${explorerUrl}">${shortHash}</a>
`.trim();
}

/**
 * Sends a Telegram push message to a specific user chat ID.
 */
export async function sendTelegramNotification(
  botToken: string,
  chatId: number,
  htmlText: string,
  miniAppUrl?: string
): Promise<boolean> {
  if (!botToken) {
    console.warn('[Telegram Notification] No BOT_TOKEN configured. Notification skipped.');
    return false;
  }

  try {
    const replyMarkup = miniAppUrl
      ? {
          inline_keyboard: [
            [
              {
                text: '🚀 Buka Asset Tracker',
                web_app: { url: miniAppUrl },
              },
            ],
          ],
        }
      : undefined;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Telegram Notification] Failed to send to chat ${chatId}: ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[Telegram Notification Error] chat ${chatId}:`, err);
    return false;
  }
}
