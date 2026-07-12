# Handoff: Geostakes Arcade Redesign

## Overview
A redesign of the Geostakes landing page and core logged-in money-flow subpages, in an **arcade / neon-casino** aesthetic. Covers the marketing landing page, deposit, withdraw, and game-history screens, plus a reusable header, "credits" balance chip, and a chunky-press button system.

Geostakes is a real-money skill-betting product on GeoGuessr: users stake money per round, drop a location pin, and payout scales with guess accuracy.

## About the Design Files
The files in this bundle (`*.dc.html`) are **design references** — HTML/CSS/JS prototypes showing the intended look and behavior. They are **not production code to paste in**. They were authored in a lightweight component runtime ("DC") where each file has three parts: an HTML template, a logic class (`class Component extends DCLogic` — behaves like a React class component minus `render()`, exposing values via `renderVals()`), and optional props metadata.

The task is to **recreate these designs in the target codebase's existing environment** (React/Next, Vue, etc.) using its established components, styling approach, and routing — not to ship the HTML directly. The logic classes translate almost 1:1 to React function components with `useState`; treat them as behavior specs.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, states, and interactions. Recreate pixel-accurately with the codebase's own primitives. Exact tokens are in the Design Tokens section.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#08090a` | page background (near-black) |
| `--surf` | `#111114` | panels / cards |
| `--surf2` | `#191a1f` | inset surfaces, inputs, chips |
| `--line` | `#26272e` | all borders / dividers |
| `--acc` | `#39ff6a` | neon green — primary accent, positive money |
| `--accd` | `#1c7a3a` | darker green — button drop-shadow |
| `--gold` | `#ffc24d` | coin / bonus accent |
| `--red` | `#ff6b6b` | losses, over-limit, errors |
| `--txt` | `#f4f5f2` | primary text |
| `--dim` | `#8b8c95` | secondary/muted text, mono labels |

There is a subtle fixed dot-grid over the whole background: `radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px)` at `background-size:22px 22px`. The landing hero screen also has an optional CRT scanline overlay (repeating 1px black lines, `mix-blend-mode:multiply`).

### Typography
- **Display** — `'Saira Condensed'`, **italic**, weights 800/900, `text-transform:uppercase`, tight tracking (`-0.015em`). Used for all headings, button labels, stat values, balances, prices. This italic condensed uppercase is the signature of the brand.
- **UI / body** — `'Space Grotesk'`, weights 400–700. Paragraphs, nav links, table cells.
- **Mono** — `'Space Mono'`. Small labels, eyebrows, coords, legal, HUD readouts. Usually 10–12px, `letter-spacing:.16–.2em`, uppercase, color `--dim`.

Load from Google Fonts: `Saira+Condensed` (ital 800/900), `Space+Grotesk` (400–700), `Space+Mono` (400/700).

### Geometry & effects
- **Sharp edges everywhere.** Border radius is `0` on panels, inputs, chips, buttons — this is intentional and defines the arcade look. The only round things: avatar/coin circles, radio dots, status dots.
- **Chunky-press buttons** (see Button System below) — solid offset drop-shadow, no soft blur, no tilt.
- Spacing scale in practice: 8 / 10 / 12 / 16 / 18 / 22 / 26 / 32px.
- Content column widths: landing uses a 1240px `--wrap` max; single-flow pages (deposit/withdraw) use a **760px** centered column; history uses a 1160px wrap.

## Button System (critical, used on every page)
"Chunky press" — a flat neon button with a **solid** offset shadow (no blur) that physically depresses on click.

```css
/* primary / play / CTA */
.btn {
  font-family:'Saira Condensed'; font-style:italic; font-weight:900;
  text-transform:uppercase; border:none; cursor:pointer;
  background:var(--acc); color:#06180d;      /* dark green text on neon */
  box-shadow:0 6px 0 var(--accd);            /* solid drop, darker green */
  transition:transform .08s, filter .12s;
}
.btn:hover  { filter:brightness(1.08); }
.btn:active { transform:translateY(4px); box-shadow:0 2px 0 var(--accd); }
```
- Secondary / unselected chips: `background:var(--surf2)`, `color:var(--txt)`, `box-shadow:0 4px 0 #000`, `1px solid var(--line)`.
- Selected/active state: neon fill, `box-shadow:0 4px 0 var(--accd)`.
- Shadow depth scales with button size: small chips `0 3–4px`, hero Play `0 6–7px`. On `:active`, drop the shadow to ~`2px` and translate down by the difference.
- Disabled CTA: `background:var(--surf2)`, `color:var(--dim)`, `box-shadow:0 6px 0 #000`, `cursor:not-allowed`.
- "Busy" CTA (processing): swap accent to `--gold` with `box-shadow:0 6px 0 #8a6420`.

