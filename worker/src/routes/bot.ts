import { Hono } from 'hono';
import { Env } from '../types';
import { getSupabaseClient } from '../lib/supabase';

export const botRoutes = new Hono<{ Bindings: Env }>();

// POST /bot/webhook - Handles updates from Telegram Bot API
botRoutes.post('/webhook', async (c) => {
  // 1. Verify Secret Token if set
  if (c.env.TELEGRAM_BOT_SECRET_TOKEN) {
    const headerSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (headerSecret !== c.env.TELEGRAM_BOT_SECRET_TOKEN) {
      return c.text('Unauthorized', 401);
    }
  }

  const update = await c.req.json<any>();
  const message = update?.message;

  if (!message || !message.text) {
    return c.json({ ok: true }); // Acknowledge non-text updates
  }

  const chatId = message.chat.id;
  const from = message.from;
  const text = message.text.trim();

  const supabase = getSupabaseClient(c.env);

  // Handle /start command
  if (text.startsWith('/start')) {
    // Upsert user into DB
    if (from?.id) {
      await supabase.from('users').upsert(
        {
          id: from.id,
          username: from.username || null,
          first_name: from.first_name || null,
        },
        { onConflict: 'id' }
      );
    }

    const miniAppUrl = c.env.MINI_APP_URL || 'https://asset-tracker.pages.dev';

    const welcomeText = `
🌿 <b>Asset Tracker Bot</b>

Pantau portofolio aset crypto lintas jaringan (<b>TON, EVM: Ethereum, BNB, Base, Arbitrum, Polygon, dan Solana</b>) secara tenang dan otomatis.

🔒 <b>100% Watch-Only & Aman:</b>
Kami tidak pernah meminta <i>private key</i>, kata sandi, ataupun koneksi dompet kamu. Cukup pantau saldo dan terima mutasi transfer masuk/keluar secara instan.
`.trim();

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🚀 Buka Asset Tracker',
            web_app: { url: miniAppUrl },
          },
        ],
      ],
    };

    await fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });

    return c.json({ ok: true });
  }

  // Handle /delete command (Privacy Right)
  if (text.startsWith('/delete')) {
    if (from?.id) {
      await supabase.from('users').delete().eq('id', from.id);

      await fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '🗑️ Semua data profil dan daftar dompetmu telah berhasil dihapus dari sistem kami.',
          parse_mode: 'HTML',
        }),
      });
    }

    return c.json({ ok: true });
  }

  return c.json({ ok: true });
});
