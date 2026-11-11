---
name: Japandi Asset Tracker
colors:
  # Light Mode (Paper & Linen - Default)
  surface: '#F8F7F4'
  surface-dim: '#ECE7E0'
  surface-bright: '#FAF9F6'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F5F3EF'
  surface-container: '#EFECE6'
  surface-container-high: '#E9E5DE'
  surface-container-highest: '#E3DFD7'
  on-surface: '#2C2623'
  on-surface-variant: '#5C554E'
  outline: '#EAE6DF'
  outline-variant: '#F1EDE7'
  primary: '#2C2623'
  on-primary: '#FFFFFF'
  primary-container: '#453D38'
  on-primary-container: '#F5F3EF'
  secondary: '#685D4C'
  on-secondary: '#FFFFFF'
  secondary-container: '#E8DFD1'
  on-secondary-container: '#4A4032'
  accent: '#D6C7B2'
  accent-light: '#E8DFD1'
  
  # Semantic Tones (WCAG AA Compliant >= 4.5:1)
  gain: '#2E6A34'
  gain-container: '#EBF4EC'
  loss: '#A83832'
  loss-container: '#FAEDEC'

  # Multi-Chain Mineral Palette (Donut Chart & Network Allocation)
  chain-ton: '#3B728C'
  chain-evm: '#9E7B56'
  chain-solana: '#5F8569'
  chain-other: '#857F78'

  # Dark Mode (Sumi Ink & Basalt Stone - TG Dark Mode Sync)
  dark:
    surface: '#161514'
    surface-dim: '#11100F'
    surface-bright: '#24211E'
    surface-container-lowest: '#1C1A18'
    surface-container-low: '#201E1C'
    surface-container: '#282522'
    surface-container-high: '#302C29'
    surface-container-highest: '#383430'
    on-surface: '#EDE8E3'
    on-surface-variant: '#A59B91'
    outline: '#2E2B27'
    outline-variant: '#3D3833'
    primary: '#EDE8E3'
    on-primary: '#161514'
    secondary: '#D6C7B2'
    on-secondary: '#161514'
    gain: '#78C27E'
    gain-container: '#142E18'
    loss: '#E5736E'
    loss-container: '#381A19'
    chain-ton: '#5A94B0'
    chain-evm: '#BD966E'
    chain-solana: '#7BA486'
    chain-other: '#A39D96'

typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  # Mobile Input must be 16px to prevent iOS Webview automatic zoom
  input-text:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  balance-display:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 38px
    letterSpacing: -0.03em
  balance-display-mobile:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.025em
  balance-sub:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em

rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  full: 9999px

spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem

z-index:
  base: 0
  card: 1
  sticky-header: 10
  bottom-nav: 30
  modal-sheet: 40
  toast: 50
  telegram-overlay: 100
---

## 1. Brand & Aesthetic Philosophy

This design system blends Japanese wabi-sabi restraint with Scandinavian functional simplicity (**Japandi**) specifically architected for a mobile Telegram Mini App (TMA). It serves discerning cryptocurrency investors who value quiet luxury, mindful wealth tracking, and an uncluttered visual landscape devoid of gamified noise, flashing alerts, and hyper-saturated neon gradients.

### Core Principles
- **Ma (間 - Negative Space):** Intentional emptiness gives every data point room to breathe. Whitespace is treated as a primary layout structure, not wasted screen area.
- **Crafted Simplicity:** Surfaces emulate warm unbleached paper, matte wood, and ceramic stone rather than cold glassy plastic or high-frequency drop shadows.
- **Tabular Precision:** Cryptographic balances and delta percentages receive mathematical exactness via monospaced glyphs (`JetBrains Mono`), juxtaposed against warm, humanist sans-serif navigation elements (`Inter`).
- **Calm Observability:** Watch-only monitoring is passive and contemplative. Visual states soothe anxiety rather than induce trade urgency.

---

## 2. Color System & Accessibility (WCAG AA)