## Shared components

### Header (all pages)
Sticky, 76px tall, `rgba(8,9,10,.82)` + `backdrop-filter:blur(14px)`, bottom `1px solid --line`. Left: logo `GEO` + `STAKES` (the "STAKES" half in `--acc`), Saira italic 900, links to landing. Right cluster, all **40px tall, same height**:
- **Balance "credits" chip** — `--surf2` bg, `--line` border, 40px tall. A 26px gold gradient coin circle (`linear-gradient(140deg,#ffe08a,var(--gold) 45%,#d98a1a)`, subtle glow + inset highlight) showing `$`, then a stacked mono `Balance` label (8px) over a Saira-italic-900 green amount (19px).
- Logged-in only: **Deposit** button (neon chunky), **Withdraw** button (transparent, `--line` border), **Profile** button (`--surf2`, small pulsing green dot + "PROFILE", Saira italic 800 uppercase) opening a dropdown menu.

### Profile dropdown
Absolute panel under the button, `--surf` bg, `--line` border. Header row (username + "$X available"), then menu items (🎯 Game history → links to history page), divider, red "↩ Log out". Log out toggles back to a single **Login** button.

## Screens / Views

### 1. Landing (`Geostakes Landing.dc.html`)
Marketing homepage. Sections top→bottom:
- **Promo marquee** — full-width neon-green bar, dark text, infinite horizontal scroll (`@keyframes` translateX -50% over 26s, content duplicated for seamless loop). Copy: "100% match on your first deposit", rounds-played count, paid-out total, "instant cash-out", "no rake · no fees". Pauses under a `reduceMotion` flag.
- **Hero** — two columns (`1.05fr 1fr`, 56px gap). Left: a pill badge with pulsing dot ("N rounds played on Geostakes"), a huge display headline "Guess where you are. **Win money.**" (`clamp(54px,6.8vw,104px)`, last line green with text-shadow glow), a 19px sub, a **stake selector row**, and the **Play** CTA.
  - Stake selector: a `display:grid; grid-template-columns:1fr 1fr 2fr; gap:12px; max-width:440px` row — two preset chips ($0.50, $1.00) + a **custom amount input** (spans 2 cols, `$` prefix). Selecting a preset clears custom; typing a custom value deselects presets, turns the input border/shadow green, and updates the Play label. Play label is dynamic: `Play · $X.XX per round →`. The row width matches the 440px Play button beneath it.
  - Trust line under Play: "⚡ Instant payouts · 🔒 18+ where legal · 🎯 No repeats, ever".
- **Hero console (right column)** — a reimagined "arcade console" replacing a passive map card. A bezeled panel (`--surf`, radius 14px here — the hero console is the one rounded element, for a "screen" feel): HUD top row ("Solo mode · Ns left" + pulsing "LIVE"), a 16:11 "screen" with scanline overlay containing an `image-slot` (drop target for a Street View screenshot), a centered targeting reticle (4 corner brackets in neon + crosshair), a top time pill counting down. Below the screen: an accuracy meter bar (gold→green gradient) and a footer with "Stake $50.00" and a glowing "3.4×" potential multiplier. A live 1s countdown timer drives the "Ns left"/time pill (stops under `reduceMotion`).
- **Stats band** — 3 cells, `grid-template-columns:1fr 1fr 2.4fr`, `--surf`, `--line` dividers. Cell 1 "Paid out, all time" (count-up animated). Cell 2 "Total players" (count-up). Cell 3 is wider: "How it works" label + a Space-Grotesk headline "Guess the location. **Earn multipliers on accuracy.**" (green on the second half). Count-ups animate on mount with an ease-out cubic over ~1.7s (jump straight to final value under `reduceMotion`).
- **How it works** — eyebrow ("02 · The floor"), display H2, lede, then 3 step cards (`--surf`, big outlined number, uppercase display heading, mono-ish body, a bottom accent bar `linear-gradient(90deg,--acc,transparent)`).
- **Recent rounds** — eyebrow ("03 · The tape"), a table (`grid-template-columns:1.6fr .8fr .8fr .9fr .8fr`): player (colored avatar tile with initials + handle), stake, distance, payout (green wins / gold mid / dim busts; a "hot" big win gets a glowing row highlight), time-ago. ~10 rows.
- **FAQ** — eyebrow ("04 · Questions"), 5 accordion items. Each: mono number, uppercase display question, a "+" that rotates 45° to green when open; answer expands via `max-height` transition. Single-open behavior.
- **CTA panel** — bordered, radial green glow at top, centered display headline "Your first round is on the house.", lede, Play button "Claim & play →".
- **Footer** — logo, legal/responsible-gaming line, a Discord button (`#5865F2`), and Terms/Privacy/Responsible-play/Status links.

