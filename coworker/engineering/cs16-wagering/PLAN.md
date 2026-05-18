# CS 1.6 Browser Wagering — Implementation Plan

> Last updated: April 16, 2026

---

## Phase 0: Proof of Concept (3-5 days)
**Goal:** Get CS 1.6 running in your browser with multiplayer. Prove the foundation works before investing in asset replacement.

### Steps
1. **Install Docker and pull the cs-web-server image**
   ```
   docker pull yohimik/cs-web-server:latest
   ```

2. **Download CS 1.6 assets via SteamCMD**
   ```
   steamcmd +login anonymous +force_install_dir cs +app_update 90 validate +quit
   ```
   Then zip the `valve/` and `cstrike/` folders into `valve.zip`.

3. **Run the Docker dedicated server locally**
   - Mount `valve.zip` at `/xashds/public/valve.zip`
   - Set `IP` env var to your local/public IP
   - Set `PORT` and expose UDP
   - Start with `+map de_dust2 +maxplayers 4`

4. **Open in browser and play**
   - Navigate to `http://localhost:27016`
   - Verify: rendering works, movement works, shooting works
   - Open a second browser tab and connect to the same server
   - Verify: multiplayer works, you can see/shoot the other player

5. **Test AMX Mod X compatibility**
   - Pull the metpamx variant: `docker pull yohimik/cs-web-server-metpamx:latest`
   - Verify plugins load
   - Test a simple plugin (e.g., admin commands, kill logging)

### Exit criteria
- [ ] CS 1.6 runs in browser with WebGL2
- [ ] Two players can connect and play on the same server
- [ ] Kills register correctly
- [ ] AMX Mod X plugins load and execute
- [ ] You understand the Docker setup well enough to configure it

### Decision gate
If Phase 0 works → proceed to Phase 1.
If multiplayer doesn't work reliably → investigate alternatives.
If performance is unacceptable → consider the custom FPS path instead.

---

## Phase 1: Asset Replacement (2-3 weeks)
**Goal:** Replace ALL Valve assets with custom or free assets. Achieve "HD retro" visual quality.

### 1A. Textures (3-5 days)
**What:** Replace all wall, floor, ceiling, crate, metal textures with HD versions.

**How:**
- Xash3D FWGS supports HD texture replacement via TGA files in `cstrike_hd/` directory
- File naming convention: same name as original texture but in TGA format at higher resolution
- Target resolution: 512x512 minimum, 1024x1024 for key surfaces
- See WIKI.md Claim 2 for verified details

**Sources for textures:**
- Create in GIMP/Photoshop (tileable patterns)
- ambientCG.com (CC0 PBR textures — use the diffuse/albedo map)
- Poly Haven textures (CC0)
- textures.com (free tier)

**Steps:**
1. Identify all textures used in your custom maps (WAD file contents)
2. Create or source replacements at 512x512+
3. Export as TGA files with matching names
4. Place in `cstrike_hd/` directory structure
5. Test in-game — verify they load and tile correctly

### 1B. Weapon models (5-7 days)
**What:** Replace AK-47, M4A1, AWP, Deagle, USP, Knife (6 core weapons) with HD models.

**How:**
- GoldSrc weapon models use .mdl format
- Conversion pipeline: Blender → StudioMDL compiler or Crowbar
- Alternative: source pre-made HD models from GameBanana (88K+ CS 1.6 mods)
- See WIKI.md Claim 3 for verified tools and pipeline

**Fastest path:**
1. Browse GameBanana CS 1.6 weapon skins — many are community-made, NOT Valve IP
2. Download HD packs that include models + textures
3. Verify each pack's license allows commercial use (check author's terms)
4. If license unclear → use as visual reference, recreate in Blender with CC0 textures

**From-scratch path:**
1. Source CC0 weapon models (Kenney Blaster Kit, Quaternius)
2. Import into Blender, adjust proportions for first-person view
3. Rig with GoldSrc bone structure (see WIKI.md for bone names)
4. Export via Crowbar or Blender GoldSrc MDL plugin
5. Create view model (v_ak47.mdl) and world model (w_ak47.mdl)

