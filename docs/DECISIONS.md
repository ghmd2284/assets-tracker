# Architecture Decision Records (ADR)

## ADR-001: Monorepo Architecture with npm Workspaces
* **Keputusan:** Menggunakan `npm workspaces` dengan pembagian modul:
  * `packages/shared`: Tipe TypeScript bersama, validasi alamat (EVM, TON, Solana), dan helper format fiat.
  * `web`: Client Telegram Mini App (Vite + React + Tailwind + Shadcn UI).
  * `worker`: Cloudflare Worker API gateway (Hono framework) + Webhook receiver + Cron job.
* **Alasan:** Menjaga sinkronisasi logika deteksi alamat dan tipe data antara frontend TMA dan backend worker tanpa redudansi.

## ADR-002: Frontend Framework (React + Vite vs Next.js)
* **Keputusan:** Menggunakan **React 18/19 + Vite** (SPA) dihosting di **Cloudflare Pages**.
* **Alasan:** TMA berjalan di dalam webview Telegram di balik autentikasi `initData`. Aplikasi ini tidak memerlukan Server-Side Rendering (SSR) maupun SEO publik. Vite menghasilkan bundle statis yang jauh lebih ringan, cepat dibangun, zero cold-start, dan 100% gratis di Cloudflare Pages tanpa komplikasi OpenNext.

## ADR-003: Backend Framework (Hono on Cloudflare Workers)
* **Keputusan:** Menggunakan **Hono** sebagai micro-framework di Cloudflare Workers.
* **Alasan:** Ringan (~14KB), typing end-to-end yang kuat, middleware modular (CORS, timing, auth), dan didukung penuh oleh Cloudflare Workers & ecosystem.

## ADR-004: Shared Multi-Tenant Master Webhooks
* **Keputusan:** Tidak membuat webhook per dompet pengguna. Membuat **1 master webhook per provider**, lalu menambahkan/menghapus alamat ke dalam master webhook tersebut via API.
* **Alasan:** Provider gratis membatasi jumlah webhook (misal Helius: maks 5 webhook). Namun 1 webhook dapat menampung hingga 100.000 alamat. Pola shared webhook dengan tabel perantara `watched_addresses` menghemat kuota dan mempermudah deduplikasi.

## ADR-005: RLS Policy & Database Security
* **Keputusan:** Menerapkan **deny-all RLS** pada Supabase PostgreSQL. Semua akses baca/tulis wajib melalui Cloudflare Worker yang memvalidasi `initData` Telegram dan menggunakan `SUPABASE_SERVICE_ROLE_KEY`.
* **Alasan:** Mencegah kebocoran data jika `anon_key` terekspos di sisi browser/client. Worker bertindak sebagai penjaga gerbang otorisasi mutlak.