Tweakable props on this page: `loggedIn` (bool, toggles nav state), `accent` (color, overrides `--acc` at runtime via CSS var on root), `scanlines` (bool), `reduceMotion` (bool).

### 2. Deposit (`Deposit.dc.html`)
Single centered 760px column, 3 explicit steps. Header shows balance chip + Profile.
- Title "Add funds", trust chips (⚡ Instant credit · 💸 $0 deposit fees · 🔓 No holds on withdrawals).
- **Latest-deposits ticker** — slim bar, pulsing dot + "Latest deposits" mono label, then an infinite-scroll (16s) track of **pill items** (colored avatar + handle + green amount). Data duplicated for seamless loop.
- **Step 01 Amount** — custom `$`-prefixed input **first**, then a "Quick amounts" label, then 4 preset buttons ($10/$25/$50/$100). Below: a **100% first-deposit match** box (gold→green gradient border tint) — shows `+$X` matched and a message ("$50 in, $100 to play with"; min $10 to claim). The match is a full 100% (uncapped), not a fixed $10.
- **Step 02 Payment method** — two radio rows (`--surf2`, selected row gets green border + faint green wash + filled radio dot):
  - **Card** — 💳, "Most popular" pill, "Instant · secure checkout by Stripe". No card fields are collected in-app — Stripe owns card entry.
  - **Crypto · SOL** — Solana logo (inline SVG, purple→green gradient three-bar mark), "Instant · connect your wallet via WalletConnect". Selecting it reveals (progressive disclosure) an inline panel; once connected, a green "Wallet connected" card with truncated address + SOL balance + Disconnect.
- **Step 03 Confirm & pay** — a summary strip (Deposit / Bonus / You receive), then the CTA whose label/behavior depends on method+state:
  - amount < $10 → disabled "Enter at least $10".
  - card → "Pay $X.XX with Stripe →"; sub-copy names Stripe (redirect model). Busy: "Opening Stripe Checkout…".
  - crypto + no wallet → "Connect wallet" (simulated ~900ms handshake → connected).
  - crypto + connected → "Approve $X.XX in wallet →". Busy: "Awaiting approval in wallet…".
  - Trust list (no holds, licensed 18+, SSL/PCI, never see card/keys).

### 3. Withdraw (`Withdraw.dc.html`)
Mirror of deposit, inverted. Balance is `128.40` (constant `this.balance`).
- Title "Cash out", trust chips (Instant payout / $0 fees / No holds).
- **Latest-payouts ticker** (same component, payout amounts) — for a betting product, seeing others get paid is the key trust signal, so it's near the top.
- **Available-to-withdraw banner** — balance shown big + a note "Bonus funds must be wagered before they can be cashed out."
- **Step 01 Amount** — custom input + Quick amounts ($25/$50/$100 + **Max**). If amount > balance, the input turns red (`.over`) and an inline "You can withdraw up to $X" message shows; CTA blocks.
- **Step 02 Destination** — two radio rows: **Bank / Card** ("Fastest" pill, "Instant payout via Stripe", destination chosen in Stripe at checkout, no raw fields) and **Crypto · SOL** (WalletConnect, connected card as in deposit).
- **Step 03 Confirm payout** — summary (Withdrawing / Fees $0 / You receive), CTA states: <$10 disabled; over-balance disabled; card → "Withdraw $X →" (Stripe payout); crypto no wallet → "Connect wallet"; crypto connected → "Withdraw $X to wallet →". Trust list.