### 1C. Player models (3-5 days)
**What:** Replace CT and T player models with custom characters.

**How:**
- Partially verified — requires skeleton re-rigging to match GoldSrc bone structure
- Mixamo characters need manual bone adjustment (Mixamo uses different skeleton)
- GameBanana has custom player models that are pre-rigged for GoldSrc
- See WIKI.md Claim 4 for caveats

**Fastest path:**
1. Source pre-rigged custom player models from GameBanana
2. Verify license for commercial use
3. Test in-game

**From-scratch path (harder):**
1. Mixamo character → Blender → re-rig to GoldSrc skeleton
2. This is the most time-consuming asset task — budget extra time
3. Consider commissioning a 3D artist familiar with GoldSrc ($100-300)

### 1D. Maps (5-7 days)
**What:** Create 2-3 custom maps designed for wagering (small, fast, symmetrical).

**Map concepts:**
- **Arena 1v1** — tiny symmetrical map, two spawns facing each other, 30-60 second rounds
- **Aim map** — medium rectangular map with long sightlines, for AK/AWP duels
- **CQB map** — tight corridors, close-quarters combat, SMG/shotgun focused

**Tools:**
- J.A.C.K. (free, modern Hammer-compatible editor) — see WIKI.md Claim 5
- Export as BSP, compatible with Xash3D
- Use your custom HD textures from Step 1A

**Steps:**
1. Install J.A.C.K. editor
2. Design first map (Arena 1v1 — simplest geometry)
3. Apply custom textures
4. Compile to BSP
5. Test in Xash3D browser — verify collisions, spawns, lighting
6. Iterate, then build maps 2 and 3

### 1E. Sounds (1-2 days)
**What:** Replace weapon sounds, footsteps, ambient sounds.

**How:**
- Drop-in WAV file replacement in `cstrike/sound/` directory
- Must match original file paths and names
- Requirements: 22050 Hz or 44100 Hz, 16-bit, mono
- See WIKI.md Claim 6

**Sources:**
- freesound.org (CC0)
- sonniss.com (royalty-free game audio GDC bundles)

### 1F. HUD / UI (2-3 days)
**What:** Replace crosshairs, health display, ammo counter, buy menu.

**How:**
- Partially verified — HUD sprites may require modifying cs16-client source code
- Alternative: overlay custom HTML/CSS HUD on top of the game canvas, hiding the engine's HUD
- See WIKI.md Claim 7 for caveats

**Recommended approach:**
- Build a custom HTML/CSS overlay for HUD elements
- Read game state via the Xash3D API (health, ammo, kills) if exposed
- Or use AMX Mod X to broadcast HUD data via WebSocket to your overlay

### Exit criteria
- [ ] All textures replaced with HD custom versions
- [ ] 6 core weapons have custom HD models
- [ ] Player models replaced (CT + T)
- [ ] 2-3 custom maps created and tested
- [ ] All sounds replaced with royalty-free alternatives
- [ ] HUD is either replaced or overlayed with custom UI
- [ ] Zero Valve assets remain in the build
- [ ] Visual quality is clearly "HD retro" — not stock CS 1.6

---

## Phase 2: Wagering Integration (1-2 weeks)
**Goal:** Connect the game server to Hard2Kill's wagering platform.

### 2A. AMX Mod X Match Plugin (3-5 days)
Write a custom AMX Mod X plugin that:
- Tracks kills, deaths, round wins per player
- Enforces match rules (first to X kills / rounds)
- Detects match completion
- Sends match result to Hard2Kill API via HTTP request
- Prevents unauthorized players from joining

**AMX Mod X scripting:**
- Language: Pawn (C-like scripting language)
- Well-documented: https://www.amxmodx.org/doc/
- HTTP requests: use `AMXX HTTP` module or `cURL` module
- Thousands of example plugins to reference