The palette establishes an organic, grounded environment rooted in natural finishes. All foreground/background color combinations strictly satisfy **WCAG 2.1 AA** contrast requirements (minimum **4.5:1** for standard text and **3.0:1** for UI components/large typography).

### 2.1 Light Theme (Paper & Linen - Default)
- **Canvas Base (`#F8F7F4`):** An airy, unbleached warm linen off-white that eliminates screen glare inside mobile Telegram client viewports.
- **Card & Surface (`#FFFFFF`):** Pure chalk white, establishing separation from the base canvas using subtle tonal contrast and hair-thin structural boundaries.
- **Primary Text & Headings (`#2C2623`):** Deep charcoal umber replacing harsh absolute black (`#000000`). Contrast ratio: **12.5:1** on canvas.
- **Subdued Text & Meta (`#5C554E`):** Weathered earth stone for timestamps, secondary labels, and addresses. Contrast ratio: **5.6:1** on white, **5.1:1** on canvas (meets WCAG AA).
- **Structural Borders (`#EAE6DF`):** Ultra-fine 1px boundaries defining cards, inputs, and tab separators.
- **Dividers (`#F1EDE7`):** Hairline insets between list items.
- **Warm Beige Accent (`#D6C7B2` base, `#E8DFD1` surface tint):** Used for non-destructive selections, active filters, and timeframe chips.

### 2.2 Dark Theme: "Sumi-e & Basalt Stone" (Telegram Dark Mode Sync)
Automatically activated when Telegram's `themeParams.is_dark` is true:
- **Dark Canvas (`#161514`):** Deep warm sumi ink ground (not pure OLED `#000000`), preserving organic wabi-sabi warmth.
- **Dark Card Surface (`#201E1C`):** Warm basalt stone.
- **Dark Primary Text (`#EDE8E3`):** Soft linen cream text. Contrast ratio: **13.2:1**.
- **Dark Subdued Text (`#A59B91`):** Muted sand gray. Contrast ratio: **5.2:1**.
- **Dark Structural Borders (`#2E2B27`):** Soft graphite boundary.

### 2.3 Semantic Indicators (Performance & Cash Flow)
Designed to convey directional state with emotional calmness:
- **Gain / Inbound (+):**
  - Light Mode: Text **`#2E6A34`** on Container **`#EBF4EC`** (Contrast ratio: **4.8:1** - WCAG AA compliant).
  - Dark Mode: Text **`#78C27E`** on Container **`#142E18`** (Contrast ratio: **5.5:1**).
- **Loss / Outbound (−):**
  - Light Mode: Text **`#A83832`** on Container **`#FAEDEC`** (Contrast ratio: **4.6:1** - WCAG AA compliant).
  - Dark Mode: Text **`#E5736E`** on Container **`#381A19`** (Contrast ratio: **5.2:1**).

### 2.4 Multi-Chain Mineral Palette (Donut Chart & Network Allocation)
Replaces harsh neon blockchain brand colors with harmonized ceramic mineral tones:
- **TON:** Muted Mineral Cyan / Slate (`#3B728C`, Dark: `#5A94B0`)
- **EVM (Ethereum, BNB, Base):** Warm Amber Sandstone (`#9E7B56`, Dark: `#BD966E`)
- **Solana:** Muted Moss Sage (`#5F8569`, Dark: `#7BA486`)
- **Other / Dust Networks:** Weathered Pebble Gray (`#857F78`, Dark: `#A39D96`)

---

## 3. Typography & Hierarchy

### 3.1 Typeface Roles
- **Interface & Narrative (`Inter`):** Clean, neutral geometry ensuring razor-sharp legibility across Telegram's webview wrapper on iOS, Android, and Desktop.
- **Financial Balances & Addresses (`JetBrains Mono`):** Monospaced figures enforce strict columnar alignment for currency values, portfolio totals, delta percentages, and truncated public hex keys (`0x71C...3a9`).

