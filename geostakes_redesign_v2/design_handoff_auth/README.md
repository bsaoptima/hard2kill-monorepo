# Handoff: Geostakes Auth Page

## Overview
A single combined **sign-up / log-in** page for Geostakes (real-money skill-betting on GeoGuessr), in the arcade / neon-casino aesthetic. Conversion-optimized: one page with an in-place toggle (no reload), sign-up as the default state, one-tap options first, minimal fields, and a value panel beside the form.

## About the Design File
`Auth.dc.html` is a **design reference** — an HTML/CSS/JS prototype of the intended look and behavior, authored in a lightweight component runtime ("DC"). It is **not production code to paste in**. Recreate it in the target codebase's own framework (React/Next, Vue, etc.), components, styling, and routing. The file has three parts: an HTML template (between `<x-dc>…</x-dc>`), a `<style>` block in `<helmet>`, and a `Component` logic class (behaves like a React class component minus `render()`, exposing values via `renderVals()`) — treat the class as a behavior/copy spec; it maps ~1:1 to a React function component with `useState`.

## Fidelity
High-fidelity. Exact colors, type, spacing, and states below.

## Design Tokens
Same system as the rest of the Geostakes redesign.

### Colors
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#08090a` | page background |
| `--surf` | `#111114` | panels |
| `--surf2` | `#191a1f` | inputs, secondary buttons |
| `--line` | `#26272e` | borders / dividers |
| `--acc` | `#39ff6a` | neon green accent |
| `--accd` | `#1c7a3a` | button drop-shadow (darker green) |
| `--gold` | `#ffc24d` | bonus accent |
| `--txt` | `#f4f5f2` | primary text |
| `--dim` | `#8b8c95` | muted text / mono labels |
| dark button text | `#06180d` | text on neon-green fills |

Fixed dot-grid over the page background: `radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px)` at `background-size:22px 22px`.

### Typography
- **Display** — `'Saira Condensed'`, italic, 800/900, uppercase, tracking `-.015em`. Headings, button labels, bonus figure, avatar initials.
- **UI** — `'Space Grotesk'`, 400–700. Inputs, body, toggle text.
- **Mono** — `'Space Mono'`. Field labels, "or with email", badges, legal — ~10–11px, `letter-spacing:.1–.2em`, uppercase, `--dim`.
- Google Fonts: `Saira+Condensed` (ital 800/900), `Space+Grotesk` (400–700), `Space+Mono` (400/700).

### Geometry
Sharp edges everywhere (border-radius `0`) except the circular stacked avatars, the checkbox is square. Chunky-press buttons: solid offset shadow, no blur, translate-down on `:active`.

## Layout
Full-height page. Centered 76px header (just the `GEO`+neon `STAKES` logo, links home). Body is a **two-column `1fr 1fr` grid, max-width 1080px**:
- **Left = form side** — centered, `max-width:400px` card.
- **Right = value side** — border-left, `#0b0c0f` bg, marketing/reassurance content, vertically centered.
- **≤820px**: value side is `display:none`; the form takes the full width so it leads on mobile.

## Form side (left)
Top→bottom:
1. **Heading + sub** (swap by mode):
   - Sign-up: "Create account" / "Your first deposit is matched 100%. Set up in under a minute."
   - Login: "Welcome back" / "Log in to keep playing and cash out your winnings."
2. **OAuth / one-tap buttons** (`.oauth`, stacked, 52px tall, chunky-press):
   - **Continue with wallet** — neon-green fill (`--acc`, dark text), Solana three-bar mark (inline SVG, dark on green), and a small **"Soon"** badge pinned right (mono 9px, dark-on-green with faint border) — wallet auth is not live yet, so this is disabled/coming-soon.
   - **Continue with Google** — `--surf2` fill, blue "G" glyph.
3. **Divider** — hairline + centered mono "or with email".
4. **Fields** (label above input, `--surf2` bg, `--line` border, green border on focus):
   - **Username** — *sign-up only*, placeholder "Pick a handle".
   - **Email** — always.
   - **Password** — always; a **SHOW/HIDE** peek toggle on the right (mono) flips input type; placeholder "At least 8 characters" (sign-up) / "Your password" (login).
5. **Meta row** (`space-between`):
   - Left: a square custom checkbox + label. Sign-up: "Email me bonus alerts". Login: "Remember me". (Checkbox default **on**.)
   - Right: "Forgot?" link — *login only*.
6. **Submit** — full-width neon chunky button. "Create account →" (sign-up) / "Log in →" (login).
7. **Mode toggle** (centered): sign-up shows "Already have an account? **Log in**"; login shows "New to Geostakes? **Create one — free**". Clicking the link switches mode in place.
8. **Trust**: an "🔞 18+ · Play responsibly" bordered chip, then small mono legal — sign-up: "By creating an account you agree to our Terms & Privacy Policy. Gambling can be addictive." / login: "Protected by 256-bit SSL encryption."

## Value side (right)
- **Bonus card** — gold→green gradient-tint background, green-tinted border. "🎁 Welcome bonus" tag, huge "100% **MATCH**" (Saira italic 900, "MATCH" green with glow), sub: "We double your first deposit — deposit $50, play with $100. No rake, no fees, no catch."
- **Feature list** — 3 rows, each a small bordered icon tile + text: "⚡ Payouts hit your balance **instantly**", "🎯 Locations **never repeat** — pure skill", "🔓 **No holds** on withdrawals, ever".
- **Social proof** — border-top, an overlapping stack of 4 circular avatars (3 colored w/ initials + a "+" tile) and "**145 players** staking real money this week".

## Behavior / State
- `mode`: `'signup' | 'login'` — default **`'signup'`**. Drives all heading/sub/CTA/toggle/field-visibility/meta/legal copy. `switchMode` flips it in place (no navigation).
- `showPw`: bool — SHOW/HIDE toggles password input `type` between `text`/`password`.
- `remember`: bool, default **true** — the meta checkbox.
- All buttons are currently no-ops (`noop`) — wire **Continue with Google** to your OAuth, **email submit** to your auth endpoint (create-account vs login by `mode`), **Forgot** to password reset. **Continue with wallet** is intentionally disabled ("Soon") until wallet auth ships.
- The design exposes one tweakable prop: `mode` (enum `signup`/`login`) for previewing the initial state.

## Integration notes
- Landing page links its nav **Login** button to this page; after successful auth, route to the game/home.
- Keep sign-up as the default state — new-user registration is the conversion target.
- The "Soon" wallet button should be visibly present but non-functional (social proof that wallet login is coming) — don't wire it yet.
- 18+/responsible-gaming messaging is a compliance requirement for this product; keep it.

## Assets
- Fonts: Saira Condensed, Space Grotesk, Space Mono (Google Fonts).
- Solana logo: inline SVG (three angled bars) — reproduced in-file, no external file.
- Avatars are CSS-generated (colored circles + initials) — no image files.

## Files
- `Auth.dc.html` — the auth page (template + logic + `mode` prop).

Read the `<style>` block in the file for exact pixel values and the `Component` class for exact copy and state logic.