### 2B. Match API (2-3 days)
Build API endpoints in your existing backend:
- `POST /api/match/create` — create match, spin up server, return connection URL
- `POST /api/match/result` — receive result from AMX plugin, resolve wager
- `GET /api/match/:id/status` — check match state

### 2C. Matchmaking UI (2-3 days)
Build in your existing React frontend:
- Game lobby showing available matches
- Wager selection ($1, $5, $10, $25)
- "Find opponent" button → matchmaking → server assignment
- Game loads in canvas → player connects to assigned server
- Post-match result screen → payout confirmation

### 2D. Server Orchestration (2-3 days)
- Pre-warm a pool of Docker containers (3-5 servers)
- Assign matches to available servers
- Configure each server with: map, max players, match rules via AMX plugin
- Auto-restart server after match ends
- Scale up/down based on demand

### Exit criteria
- [ ] AMX Mod X plugin tracks matches and reports results
- [ ] API receives results and resolves wagers correctly
- [ ] Players can queue, get matched, play, and get paid
- [ ] Server pool handles multiple concurrent matches
- [ ] Full end-to-end flow works: deposit → queue → play → win → payout

---

## Phase 3: Polish + Launch (1-2 weeks)
**Goal:** Production-ready for first real users.

### Steps
1. **Load testing** — how many concurrent matches can the server pool handle?
2. **Anti-cheat basics** — server-side validation (speed limits, fire rate caps, accuracy logging)
3. **Spectator mode** — allow others to watch live matches (for streaming/content)
4. **Recording** — server-side demo recording for dispute resolution
5. **TikTok content** — record matches, create "CS 1.6 for money" clips
6. **Deploy** — Docker containers on Fly.io or Railway, frontend on Vercel
7. **Integration with existing H2K platform** — this becomes "Game 3" alongside GladiatorZ and Wasteland

### Exit criteria
- [ ] Deployed to production
- [ ] First real-money match played
- [ ] Content recorded for TikTok launch

---

## Timeline Summary

| Phase | Duration | What |
|-------|----------|------|
| Phase 0: Proof of Concept | 3-5 days | Get CS 1.6 running in browser with multiplayer |
| Phase 1: Asset Replacement | 2-3 weeks | Replace all Valve assets, achieve HD retro look |
| Phase 2: Wagering Integration | 1-2 weeks | Connect to H2K platform, matchmaking, payouts |
| Phase 3: Polish + Launch | 1-2 weeks | Anti-cheat, spectating, deploy, content |
| **Total** | **5-8 weeks** | |

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Docker installed locally | Not started | Required for Phase 0 |
| SteamCMD installed | Not started | Required to download CS assets for Phase 0 |
| J.A.C.K. map editor | Not started | Required for Phase 1D |
| Blender + Crowbar | Not started | Required for Phase 1B/1C if building from scratch |
| AMX Mod X documentation | Available | https://www.amxmodx.org/doc/ |
| Challenge links (FOCUS.md Phase 1) | Not built | Should be built before/alongside this project |
| Bonus balance system (FOCUS.md Phase 1) | Not built | Must be live before real-money matches |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Valve sends C&D | Low (at small scale) | High | All assets replaced = no Valve IP. Fallback to owned games. |
| GPL contamination of platform code | Low | High | Keep engine as separate CDN-loaded package. Wagering logic is separate service. Legal counsel before launch. |
| Asset replacement takes longer than estimated | Medium | Medium | Start with minimum viable assets (3 weapons, 1 map, 1 player model). Expand after launch. |
| Xash3D WASM has performance issues | Low | High | Phase 0 proves/disproves this before investing in assets. |
| Player model conversion is too hard | Medium | Low | Use GameBanana pre-rigged models or commission a 3D artist. |
| WebRTC connectivity issues for users behind NATs | Medium | Medium | Xash3D's WebRTC uses STUN/TURN. May need to configure TURN server for edge cases. |