### 3.2 Mobile-First Typography Scale & Safeguards
- **Balance Display:** `32px` (`28px` on mobile), weight `500`, line-height `34px`, letter-spacing `-0.025em`.
- **Headings (lg / md / sm):** `26px` / `22px` / `18px`, weight `600` / `600` / `500`.
- **Body (lg / md / sm):** `16px` / `14px` / `12px`.
- **Public Key / Address Badges:** `12px` JetBrains Mono, weight `400`.
- **CRITICAL iOS Safari & Webview Rule:**
  > [!IMPORTANT]
  > All `<input>` and `<textarea>` controls MUST render with `font-size: 16px` (`input-text`). Font sizes below 16px on iOS WebViews trigger an automatic viewport zoom that disrupts the Telegram Mini App frame.

---

## 4. Telegram Mini App (TMA) Platform Integration

### 4.1 Viewport, Gestures & Safe Areas
- **Vertical Swipe Collision:** By default, dragging down inside a Telegram Mini App can collapse the entire webview modal. The app must execute `swipeBehavior.disableVerticalSwipe()` (via `@telegram-apps/sdk-react`) when scrolling long asset lists.
- **Expanded Mode:** Invoke `viewport.expand()` on initial mount to maximize vertical screen real estate.
- **Viewport Heights:** Always use `min-h-[100dvh]` or `--tg-viewport-stable-height` rather than raw `100vh` to avoid layout jumps when the Telegram top header and keyboard open/close.
- **Top & Bottom Insets:**
  - Top padding: Dynamic padding bound to Telegram's header bar (38px to 54px).
  - Bottom padding: `calc(env(safe-area-inset-bottom, 0px) + 5rem)` to clear the floating bottom navigation bar.

### 4.2 Native Telegram Controls Coordination
- **Native BackButton:** When the user enters a sub-flow (e.g. Add Wallet modal, Network breakdown detail), show Telegram's native `BackButton` (`Telegram.WebApp.BackButton.show()`). When back at root (`Home`), hide it.
- **Native MainButton:** Used optionally for full-width sticky actions (e.g. *"Confirm Watch-Only Wallet"*).
- **Haptic Feedback:** Tactile response adds a physical, crafted dimension to the Japandi interface:
  - `HapticFeedback.selectionChanged()`: Triggered on timeframe changes (1D / 1W / 1M) and bottom navigation tab switches.
  - `HapticFeedback.notificationOccurred('success')`: Triggered when an address or transaction hash is copied to clipboard, or when a real-time deposit arrives.
  - `HapticFeedback.impactOccurred('light')`: Triggered on accordion open/close.

---

## 5. Touch & Interaction Guidelines

### 5.1 Touch Target Boundaries
- **Minimum Interactive Area:** All interactive elements (icon buttons, pills, dropdown triggers) must provide a hit-test area of at least **44×44px** (Apple HIG) or **48×48px** (Material Design).
- **Icon Buttons:** Visual container may be styled at 36px–40px, but wrapped in a hit-area padding of `min-w-[44px] min-h-[44px]` with `flex items-center justify-center`.
- **List Rows & Asset Items:** Full-bleed horizontal tap target with a minimum row height of **48px**.

### 5.2 Micro-Interactions & Transitions
- **Interaction Timing:** 150ms to 240ms duration with easing curves: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `ease-out` for exits.
- **State Feedback:** Press states shift opacity to `0.88` or apply a soft background tint (`#E8DFD1` at 30% in light mode; `#2E2B27` in dark mode). Never introduce layout-shifting borders or scales that trigger reflow.
- **Reduced Motion:** Honor `@media (prefers-reduced-motion: reduce)` by disabling spring animations and replacing them with simple opacity cross-fades.

---

## 6. Cryptocurrency & Network Iconography System

Because official cryptocurrency logos (Bitcoin 🟠, Ethereum 🔷, Solana 🟣, USDT 🟢, TON 🔵) are vibrant and multi-colored, they must be housed in a standardized ceramic container to harmonize with Japandi calm while preserving instant visual recognizability.

