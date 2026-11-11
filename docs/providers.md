# Multi-Chain Provider Research & Decisions

Hasil verifikasi provider untuk arsitektur serverless zero-cost Multi-Chain Asset Tracker:

## 1. Ekosistem EVM (Ethereum, BNB Smart Chain, Base, Arbitrum, Polygon)
* **Provider Terpilih:** **Alchemy** (Single Unified EVM Provider)
* **Status BSC:** **Didukung penuh** oleh Alchemy (RPC API, Token API, dan Alchemy Notify Address Activity Webhooks).
* **Keuntungan:** Tidak perlu memisah provider BSC ke BscScan atau QuickNode. Satu integrasi Alchemy Notify mencakup seluruh 5 chain EVM dengan standar HMAC-SHA256 (`X-Alchemy-Signature`) dan format payload yang identik.
* **Strategi Webhook:** 1 master webhook per chain EVM (total 5 webhook) di Alchemy Dashboard/API. Masing-masing webhook mendukung hingga puluhan ribu alamat via API.

## 2. Ekosistem Solana
* **Provider Terpilih:** **Helius**
* **Layanan:** DAS API (`getAssetsByOwner` untuk membaca semua token SPL dan native SOL) dan Helius Webhooks.
* **Batas Free Tier:** 
  * Maksimal 5 active webhooks.
  * Setiap webhook dapat menampung hingga **100.000 alamat** via API (`POST /v0/webhooks`).
  * Autentikasi webhook via header `Authorization: Bearer <secret>`.

## 3. Ekosistem TON
* **Provider Terpilih:** **TonAPI (TonConsole)**
* **Layanan:** REST API (`/v2/accounts/{address}/jettons` dan `/v2/accounts/{address}` untuk native TON) dan TonAPI Streaming/Webhooks.
* **Format Alamat TON:**
  * User-friendly base64url: `EQ...` (bounceable), `UQ...` (non-bounceable), `kQ...`, `0Q...` (48 karakter).
  * Raw hex format: `0:<64 karakter hex>` (total 66 karakter).

## 4. Ringkasan Master Webhooks & Secret Headers

| Provider | Chain Target | Endpoint Worker | Header Verifikasi |
| :--- | :--- | :--- | :--- |
| **Alchemy** | Ethereum, BSC, Base, Arbitrum, Polygon | `/webhooks/alchemy` | `X-Alchemy-Signature` (HMAC-SHA256) |
| **Helius** | Solana | `/webhooks/helius` | `Authorization: Bearer <secret>` |
| **TonAPI** | TON | `/webhooks/ton` | `X-Tonapi-Secret` (Header token) |
