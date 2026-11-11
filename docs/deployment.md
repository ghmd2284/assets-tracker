# Panduan Deployment & Operasional Produksi
## Multi-Chain Asset Tracker Telegram Mini App (TMA)

Dokumen ini berisi panduan lengkap langkah demi langkah untuk melakukan deploy **Asset Tracker** ke infrastruktur cloud serverless berbiaya **$0 (Zero-Cost Free Tier)**.

---

### 1. Arsitektur Infrastruktur

```
                     ┌───────────────────────────────────┐
                     │          Telegram Client          │
                     │  (iOS / Android / Desktop / Web)  │
                     └─────────────────┬─────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
           [1] Buka WebApp                   [2] Interaksi Bot (/start)
                      ▼                                 ▼
         ┌─────────────────────────┐       ┌─────────────────────────┐
         │    Cloudflare Pages     │       │   Cloudflare Workers    │
         │  (React 18 + Vite SPA)  │◀─────▶│     (Hono Web API)      │
         └─────────────────────────┘       └────────────┬────────────┘
                                                        │
                      ┌─────────────────────────────────┼─────────────────────────────────┐
                      ▼                                 ▼                                 ▼
           ┌─────────────────────┐           ┌─────────────────────┐           ┌─────────────────────┐
           │      Supabase       │           │ Multi-Chain RPC/API │           │  Incoming Webhooks  │
           │  PostgreSQL (RLS)   │           │ Alchemy·Helius·Ton  │           │ Alchemy·Helius·Ton  │
           └─────────────────────┘           └─────────────────────┘           └─────────────────────┘
```

---

### 2. Langkah 1: Setup Supabase Database

