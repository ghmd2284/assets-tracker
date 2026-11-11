# Product Requirements Document (PRD): Multi-Chain Asset Tracker (Telegram Mini App)

## 1. Executive Summary & Visi Produk
**Asset Tracker** adalah Telegram Mini App (TMA) dan Bot Telegram pendamping yang dirancang untuk memantau portofolio aset kripto multi-chain (**TON, EVM: Ethereum L1, BNB Chain, L2: Base, Arbitrum, Polygon, dan Solana**) secara **100% watch-only** (tanpa koneksi dompet atau *private key*), menyajikan saldo gabungan lintas rantai (*Chain Abstraction*), dan mengirimkan notifikasi mutasi masuk/keluar secara *real-time*.

* **Positioning:** Alat pemantau aset (*Asset Tracker*) yang tenang, ringan, instan, dan aman—fokus pada kejelasan saldo, mutasi deposit, serta privasi penuh tanpa kompleksitas *trading terminal*.
* **Filosofi Desain:** Estetika **Japandi Minimalist** (merujuk pada `DESIGN.md`: palet linen, batu basal, whitespace luas, tabular numbers monospaced, bebas gamifikasi) dipadukan dengan struktur **Mobile-First Bento Box UI**.
* **Strategi Arsitektur (Zero-Cost Serverless):**
  * **Frontend Mini App:** React + Vite (SPA) / Next.js Static Export, TypeScript, Tailwind CSS, Shadcn UI primitives, `@telegram-apps/sdk-react`. Dihosting di **Cloudflare Pages** (100% gratis, super cepat, tanpa komplikasi SSR/hydration).
  * **Backend & API Gateway:** **Cloudflare Workers** (menangani validasi `initData` Telegram HMAC, caching harga 30–60 detik, webhook receiver, dan Cron Trigger harian).
  * **Database:** **Supabase (PostgreSQL)** dengan indexing teroptimasi dan relasi deduplikasi alamat.
  * **Multi-Chain Providers:** Alchemy (EVM L1 & L2), Helius (Solana), TonAPI (TON), dan QuickNode/BscScan API (BNB Chain).

---

## 2. Target Pengguna & Nilai Jual Utama (USP)
1. **100% Bebas Waswas (*Zero-Friction & Pure Watch-Only*):** Tidak ada tombol "Connect Wallet", tidak ada tanda tangan transaksi (*signature approval*), dan tidak ada risiko drainer. Pengguna cukup menempelkan (*paste*) alamat publik.
2. **Chain Abstraction (*Unified Balance*):** Menyatukan token identik dari berbagai jaringan (misal: USDT di TON, Ethereum, BNB, Arbitrum, Base, dan Solana) ke dalam satu baris ringkas yang dapat dibuka (*expandable accordion*).
3. **Notifikasi Mutasi Real-Time Bersih:** Bot Telegram mengirim notifikasi instan saat ada uang masuk/keluar dengan format *hyperlink* rapi layaknya mutasi perbankan modern.
4. **Anti-Scam & Spam Shield:** Dilengkapi filter cerdas untuk menyembunyikan token airdrop sampah (*scam fake tokens*) dan mengabaikan notifikasi debu (*dust transfers* < $1).
5. **Dukungan Mata Uang IDR & USD:** Fleksibilitas konversi nilai aset langsung ke Rupiah (IDR) atau Dolar (USD) dengan satu ketukan.

---

## 3. Cakupan Jaringan & Integrasi Provider

Sesuai kesepakatan cakupan: **TON + Solana + EVM (Ethereum L1, BNB Chain, L2: Base, Arbitrum, Polygon)**.