### 4. Game History (`Game History.dc.html`)
1160px wrap. Header shows balance chip + Profile (no "Back to game" — that link was removed from all subpages; the logo is the way home).
- Title "Game history" + sub. (Note: title/sub live in a `.wrap.top` — make sure it keeps the same 32px horizontal padding as the body wrap so left edges align.)
- **Summary stats** — 4 cells, `--surf`, `--line` dividers: Rounds played, Win rate (%), Total wagered ($), Net profit (green if ≥0 with `+`, red with `−` if negative).
- **Filter bar** — chunky chips All / Wins / Misses (active = neon fill) + a mono "N rounds" count that updates with the filter.
- **Rounds table** — `grid-template-columns:2.4fr 1fr 1.1fr 1fr 1.1fr 1fr`, header row in `--surf2`. Each row: location (a stylized "flag" tile = a `linear-gradient(135deg,c1,c2)` swatch with scanline overlay, + place name + mono coords), stake, distance, **multiplier** (Saira italic 900, green for wins / dim "—" for misses), **payout** (`+$X` green wins / `$0.00` red misses), and a result badge ("Win" green outline / "Miss" dim outline). ~12 rows; wins are `pay>0`.
- Responsive: at ≤820px the stats go 2-col and the table hides stake/distance/time columns.

## Interactions & Behavior
- **Navigation**: logo → landing; nav Deposit/Withdraw buttons → deposit/withdraw pages; Profile menu "Game history" → history. In the real app these become router links.
- **Landing stake selector**: preset ↔ custom mutual exclusivity; Play label reflects the active stake.
- **Count-ups** (landing stats): ease-out cubic (`1-(1-p)^3`) over ~1700ms on mount.
- **Marquee / ticker**: pure CSS keyframe translateX to -50% with duplicated content; respect `prefers-reduced-motion`.
- **Deposit/Withdraw CTA state machine**: amount validity → method → wallet-connected → busy transitions. Wallet connect and payment submit are simulated with `setTimeout` (900ms connect, ~2200ms busy) — replace with real Stripe Checkout redirect and WalletConnect calls.
- **FAQ accordion**: single-open, `max-height` transition (~0.32s).
- **History filter**: filters the row set and recomputes the visible count.

## State Management
- Landing: `stake` (preset index), `custom` (string), `openFaq` (index, -1 = none), `secs` (countdown), `loggedIn` (bool), `menuOpen` (bool), plus animated `paid`/`players`/`rounds`.
- Deposit: `amount` (number), `method` ('card' | 'crypto'), `walletConnected` (bool), `busy` (bool).
- Withdraw: same as deposit; `balance` is a constant to validate against.
- History: `filter` ('all' | 'wins' | 'losses'); all derived stats computed from a static rounds array.
All data is mocked inline — wire to real balance, transactions, and round history APIs.

## Payments integration notes
- **Fiat = Stripe.** Do NOT build card-number/expiry/CVC fields. Use Stripe Checkout / Elements; the UI intentionally defers card entry to Stripe and says so. Deposit button opens Checkout; withdrawals are Stripe payouts with destination chosen there.
- **Crypto = SOL via WalletConnect.** No manual address entry on deposit — connect wallet then approve a SOL transfer. Withdraw sends SOL to the connected wallet. Wallet provider label is a placeholder ("our wallet provider") — swap for the real provider name. There is intentionally **no network picker** and **no chain badges** — it's SOL only.

## Assets
- **Fonts**: Saira Condensed, Space Grotesk, Space Mono (Google Fonts).
- **Solana logo**: inline SVG (three angled bars, purple→green gradient) — reproduced in-file, no external asset.
- **image-slot.js**: a small web component used only in the landing hero as a drag-drop image placeholder (user drops a Street View screenshot). Replace with your real map/street-view embed in production.
- Avatars, flags, and the hero "screen" are CSS-generated (gradients + initials) — no image files. No real brand imagery is included.

## Files
- `Geostakes Landing.dc.html` — landing page (template + logic + tweak props).
- `Deposit.dc.html` — deposit flow.
- `Withdraw.dc.html` — withdraw flow.
- `Game History.dc.html` — game history.
- `Arcade Buttons.dc.html` — the button-style exploration (4 variants); "chunky press" is the chosen one, documented above. Reference only.
- `image-slot.js` — drag-drop image placeholder web component (landing hero only).

Each `.dc.html` is one HTML file: the markup between `<x-dc>…</x-dc>`, a `<style>` block in `<helmet>`, and a `<script type="text/x-dc">` holding the `Component` logic class. Read the `<style>` block for exact values and the logic class for exact behavior/copy.