### 6.1 The Ceramic Emblem Container
- **Token Avatar Frame:** Fixed circular container of `36×36px` (or `40×40px` in Hero displays).
- **Background & Perimeter:** Filled with `#FAF9F6` (Dark: `#24211E`) bounded by `1px solid #EAE6DF` (Dark: `#2E2B27`).
- **Inner Logo Asset:** Official SVG/PNG asset centered with `5px` internal padding (active graphic diameter ~`26px`).

### 6.2 Multi-Chain Badge Overlays (Chain Affinity)
- **Nested Network Badge:** A mini `14×14px` or `16×16px` circular badge positioned at `bottom: -2px; right: -2px` of the primary token avatar.
- **Knockout Ring:** Surrounded by a `1.5px solid #FFFFFF` (Dark: `#201E1C`) knockout ring to ensure clean separation from the parent coin glyph.
- **Accordion Children:** In an expanded multi-network row (e.g. USDT on TON vs ETH vs SOL), the sub-row uses a `20×20px` flat network circle.

### 6.3 Standard Asset Sources & CDNs (Production-Ready)
1. **Primary Network Logos (SVG/PNG):**
   - **TON:** `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png`
   - **Ethereum:** `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png`
   - **Solana:** `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png`
   - **BNB Chain:** `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png`
   - **Base:** `https://raw.githubusercontent.com/base-org/brand-kit/main/logo/in-product/Base_Network_Logo.svg`
2. **Dynamic Token Logos:**
   - Populated directly from DexScreener / CoinGecko API responses (`imageUrl` property) or TrustWallet Token Assets:  
     `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{chain}/assets/{contract_address}/logo.png`
3. **Local Vector Icons (Optional Bundle):**  
   - Install `@web3icons/react` for instant zero-latency SVG rendering of popular tokens without external image requests.

### 6.4 Wabi-Sabi Monogram Fallback
When a custom or unindexed token has no image or the CDN returns 404:
- Render a circular clay container (`#EFECE6`, Dark: `#282522`) with `1px solid #EAE6DF`.
- Display the first 2 characters of the token ticker (e.g., **"US"**, **"PE"**, **"CA"**) in `JetBrains Mono` 11px, weight `600`, color `#2C2623` (Dark: `#EDE8E3`). Never show broken image placeholder icons.

---

## 7. Component Specifications

### 7.1 Buttons
- **Primary Action (Add Wallet / Track Asset):**
  - Background: `#2C2623` (Light) / `#EDE8E3` (Dark).
  - Text: `#FFFFFF` (Light) / `#161514` (Dark), font `Inter` 14px weight `500`.
  - Border radius: `0.75rem` (12px).
  - Height: `44px` minimum. Active opacity `0.88`.
- **Secondary / Ghost Button (Share to Chat, Export):**
  - Background: Transparent, border `1px solid #EAE6DF`.
  - Text: `#2C2623` (Light) / `#EDE8E3` (Dark).
  - Active: Fills with `#E8DFD1` at 35% opacity.
- **Icon Button:**
  - Minimum tap zone `44×44px`. Visual glyph size `20px` vector icon (Lucide or Heroicons; no emojis for system controls).

### 7.2 Bento Overview & Hero Portfolio Card
- **Structure:** Pure white `#FFFFFF` surface (Dark: `#201E1C`), crisp `1px solid #EAE6DF` outline, `1.25rem` (20px) border-radius.
- **Balance Layout:** Net worth rendered in `balance-display-mobile` (`28px` JetBrains Mono).
- **Directional Tag:** Compact pill displaying signed 24h performance (`+2.45%` in Gain colors or `−1.12%` in Loss colors).
- **Sparkline Chart:**
  - Stroke width: `1.5px` or `2px`.
  - Stroke color: Sage Green (`#2E6A34`), Terracotta (`#A83832`), or Charcoal (`#2C2623`) for flat periods.
  - Zero heavy gradient fill; optional subtle vertical falloff from 6% opacity to 0%.
  - Scrubber touch area: Minimum 44px vertical touch strip with live value badge in `mono-data`.