| Ekosistem | Jaringan Spesifik | Provider Saldo (Balances API) | Provider Notifikasi Webhook | Format Alamat |
| :--- | :--- | :--- | :--- | :--- |
| **TON** | TON Mainnet | TonAPI (`/v2/accounts/{id}/jettons`) | TonAPI Webhooks / TonCenter | `EQ...`, `UQ...`, atau `0:...` (48 char) |
| **Solana** | Solana Mainnet | Helius DAS API (`getAssetsByOwner`) | Helius Webhooks | Base58 (32–44 char) |
| **EVM L1** | Ethereum Mainnet | Alchemy (`alchemy_getTokenBalances`) | Alchemy Notify Webhook | `0x` + 40 hex char |
| **EVM L1** | BNB Smart Chain (BSC) | BscScan API / QuickNode | QuickNode Webhooks / BscScan | `0x` + 40 hex char |
| **EVM L2** | Base | Alchemy (`alchemy_getTokenBalances`) | Alchemy Notify Webhook | `0x` + 40 hex char |
| **EVM L2** | Arbitrum One | Alchemy (`alchemy_getTokenBalances`) | Alchemy Notify Webhook | `0x` + 40 hex char |
| **EVM L2** | Polygon PoS | Alchemy (`alchemy_getTokenBalances`) | Alchemy Notify Webhook | `0x` + 40 hex char |

---

## 4. Alur Pengguna & Onboarding (User Flow)

### Langkah 1: Sapaan Bot Telegram (`/start`)
1. Pengguna mengirimkan `/start` ke bot.
2. Bot mencatat `user_id`, `username`, dan `first_name` ke tabel `users`.
3. Bot membalas dengan pesan ringkas bernada tenang:
   > 🌿 **Asset Tracker Bot**  
   > Pantau portofolio crypto lintas jaringan (**TON, EVM: Ethereum, BNB, Base, Arbitrum, Polygon, dan Solana**) secara pasif & aman.  
   > 🔒 **100% Watch-Only.** Tidak pernah meminta *private key* atau koneksi dompet.  
   > `[ 🚀 Buka Asset Tracker ]` *(Tombol TMA WebApp)*

### Langkah 2: Layar Pertama Mini App (Trust Building & Demo Mode)
Pengguna baru yang belum memiliki alamat terdaftar disambut layar bersih:
* **Headline:** *"Lacak asetmu tanpa rasa waswas."*
* **Sub-teks:** *"Cukup tempelkan alamat publikmu. Mendukung TON, Solana, Ethereum, BNB, dan L2."*
* **Primary CTA:** `[ + Tambah Alamat Baru ]`
* **Secondary Ghost CTA:** `[ 👀 Coba Versi Demo ]` *(Memuat alamat portofolio whale publik secara instan dengan banner kuning lembut di atas: "Mode Demo Aktif — Portofolio Contoh" beserta tombol "Keluar").*

### Langkah 3: Smart Textarea (Auto-Detect Jaringan & Multi-Address Batching)
1. Pengguna menempelkan satu atau beberapa alamat (dipisahkan baris baru/koma).
2. Sistem otomatis memvalidasi checksum dan pola karakter:
   * **Pola EVM (`0x...`):** Sistem otomatis mendaftarkan alamat tersebut ke jaringan Ethereum, BNB, Base, Arbitrum, dan Polygon secara simultan.
   * **Pola TON (`EQ...`, `UQ...`, `0:...`):** Divalidasi dengan checksum base64url.
   * **Pola Solana:** Divalidasi dengan Base58 decode (panjang 32–44 byte).
3. Modal ringan meminta label dompet (contoh: *"Dompet Utama"*, *"Cold Wallet"*, *"Tabungan"*).
4. **Pemeriksaan Izin Notifikasi:** Aplikasi memeriksa apakah bot memiliki izin kirim pesan (`requestWriteAccess()`). Jika ya, banner *"Notifikasi mutasi aktif"* ditampilkan.

---

## 5. Desain Antarmuka & Struktur Halaman (Bento Box Mobile-First)

Merujuk pada panduan token di **`DESIGN.md`**, antarmuka menggunakan tema **Japandi Minimalist** dengan navigasi bawah 3 tab:

```text
┌──────────────────────────────────────────────────┐
│ [Top Bar] Profil  •  [ 🌐 Filter: All ]  •  [USD/IDR]│
├──────────────────────────────────────────────────┤
│ 💰 TOTAL VALUE (Hero Bento Card)                 │
│ $12,450.00  (~Rp 201.690.000)                    │
│ [ +2.45% Today (Sage Green Pill) ]               │
│ [ 📈 Line Chart: Minimalist Sparkline (44px hit) ]│
├──────────────────────────────────────────────────┤
│ 📊 WALLET ALLOCATION (Mineral Donut Chart)       │
│ Donut Ring (120px) + Legenda Teks:               │
│ ■ TON (35%)  ■ EVM L1/L2 (45%)  ■ SOL (20%)     │
├──────────────────────────────────────────────────┤
│ 📂 MY ASSETS (Chain Abstraction Accordion)       │
│ (Logo) Tether USD                       $2,500.00│
│ 🌐 4 Networks (TON, ETH, BSC, SOL)     2,500 USDT│
│   ├─ (TON) TON Chain                   $1,000.00 │
│   │    [ 📋 Salin ] [ ↗️ Bagikan ke Chat ]        │
│   ├─ (BSC) BNB Chain                     $800.00 │
│   ├─ (ETH) Ethereum                      $500.00 │
│   └─ (SOL) Solana                        $200.00 │
├──────────────────────────────────────────────────┤
│ ⚡ RECENT TRANSACTIONS (Mutasi Terakhir)          │
│ ↓ In  | +50 TON ($250)   | 0x123...abc | 2 min   │
│ ↑ Out | -0.5 ETH ($1.6k) | EQA45...xyz | 1 hr    │
├──────────────────────────────────────────────────┤
│ [Floating Nav]  🏠 Home   |   📈 Perf.   |   ⚙️ Settings │
└──────────────────────────────────────────────────┘
```

### 5.1 Spesifikasi Tab Aplikasi
1. **Tab `🏠 Home`:**
   * Hero Bento Card (Total Value, kalkulasi fiat real-time, sparkline).
   * Mineral Donut Chart (Alokasi portofolio per ekosistem: TON, EVM, SOL).
   * Chain Abstraction Accordion (Token list gabungan).
   * Recent Transactions list (5 mutasi terakhir).
2. **Tab `📈 Perf.` (Performance):**
   * Pilihan rentang waktu: `1D`, `1W`, `1M`, `1Y`, `ALL`.
   * Bar Chart performa profit/loss harian dan kurva akumulasi aset historis (diambil dari snapshot).
3. **Tab `⚙️ Settings`:**
   * Kelola Alamat Dompet (Daftar alamat, ubah nama label, hapus alamat).
   * Preferensi Mata Uang: Radio toggle **USD ($)** / **IDR (Rp)**.
   * Filter Spam Token: Saklar *"Sembunyikan token tanpa verifikasi / likuiditas < $10k"*.
   * Ambang Notifikasi: Atur batas minimal notifikasi bot (default: hanya transaksi > $1.00).
   * Privasi & Data: Tombol *"Hapus Semua Data Akun"* (`/delete`).

---

## 6. Sistem Anti-Spam & Filter Token Scam

Salah satu kelemahan terbesar tracker crypto adalah serbuan token palsu (*airdrop scam*) bernilai miliaran fiktif. Sistem menerapkan filter 3 lapis:
1. **Lapis 1 - Token Whitelist & Reputasi:** Otomatis menampilkan token yang terindeks dan memiliki pool likuiditas aktif di DexScreener atau CoinGecko.
2. **Lapis 2 - Likuiditas Minimum:** Token dengan estimasi likuiditas pasar di bawah $10,000 USD disembunyikan ke dalam tab *Hidden Tokens*.
3. **Lapis 3 - Notifikasi Filter (Anti-Dust):** Transaksi masuk bernilai di bawah $1.00 USD atau token tidak terverifikasi tidak akan memicu notifikasi bot Telegram.

