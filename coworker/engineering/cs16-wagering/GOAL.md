# CS 1.6 Browser Wagering — Project Goal

> Project created: April 16, 2026

---

## One-line goal

Build a real-money wagering platform around Counter-Strike 1.6 running in the browser, with all Valve assets replaced by custom HD assets, using the open-source Xash3D FWGS engine compiled to WebAssembly.

---

## What we're building

A browser-based FPS wagering game that:

1. **Plays like CS 1.6** — proven movement mechanics (bunny hop, strafe jumping), proven weapon balance (AK, M4, AWP, Deagle), proven game modes (deathmatch, round-based). 25 years of competitive balance, untouched.

2. **Looks like HD retro** — NOT 2003 stock CS graphics, NOT CS:GO modern graphics. Target: "HD CS 1.6" with higher-res textures, higher-poly models, cleaner HUD, better sounds. Think Krunker.io visual tier — intentionally stylized, clean, readable.

3. **Uses zero Valve assets** — all maps, weapon models, player models, textures, sounds, HUD sprites replaced with custom or CC0 assets. Eliminates IP risk entirely.

4. **Runs entirely in the browser** — no downloads, no installs. WebAssembly + WebGL2. Works on Chrome, Firefox, Safari, mobile browsers.

5. **Server-authoritative multiplayer** — Xash3D dedicated server in Docker handles all game logic. Players connect via WebRTC. Server determines winners.

6. **Integrated with Hard2Kill wagering platform** — match results reported to existing Supabase/Stripe infrastructure. Players wager, play, winner gets paid instantly.

---

## What we're NOT building

- A new game engine (using Xash3D FWGS, open-source)
- New game mechanics (using CS 1.6 mechanics via cs16-client)
- A mobile app (web-only)
- CS:GO-level graphics (engine limitation: no PBR, no dynamic shadows, no SSAO)
- A standalone product (this is a game within the Hard2Kill platform)

---

## Success criteria

| Criteria | Target |
|----------|--------|
| Playable 1v1 match end-to-end in browser | Yes |
| Zero Valve assets in the final build | Yes |
| Visual quality clearly better than stock CS 1.6 | Yes |
| Server-authoritative (dedicated server, not P2P) | Yes |
| Match result feeds into wagering payout | Yes |
| Load time from click to playing | <30 seconds |
| Works on Chrome + Firefox + Safari | Yes |
| Works on mobile browsers | Best effort (not primary target) |

---

## Why this approach

| Alternative | Why not |
|-------------|---------|
| Build FPS from scratch (PlayCanvas/Three.js) | 3-6 months even with Claude. CS 1.6 mechanics take years to tune. |
| Use stock CS 1.6 assets | Valve IP risk. C&D letter at any scale. |
| Use Wasteland (existing prototype) | 1 weapon, 1 map, basic movement. Months of polish needed. |
| Krunker.io clone | Same build time, no proven mechanics. |
| CS:GO in browser | Not possible (no Source engine WASM port). |

**This path gives us:** proven mechanics (25 years) + zero legal risk (custom assets) + fast build time (4-6 weeks) + browser-native (no installs).

---

## Feasibility status

Verified via technical wiki (see WIKI.md):
- 8 claims VERIFIED
- 4 claims PARTIALLY VERIFIED
- 0 claims FALSE
- 0 deal-breakers found
- Main risks: GPL license separation, visual ceiling expectations, asset replacement effort

**Verdict: CONDITIONAL GO.** Proceed with Phase 1 (get it running), then assess before committing to full asset pipeline.