1. Buka [database.new](https://database.new) dan buat project baru (Region: `Singapore (ap-southeast-1)` direkomendasikan untuk latency rendah).
2. Buka menu **SQL Editor**.
3. Buka file `supabase/migrations/0001_init.sql` di repository ini, copy seluruh isinya, paste ke SQL Editor, lalu jalankan (**Run**).
4. Pastikan 7 tabel berhasil terbuat:
   - `users`
   - `watched_addresses`
   - `user_wallets`
   - `token_balances`
   - `transactions`
   - `portfolio_snapshots`
   - `app_config`
5. Buka menu **Project Settings** -> **API**:
   - Salin **Project URL** (`https://<project-ref>.supabase.co`).
   - Salin **service_role secret key** (bukan `anon` key, karena seluruh tabel dilindungi Deny-All RLS dan hanya diakses melalui Cloudflare Worker).

---

### 3. Langkah 2: Setup Multi-Chain Provider Free Tiers

#### A. Alchemy (EVM: Ethereum, BSC, Base, Arbitrum, Polygon)
1. Buat akun di [alchemy.com](https://www.alchemy.com/).
2. Buat App baru untuk network **Ethereum Mainnet** (RPC endpoint otomatis menyediakan access key untuk semua EVM chains).
3. Buka menu **Notify** -> **Create Webhook** -> **Address Activity**:
   - Webhook URL: `https://<YOUR-WORKER-DOMAIN>/webhooks/alchemy`
   - Networks: Centang `Ethereum`, `BNB Smart Chain`, `Base`, `Arbitrum`, `Polygon`.
   - Salin **Webhook Signing Key** (digunakan untuk validasi `x-alchemy-signature`).

#### B. Helius (Solana)
1. Buat akun di [helius.dev](https://www.helius.dev/).
2. Buat project baru dan salin **API Key**.
3. Buka menu **Webhooks** -> **New Webhook**:
   - Webhook Type: `Enhanced`
   - Webhook URL: `https://<YOUR-WORKER-DOMAIN>/webhooks/helius`
   - Transaction Types: `TRANSFER`, `SWAP`
   - Auth Header: Masukkan string rahasia buatan Anda (misal: `helius_secret_abc123`).

#### C. TonAPI (TON Blockchain)
1. Buat akun di [tonapi.io](https://tonapi.io/).
2. Buat App baru dan salin **Server API Key**.
3. Buat webhook subscription untuk akun/transaksi mengarah ke `https://<YOUR-WORKER-DOMAIN>/webhooks/ton` dengan custom header secret.

---

### 4. Langkah 3: Deploy Cloudflare Worker (Backend API & Bot)

1. Pastikan Anda sudah login ke Cloudflare via CLI:
   ```bash
   npx wrangler login
   ```
2. Masuk ke direktori `worker`:
   ```bash
   cd miniapps/worker
   ```
3. Konfigurasikan secret environment variable via Wrangler:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put ALCHEMY_API_KEY
   npx wrangler secret put HELIUS_API_KEY
   npx wrangler secret put TONAPI_KEY
   npx wrangler secret put ALCHEMY_WEBHOOK_SIGNING_KEY
   npx wrangler secret put HELIUS_WEBHOOK_SECRET
   npx wrangler secret put TONAPI_SECRET
   npx wrangler secret put ADMIN_TELEGRAM_IDS
   npx wrangler secret put MINI_APP_URL
   ```
4. Jalankan deploy:
   ```bash
   npm run deploy
   ```
   *Catatan:* Cloudflare akan memberikan URL publik worker Anda, misalnya `https://asset-tracker-worker.<subdomain>.workers.dev`.

---

### 5. Langkah 4: Setup Telegram Bot & Webhook

1. Buka [@BotFather](https://t.me/BotFather) di Telegram.
2. Buat bot baru dengan `/newbot`, ikuti instruksi, lalu simpan token bot.
3. Daftarkan webhook Telegram Bot ke Worker:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://<YOUR-WORKER-DOMAIN>/bot/webhook"}'
   ```
4. Konfigurasikan Menu Button Telegram agar membuka Mini App secara fullscreen:
   - Kirim perintah `/setmenubutton` ke @BotFather.
   - Pilih bot Anda.
   - Masukkan URL Cloudflare Pages frontend Anda (`https://asset-tracker.pages.dev`).
   - Beri nama tombol: `🚀 Buka Asset Tracker`.
5. Daftarkan command bot:
   - Kirim `/setcommands` ke @BotFather:
     ```
     start - Mulai bot dan buka Asset Tracker Mini App
     delete - Hapus seluruh data akun & dompet secara permanen
     ```

---

### 6. Langkah 5: Deploy Frontend ke Cloudflare Pages

1. Masuk ke direktori `web`:
   ```bash
   cd miniapps/web
   ```
2. Buat file `.env.production` (atau atur environment variable di Cloudflare Dashboard):
   ```env
   VITE_API_URL=https://<YOUR-WORKER-DOMAIN>
   ```
3. Lakukan build:
   ```bash
   npm run build
   ```
4. Deploy folder `dist/` ke Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist --project-name asset-tracker
   ```

---

### 7. Verifikasi Akhir (Checklist Go-Live)

- [x] **Telegram Auth Validation:** Memverifikasi HMAC SHA-256 `initData` menggunakan WebCrypto API bawaan runtime.
- [x] **Zero-Knowledge Security:** Tidak pernah menyimpan private key, mnemonic seed, atau kata sandi; hanya watch-only addresses publik.
- [x] **Deny-All Database RLS:** Akses tabel database Supabase 100% diblokir dari internet publik dan hanya bisa diakses via Service Role Key Worker.
- [x] **Real-Time Multi-Chain Webhooks:** Mendukung mutasi masuk/keluar untuk 7 blockchain (ETH, BSC, Base, Arb, Polygon, TON, SOL) dengan filter dust < $1 USD.
- [x] **Idempotensi Transaksi:** Mencegah notifikasi ganda melalui `unique(blockchain, tx_hash, watched_address_id)`.
- [x] **Japandi UI & Mobile UX:** Touch targets >= 44x44px, ukuran input font 16px (mencegah zoom jump di iOS Safari), WCAG AA color contrast.
- [x] **Daily Snapshot Cron:** Cron Trigger berjalan otomatis setiap pukul 00:00 UTC untuk merekam riwayat akumulasi nilai portofolio.
- [x] **Admin Control Center:** Dashboard metrik sistem, broadcast rate-limited (20 msg/s), dan kill-switch maintenance mode.