---

## 7. Sistem Notifikasi Bot Telegram & Arsitektur Webhook

### 7.1 Pola Webhook Terpusat (*Shared Multi-Tenant Webhook*)
Untuk menghemat kuota free tier (Alchemy, Helius, TonAPI yang membatasi jumlah instance webhook):
* Sistem **hanya membuat 1 master webhook per provider**.
* Saat pengguna mendaftarkan alamat, Worker mendaftarkan alamat tersebut ke daftar pantau master webhook via API.
* Alamat yang sama yang dipantau oleh banyak pengguna (misal: wallet whale demo) hanya didaftarkan **satu kali** di webhook provider.

### 7.2 Format Template Notifikasi (HTML Telegram)
Format pesan bersih, tanpa emoji berlebihan, dan membungkus identitas ke block explorer resmi:

**Contoh Transaksi Masuk (Deposit / Received):**
> 📥 **Dana Masuk** · [Main Wallet]  
> **+50 TON** (~$250.00 / ~Rp 4.050.000)  
> Jaringan: 💎 **TON**  
> Dari: `[EQ8z..1a2b](https://tonviewer.com/EQ8z...1a2b)`  
> 🔗 `[Lihat Transaksi](https://tonviewer.com/transaction/...)`

**Contoh Transaksi Keluar (Sent):**
> 📤 **Dana Keluar** · [Trading BSC]  
> **-250 USDT** (~$250.00)  
> Jaringan: 🟡 **BNB Smart Chain**  
> Tujuan: `[0xee..4819](https://bscscan.com/address/0xee...4819)`  
> 🔗 `[Lihat Transaksi](https://bscscan.com/tx/0x...)`

---

## 8. Arsitektur Teknis & Skema Database

### 8.1 Tech Stack
* **Frontend:** React + Vite / Next.js Static Export, TypeScript, Tailwind CSS, Lucide Icons, Recharts, `@telegram-apps/sdk-react`.
* **Frontend Hosting:** **Cloudflare Pages** (Global CDN, zero-cost, no cold start).
* **Backend:** **Cloudflare Workers** (TypeScript):
  * Validasi `initData` menggunakan algoritma HMAC-SHA256 dengan secret `TELEGRAM_BOT_TOKEN`.
  * Verifikasi signature Webhook masuk (Alchemy HMAC, Helius secret header, TonAPI token).
  * Proxy cache harga DexScreener (Cloudflare KV / in-memory cache 60 detik).
  * Cron Trigger harian (pukul 00:00 UTC) untuk mencatat snapshot portofolio.
* **Database:** **Supabase (PostgreSQL)**.

### 8.2 Skema Database Relasional Teroptimasi (Supabase PostgreSQL)

