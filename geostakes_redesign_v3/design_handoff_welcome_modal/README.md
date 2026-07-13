# Handoff: Geostakes Welcome Modal ($5 free-play)

## Overview
A **post-signup welcome modal** for Geostakes (real-money skill-betting on GeoGuessr), in the arcade / neon-casino aesthetic. Shown once, on the landing page, immediately after a user creates an account: it tells them they've been granted **$5 free** — 5 rounds at $1 each — to try the game with no deposit.

## Where it lives in the design file
The modal is implemented **inside `Geostakes Landing.dc.html`** (it's an overlay on the landing page, not a standalone page). To find it in that file:
- **Markup**: the `<div class="overlay …">` block appended right after the page `</footer>`, at the very end of the template. It contains `.modal` → `.mtop` (coin + title) and `.mbody` (copy, round tokens, CTA, fine print).
- **Styles**: all the `.overlay`, `.modal`, `.mtop`, `.mcoin`, `.mtitle`, `.mbody`, `.mrounds`, `.token`, `.mcta`, `.mfine` rules in the `<style>` block.
- **Logic**: in the `Component` class — `state.welcomeClosed`, and in `renderVals()` the `welcomeCls`, `closeWelcome`, and `tokens` values; gated by a `showWelcome` prop.

`Geostakes Landing.dc.html` is included in this bundle purely as the **source reference** — read those three areas. Recreate the modal in your codebase's own framework/components. This is a **design reference, not production code to paste in.**

## Fidelity
High-fidelity. Exact tokens, type, and copy below.

## Design Tokens (shared Geostakes system)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#08090a` | page background |
| `--surf` | `#111114` | modal body background |
| `--surf2` | `#191a1f` | round token tiles |
| `--line` | `#26272e` | borders |
| `--acc` | `#39ff6a` | neon green accent |
| `--accd` | `#1c7a3a` | button drop-shadow |
| `--gold` | `#ffc24d` | coin |
| `--txt` | `#f4f5f2` | primary text |
| `--dim` | `#8b8c95` | muted / mono text |
| dark-on-green text | `#06180d` | CTA + coin text |

### Typography
- **Display** — `'Saira Condensed'`, italic, 900, uppercase, tracking `-.015em`. Title, coin `$`, CTA, token amounts.
- **UI** — `'Space Grotesk'`, 400–700. The lede paragraph.
- **Mono** — `'Space Mono'`. Kicker, token "Round N" labels, fine print (~10–11px, `letter-spacing:.1–.22em`, uppercase, `--dim`).
- Google Fonts: `Saira+Condensed` (ital 900), `Space+Grotesk`, `Space+Mono`.

### Geometry
Sharp edges (border-radius `0`) on the modal, tokens, and CTA. The only round element is the circular gold coin. Chunky-press CTA (solid offset shadow, translate-down on `:active`).

## Structure & styling
- **Overlay** — `position:fixed; inset:0; z-index:100`, `rgba(4,5,6,.8)` + `backdrop-filter:blur(6px)`, flex-centered, 24px padding. Fades in (`@keyframes fadein`, .25s).
- **Modal** — `max-width:440px`, `--surf` bg, `1px solid --line`, big drop shadow `0 40px 120px -30px #000`. Pops in (`@keyframes pop`: translateY(16px) scale(.97) → none, cubic-bezier(.2,1.2,.4,1), .28s).
- **Top band (`.mtop`)** — dark green gradient `linear-gradient(150deg,#0e2a18,#0a1a10)`, green-tinted bottom border, centered, with a faint green dot-grid overlay (`::after`). Contains:
  - **✕ close** (`.mx`) top-right, mono, dim→white on hover.
  - **Gold coin (`.mcoin`)** — 74px circle, `linear-gradient(140deg,#ffe08a,var(--gold) 45%,#d98a1a)`, glow + inset highlight, displays `$`.
  - **Kicker** (mono, green): "Welcome to Geostakes".
  - **Title** (`.mtitle`, display 44px): "You've got **$5 free**" — "$5 free" in green with glow.
- **Body (`.mbody`)**:
  - **Lede**: "Your account's loaded with **$5** on the house — that's **5 rounds at $1 each** to test your skills. No deposit needed to start." (bold spans in `--txt`).
  - **Round tokens (`.mrounds`)** — a row of **5** square tiles, each showing "$1" (green display) over a mono "Round N" label. (Generated from `tokens: [1,2,3,4,5]`.)
  - **CTA (`.mcta`)** — full-width neon chunky button: "Play my first round →".
  - **Fine print (`.mfine`)** — mono: "Free-play winnings are withdrawable after your first deposit · 18+ where legal".

## Behavior
- **Visibility** is gated by a `showWelcome` prop AND `!state.welcomeClosed`. In the design, `showWelcome` defaults true so it previews; **in your codebase, render the modal only on the post-signup redirect** (e.g. a `?welcome=1` param or a first-login flag), not on every landing visit.
- **Dismiss**: both the ✕ and the "Play my first round →" CTA set `welcomeClosed = true`, hiding the overlay. In production: the CTA should start/route to the user's first free round; the ✕ just closes. After dismissal, don't show it again (clear the flag server-side or in storage).
- No backdrop-click-to-close is wired in the reference; add it if you want (click on `.overlay` but not `.modal`).

## Integration notes
- This is a **one-time** onboarding modal — tie it to a "has-seen-welcome" flag so it never reappears.
- The **$5 / 5 rounds / $1 each** figures and the "withdrawable after first deposit" condition are business terms — keep them in sync with your actual promo/bonus rules and make them server-driven rather than hardcoded.
- Keep the "18+ where legal" / responsible-gaming line (compliance).
- Depends on the shared Geostakes tokens, fonts, and chunky-button style already documented in the main handoff — reuse those primitives.

## Assets
- Fonts: Saira Condensed, Space Grotesk, Space Mono (Google Fonts).
- Coin and tokens are pure CSS — no image files.

## Files
- `Geostakes Landing.dc.html` — source reference; the modal is the `.overlay` block after `</footer>` plus its `.overlay`/`.modal`/`.m*`/`.token` styles and the `welcomeCls`/`closeWelcome`/`tokens`/`showWelcome` logic.