### 7.3 Persistent Floating Bottom Navigation Bar
- **Positioning:** Floating fixed bar at screen bottom, offset by `1rem` horizontal margins and `env(safe-area-inset-bottom)`.
- **Dimensions & Glassmorphism:** Height `56px`, border-radius `9999px` (pill), background `rgba(248, 247, 244, 0.88)` (Dark: `rgba(22, 21, 20, 0.88)`), `backdrop-filter: blur(16px)`, border `1px solid #EAE6DF`.
- **Tab Structure (3 Tabs):**
  1. `🏠 Home`: Overview, Bento balance, asset accordion, and recent mutations.
  2. `📈 Perf.`: Historical performance charts and portfolio metrics.
  3. `⚙️ Settings`: Wallet management, notifications toggle, and currency denomination.
- **Active Tab Styling:** Encased in an unobtrusive oval background `#E8DFD1` (Dark: `#2E2B27`), text color `#2C2623` (Dark: `#EDE8E3`), weight `600`.
- **Inactive Tab Styling:** Text and vector icon in `#5C554E`, weight `400`. Tap targets strictly `min-w-[44px] min-h-[44px]`.

### 7.4 Multi-Chain Allocation Donut Chart
- **Dimensions:** Compact donut with an outer diameter of `120px` and inner cutout of `84px` (stroke width `18px`).
- **Center Metric:** Total count of active networks (e.g. `3 Chains` or dominant `%`) rendered in `label-sm`.
- **Segment Spacing:** `2px` separator gap between slices.
- **WCAG Legend Requirement:** Accompanied by an adjacent vertical list showing color swatch (8×8px rounded), network name (`Inter` 13px), and explicit percentage (`JetBrains Mono` 13px) so color is never the single differentiator.

### 7.5 Chain Abstraction Accordion (Token Row)
- **Resting Row:** Left token avatar (36px Ceramic Emblem with optional mini chain badge), token name (`body-md` in `#2C2623`), holdings count (`mono-data` in `#5C554E`). Right-aligned fiat value (`balance-sub`) stacked above network pill (`🌐 3 Networks`).
- **Expanded Breakdown:** Slides open smoothly (200ms `ease-out`) revealing per-chain cards (TON, ETH, SOL) with dedicated **Copy Address** and **Share to Chat** ghost actions.

### 7.6 Real-Time In-App Notification Toast
- **Trigger:** Webhook pushes incoming transaction or deposit while the user is actively viewing the TMA.
- **Placement & Motion:** Slides down from viewport top (`translate-y: -20px` to `0px`, 200ms `ease-out`), auto-dismisses after 4 seconds.
- **Visual Design:** Pill card with `#FFFFFF` (Dark: `#201E1C`), border `1px solid #EAE6DF`, subtle ambient shadow. Left green incoming icon (`↓ Received`), token delta (`+50 TON (~$250.00)`), and right action text `[ Explorer ↗ ]`.
- **Haptic Pairing:** Fires `HapticFeedback.notificationOccurred('success')`.

### 7.7 Address Input Field (Smart Textarea)
- **Geometry:** Height 48px or multi-line min 56px, border radius `0.75rem` (12px).
- **Resting:** Background `#FFFFFF` (Dark: `#201E1C`), border `1px solid #EAE6DF`.
- **Text:** `JetBrains Mono` at **`16px`** (prevents iOS auto-zoom), color `#2C2623`.
- **Placeholder:** `#5C554E` with 70% opacity (ensuring WCAG readability).
- **Focus:** Border transitions to `#2C2623` (Dark: `#EDE8E3`) with smooth 150ms ease. No fluorescent focus rings.
- **Utility Slot:** Right-side inline actions for *"Paste"* or *"Scan QR"* with minimum 44px tap zone.

### 7.8 Onboarding "Trust-Building" Empty State & Whale Demo Mode
- **Hero Card (First-Time User):**
  - Minimalist line illustration of stone balance or ceramic vessel.
  - Headline: *"Lacak asetmu tanpa rasa waswas."* (`headline-md`).
  - Subtitle: *"Cukup tempelkan alamat publikmu. Mendukung Ethereum, BNB, Base, Solana, dan TON. 100% Watch-Only."* (`body-md`).
  - Action Duo:
    - Primary Button: `[ + Tambah Alamat Baru ]`
    - Secondary Ghost Button: `[ 👀 Coba Versi Demo ]` (instantly loads public whale wallet data).