```sql
-- 1. Tabel Profil Pengguna Telegram
create table public.users (
  id bigint primary key, -- telegram_id
  username text,
  first_name text,
  currency_pref text default 'USD' check (currency_pref in ('USD', 'IDR')),
  min_alert_usd numeric(8, 2) default 1.00,
  hide_spam boolean default true,
  is_banned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabel Master Alamat yang Dipantau (Deduplikasi Global Webhook)
create table public.watched_addresses (
  id uuid default gen_random_uuid() primary key,
  address text not null,
  blockchain text not null check (blockchain in ('ton', 'solana', 'ethereum', 'bsc', 'base', 'arbitrum', 'polygon')),
  is_active boolean default true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(address, blockchain)
);

-- 3. Tabel Relasi Dompet Pengguna
create table public.user_wallets (
  id uuid default gen_random_uuid() primary key,
  user_id bigint references public.users(id) on delete cascade not null,
  watched_address_id uuid references public.watched_addresses(id) on delete cascade not null,
  wallet_label text not null, -- misal: 'Tabungan Dingin'
  is_demo boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, watched_address_id)
);

-- 4. Tabel Cache Saldo Token (Mencegah Rate-Limit RPC)
create table public.token_balances (
  id uuid default gen_random_uuid() primary key,
  watched_address_id uuid references public.watched_addresses(id) on delete cascade not null,
  token_symbol text not null,
  token_name text not null,
  contract_address text, -- null untuk native coin (TON, ETH, SOL, BNB)
  balance numeric(28, 8) not null default 0,
  price_usd numeric(18, 4) default 0,
  value_usd numeric(18, 2) default 0,
  logo_url text,
  is_spam boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(watched_address_id, token_symbol, contract_address)
);

-- 5. Tabel Mutasi Transaksi (Idempotensi Webhook)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  watched_address_id uuid references public.watched_addresses(id) on delete cascade not null,
  tx_hash text not null,
  blockchain text not null,
  direction text not null check (direction in ('in', 'out')),
  token_symbol text not null,
  amount numeric(28, 8) not null,
  amount_usd numeric(18, 2),
  from_address text not null,
  to_address text not null,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(blockchain, tx_hash, watched_address_id) -- Mencegah notifikasi duplikat
);

-- 6. Tabel Snapshot Harian Portofolio (Untuk Line & Bar Chart)
create table public.portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id bigint references public.users(id) on delete cascade not null,
  total_value_usd numeric(14, 2) not null,
  recorded_at date default current_date,
  unique(user_id, recorded_at)
);

-- 7. Tabel Konfigurasi Global & Admin Kill Switch
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

---

## 9. Keamanan & Pembatasan Sistem (Security & Guardrails)
1. **Validasi Kriptografi `initData`:** Setiap request HTTP dari frontend Mini App ke Cloudflare Worker wajib melampirkan header `X-Telegram-Init-Data`. Worker memvalidasi HMAC-SHA256 signature serta memeriksa batas kadaluarsa `auth_date` (< 24 jam).
2. **Validasi Webhook Signature:** Webhook yang masuk diverifikasi keabsahannya (Alchemy HMAC header, Helius Auth Token, TonAPI secret token) sebelum memproses database.
3. **Penyekat Kuota & Batas Input:**
   * Maksimal dompet gratis: **10 dompet per akun Telegram**.
   * Maksimal alamat saat paste di Smart Textarea: **5 alamat per batch**.
   * Cloudflare KV Caching harga token selama 60 detik agar tidak membebani API publik.
4. **Broadcast Queue:** Pengiriman pesan massal dari panel admin dikirim melalui antrean bertahap (maksimal 25 pesan/detik) agar tidak terkena blokir rate limit Telegram.

---

## 10. Panduan Eksekusi AI Agent & Developer (Project Skills Integration)

Proyek ini telah dilengkapi 7 skill agen lokal yang terpasang di `.agents/skills/`:
* `telegram-miniapps` & `telegram-bot`: Panduan antarmuka Mini App & alur Bot Telegram.
* `workers-best-practices` & `wrangler`: Panduan eksekusi Cloudflare Workers & Pages.
* `supabase-postgres-best-practices`: Panduan eksekusi SQL DDL & indexing PostgreSQL.
* `vercel-react-best-practices`: Standar komponen React & Tailwind CSS.
* `ton-blockchain`: Spesifikasi pengolahan alamat dan API TON.

### Langkah Eksekusi Deployment:
1. Inisialisasi proyek frontend di folder `miniapps/web` menggunakan Vite + React + Tailwind + `@telegram-apps/sdk-react`.
2. Inisialisasi Worker backend di `miniapps/worker` dengan konfigurasi `wrangler.toml`.
3. Jalankan script SQL DDL di atas ke Supabase Dashboard atau via Supabase CLI.
4. Isi environment variable di Cloudflare: `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALCHEMY_API_KEY`, `HELIUS_API_KEY`, `TONAPI_KEY`.
5. Deploy frontend ke Cloudflare Pages dan backend ke Cloudflare Workers (`npx wrangler deploy`).