- **Active Demo Banner:** When Demo Mode is running, an unobtrusive warm beige bar sits at the top: *"Mode Demo: Portofolio Contoh Whale"* with a *"Keluar"* button.

### 7.9 Loading & Skeleton Shimmer
- **Shimmer Effect:** Replaces cold gray spinners with a gentle, organic warm-linen shimmer:
  - Light mode: Gradient cycling from `#EFECE6` through `#F8F7F4` to `#EFECE6`.
  - Dark mode: Gradient cycling from `#201E1C` through `#282522` to `#201E1C`.

---

## 8. Layout, Safe Areas & Z-Index Architecture

```
┌──────────────────────────────────────────────┐
│ Telegram Native Header (Dynamic Safe Area)   │  z-10
├──────────────────────────────────────────────┤
│ In-App Real-Time Toast Banner                │  z-50
├──────────────────────────────────────────────┤
│ Page Content / Bento Cards / Asset List      │  z-0 to z-1
├──────────────────────────────────────────────┤
│ Floating Bottom Navigation Bar (56px)        │  z-30
├──────────────────────────────────────────────┤
│ Bottom Sheet / Add Wallet Modal & Backdrop   │  z-40
├──────────────────────────────────────────────┤
│ Telegram Bottom Gesture Inset (Safe Area)    │
└──────────────────────────────────────────────┘
```

---

## 9. Next.js & Tailwind CSS Configuration (`tailwind.config.ts`)

Direct drop-in configuration for the Next.js project to bind these design tokens seamlessly:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#F8F7F4",
          dark: "#161514",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dim: "#ECE7E0",
          dark: "#201E1C",
          "dark-dim": "#11100F",
        },
        brand: {
          primary: "#2C2623",
          "primary-dark": "#EDE8E3",
          subdued: "#5C554E",
          "subdued-dark": "#A59B91",
          border: "#EAE6DF",
          "border-dark": "#2E2B27",
          divider: "#F1EDE7",
          "divider-dark": "#3D3833",
          accent: "#D6C7B2",
          "accent-light": "#E8DFD1",
        },
        semantic: {
          gain: "#2E6A34",
          "gain-bg": "#EBF4EC",
          "gain-dark": "#78C27E",
          "gain-dark-bg": "#142E18",
          loss: "#A83832",
          "loss-bg": "#FAEDEC",
          "loss-dark": "#E5736E",
          "loss-dark-bg": "#381A19",
        },
        chain: {
          ton: "#3B728C",
          evm: "#9E7B56",
          solana: "#5F8569",
          other: "#857F78",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        bento: "1.25rem",
        tile: "1rem",
        button: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 10. Implementation Checklist for AI Agents & Developers

Before shipping UI code, verify against this checklist:
- [ ] **Contrast Verification:** All text elements meet 4.5:1 ratio against their immediate background.
- [ ] **iOS Auto-Zoom Guard:** All text inputs and textareas have `font-size: 16px` on mobile screens.
- [ ] **Touch Targets:** Every interactive icon, tab, and button has `min-height: 44px` and `min-width: 44px`.
- [ ] **TMA Swipe Lock:** `swipeBehavior.disableVerticalSwipe()` is activated on scrollable views.
- [ ] **Telegram Theme Sync:** App reads Telegram `themeParams` and seamlessly switches between Light Linen and Basalt Dark.
- [ ] **Telegram Haptics:** Native haptic triggers are tied to copy, tab change, timeframe selection, and toast arrival.
- [ ] **Ceramic Emblem Logos:** Token and chain logos render inside the `36×36px` ceramic container with automatic 2-letter monogram fallback.
- [ ] **Accessible Donut Chart:** Multi-chain allocation chart includes numerical % in text legend (not color-only).
- [ ] **No Emoji System Icons:** Structural navigation and UI controls use clean vector SVGs (e.g., Lucide-React).
