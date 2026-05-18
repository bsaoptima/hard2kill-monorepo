# CS 1.6 Browser Wagering — Technical Wiki

> Last verified: 2026-04-14
> Methodology: Every claim below was checked against live npm registries, GitHub APIs, Docker Hub, and official documentation. URLs are real and were confirmed accessible at time of writing.

---

## Claim 1: Xash3D FWGS Runs CS 1.6 in the Browser via WASM

**Claim:** The engine can be compiled to WebAssembly via Emscripten, distributed as an npm package, and run CS 1.6 entirely in a browser.

**Verdict:** VERIFIED

**Evidence:**
- [npm: xash3d-fwgs](https://www.npmjs.com/package/xash3d-fwgs) — Actively published npm package (latest v1.2.2, published 2026-01-19). 12 versions released since July 2025. MIT licensed. Exports multiple WASM binaries: `xash.wasm`, `libref_webgl2.wasm`, `libref_soft.wasm`, `filesystem_stdio.wasm`, `libmenu.wasm`. TypeScript-first API with zero dependencies.
- [GitHub: yohimik/webxash3d-fwgs](https://github.com/yohimik/webxash3d-fwgs) — 186 stars, 39 forks, MIT license, actively updated (last activity: 2026-04-14). Lerna monorepo containing engine, SDK, and examples packages. Includes screenshots of CS 1.6 running in browser (cs16-client0.png through cs16-client3.png in /screenshots/).
- [Docker: cs-web-server](https://hub.docker.com/r/yohimik/cs-web-server) — Docker image on Docker Hub with ~2.4K pulls, updated 3 months ago. Provides plug-and-play CS 1.6 web server.
- [Docker: cs-web-server-metpamx](https://github.com/yohimik/webxash3d-fwgs/tree/main/docker/cs-web-server-metpamx) — Variant with Metamod-P and AMX Mod X pre-installed.
- [WebRTC multiplayer](https://github.com/yohimik/webxash3d-fwgs/blob/main/docker/cs-web-server/src/server/sfu.go) — Go server using pion/webrtc/v4 for browser-to-server networking. Uses SFU (Selective Forwarding Unit) architecture with WebSocket signaling.
- [Discord: WebXash3D](https://discord.gg/cRNGjWfTDd) — Active community Discord server.

**Usage is straightforward:**
```typescript
import { Xash3D } from "xash3d-fwgs"

const x = new Xash3D({
    canvas: document.getElementById('canvas'),
    arguments: ['-game', 'cstrike'],
})
await x.init()
x.main()
x.Cmd_ExecuteString('map de_dust2')
```

**Caveats:**
- Requires original Valve game assets (valve/ and cstrike/ directories from Steam). You MUST own CS 1.6 on Steam and provide the files. The npm package only provides the engine binaries, not game content.
- The project is still relatively young (first npm publish July 2025). While functional, it is pre-1.0 maturity in terms of ecosystem tooling.
- WebRTC multiplayer requires a Go-based dedicated server with public IP and open UDP port. Not a simple client-only setup.

**Technical details:**
- Engine renders via WebGL2 (libref_webgl2.wasm) or software renderer (libref_soft.wasm)
- Network stack: Go server with pion/webrtc v4, pion/ice v4, gorilla/websocket for signaling
- Build system: Docker-based WASM compilation via Emscripten
- Server architecture: Xash3D dedicated server compiled as a C library, linked into Go via CGO (i386)

---

## Claim 2: GoldSrc Engine Supports Higher-Resolution Textures

**Claim:** You can use 512x512 or 1024x1024 textures instead of the original low-res ones.

**Verdict:** VERIFIED

**Evidence:**
- [Xash3D FWGS HD Textures Documentation](https://github.com/FWGS/xash3d-fwgs/blob/master/Documentation/hd-textures.md) — Official docs confirm: "Xash3D supports loading texture replacements in TGA format for almost all types of models in the game." Enable via `host_allow_materials 1` cvar.
- [Xash3D FWGS README](https://github.com/FWGS/xash3d-fwgs) — Lists "PNG & KTX2 image format support" as a fork feature, extending beyond original GoldSrc capabilities.
- GoldSrc WAD textures (original engine) are limited to 512x512 maximum for world textures and 256x256 for model textures in the original engine. Textures must be powers of 2 and use the indexed 256-color palette in WAD3 format.

**Technical details:**
- **Original GoldSrc WAD format:** Max 512x512 for world textures, 256x256 for model textures. 8-bit indexed color (256 palette). Stored in .wad files (WAD3 format).
- **Xash3D FWGS replacement system:** Drop TGA files into specific directories to override any texture at any resolution. The engine has no hard upper limit documented for replacement textures — you can use 1024x1024, 2048x2048, etc. Limited only by GPU memory and performance.
- **Directory structure for replacements:**
  - `cstrike/materials/<mapname>/` — map-specific textures
  - `cstrike/materials/common/` — shared textures
  - `cstrike/materials/models/<model>/` — model texture overrides
  - `cstrike/materials/decals/` — decal overrides
  - `cstrike/materials/sprites/<sprite>/` — sprite overrides (Xash3D FWGS addition)
- **Diagnostic mode:** Set `host_allow_materials 2` to get per-texture load status (OK/FAIL/MISS) in console log.

**Caveats:**
- Replacement textures must be in TGA format (PNG and KTX2 also supported in Xash3D FWGS).
- Texture names must match the internal names in the BSP/MDL files exactly.
- Higher-res textures will increase memory usage and download size for the browser client. A full 1024x1024 texture replacement pack could add hundreds of MB.
- The Emscripten/WASM build has not been independently verified to support all HD texture features of native Xash3D, though the rendering path (WebGL2) should handle it.

---

## Claim 3: Custom Weapon Models Can Replace Stock CS 1.6 Weapons

**Claim:** You can create or source higher-quality weapon models and drop them into the game.

**Verdict:** VERIFIED

**Evidence:**
- [GameBanana CS 1.6](https://gamebanana.com/games/4254) — 88,200+ mods available for CS 1.6, including weapon skins/models as a major category. The CS 1.6 modding community has decades of custom weapon model history.
- [Crowbar (ZeqMacaw/Crowbar)](https://github.com/ZeqMacaw/Crowbar) — 780 stars, actively maintained. Supports GoldSrc MDL v10 decompilation and compilation. Latest release v0.74 (Feb 2023). Written in VB.NET. Can decompile MDL to SMD and recompile with modifications.
- The cs16-client repo itself contains all weapon logic files (wpn_ak47.cpp, wpn_awp.cpp, wpn_m4a1.cpp, etc. — 29 weapon files in dlls/wpn_shared/).

**Technical details:**
- **Model format:** GoldSrc uses .mdl files (MDL v10). These contain mesh geometry, bone hierarchy, animations, textures, and hit boxes in a single binary file.
- **Pipeline to create custom weapons:**
  1. Create/source 3D model in Blender/Maya/3ds Max
  2. Export to SMD (StudioModel Data) format — Blender has SMD export plugins (Blender Source Tools)
  3. Write a .qc (QuakeC) script defining the model's properties, animations, bone setup
  4. Compile with studiomdl.exe (Valve's original compiler) or use Crowbar's compile feature
  5. Place compiled .mdl in `cstrike/models/` directory, matching original filenames (e.g., v_ak47.mdl, p_ak47.mdl, w_ak47.mdl for viewmodel/playermodel/worldmodel)
- **Polygon limits:** Original GoldSrc compiler has a soft limit around 2000-4000 triangles per model, but Xash3D FWGS is known to handle higher counts. Community weapon models regularly use 3000-6000 triangles. The practical limit depends on the studiomdl compiler version — some modded compilers support up to ~10,000 triangles.
- **Texture limits on models:** Original engine: 256x256 per texture, up to 4 textures per model. Xash3D's HD texture replacement system can override these with higher-res TGA files.
- **Tools:**
  - Crowbar v0.74 — decompile/compile MDL files
  - Blender Source Tools — SMD import/export for Blender
  - Milkshape 3D — legacy but still used for GoldSrc modeling
  - studiomdl.exe — Valve's official MDL compiler
  - HLMV (Half-Life Model Viewer) — preview models

**Caveats:**
- The FBX/glTF to GoldSrc MDL pipeline is NOT direct. You must go through SMD format as an intermediary. The workflow is: FBX/glTF -> Blender -> SMD -> studiomdl -> MDL.
- Crowbar is Windows-only (.NET). On macOS/Linux you'd need Wine or a Windows VM.
- Valve's studiomdl compiler is 32-bit Windows only. There are community alternatives but they may have compatibility issues.
- Model animations must be re-created or adapted for CS 1.6's specific animation events (draw, shoot, reload, idle).

---

## Claim 4: Custom Player Models Can Replace Stock CS 1.6 Characters

**Claim:** Custom player character models (CT/T teams) can replace the originals, including using Mixamo characters.

**Verdict:** PARTIALLY VERIFIED

**Evidence:**
- [GameBanana CS 1.6](https://gamebanana.com/games/4254) — Thousands of custom player models exist for CS 1.6, confirming the modding pathway works.
- [Crowbar](https://github.com/ZeqMacaw/Crowbar) — Same tool handles player model MDL files as weapon models. GoldSrc MDL v10 decompile/compile confirmed.
- [Blender Source Tools](https://developer.valvesoftware.com/wiki/Blender_Source_Tools) — Community plugin for Blender that exports SMD format, supporting the full pipeline from modern 3D tools to GoldSrc MDL.

**Technical details:**
- **Player model format:** Same .mdl format as weapons. Player models are located in `cstrike/models/player/<modelname>/<modelname>.mdl`.
- **CS 1.6 player model requirements:**
  - Specific bone structure required (Valve's standard HL1 skeleton with ~40 bones)
  - Specific animation sequences required (idle, walk, run, crouch, jump, shoot, die, etc.)
  - Hit boxes must be defined correctly for gameplay
  - Texture count limited to 4 per model in original engine
- **Mixamo to GoldSrc pipeline:**
  1. Download Mixamo character in FBX format
  2. Import into Blender
  3. Re-rig to GoldSrc bone structure (this is the hard part — Mixamo's skeleton does NOT match HL1's skeleton)
  4. Apply CS 1.6 animation sequences (can extract from original models via Crowbar)
  5. Export to SMD via Blender Source Tools
  6. Compile with studiomdl.exe using proper .qc file
- **Polygon budget:** Player models in original CS 1.6 are ~1500-2500 triangles. Xash3D can handle more, but performance in browser with multiple players is a concern. Recommend staying under 5000 triangles per player model.

**Caveats:**
- **Mixamo conversion is NOT straightforward.** The skeleton re-rigging from Mixamo's standard skeleton to HL1's specific bone hierarchy is manual and labor-intensive. You cannot just "drop in" a Mixamo character.
- Mixamo animations will NOT work directly — CS 1.6 requires specific animation sequences with specific frame counts and events.
- Hit box alignment is critical for a wagering game — incorrect hit boxes would make competitive play unfair.
- The practical approach is to either: (a) modify existing CS 1.6 community player models with new textures, or (b) create models from scratch using HL1's skeleton as a base.

---

## Claim 5: Custom Maps Can Be Created for CS 1.6 / GoldSrc

**Claim:** New maps can be created with modern tools and run on Xash3D FWGS in the browser.

**Verdict:** VERIFIED

**Evidence:**
- [J.A.C.K. (JACK)](https://jack.hlfx.ru/en/) — "A brand new level editor for games with a quake-style BSP architecture." Supports full RMF format, GoldSrc mapping, BSP compilation. Version 1.1.3773 (functional beta). Cross-platform.
- [Valve Hammer Editor](https://developer.valvesoftware.com/wiki/Valve_Hammer_Editor) — The original official tool for GoldSrc mapping. Still works, distributed with Half-Life SDK. Outputs .map and .rmf files.
- [TrenchBroom](https://trenchbroom.github.io/) — Officially supports Quake/Quake2/Hexen2. Does NOT natively support Half-Life/GoldSrc, though custom game configurations may enable partial support. Not recommended for GoldSrc.
- [FWGS/xash3d-fwgs](https://github.com/FWGS/xash3d-fwgs) — README confirms BSP support and GoldSrc protocol compatibility.

**Technical details:**
- **Map format:** BSP (Binary Space Partition) v30 for GoldSrc. Source format is .map or .rmf.
- **Compilation pipeline:**
  1. Create map in J.A.C.K. or Hammer Editor
  2. Compile with HLCSG, HLBSP, HLVIS, HLRAD (HL compile tools) — these convert .map to .bsp
  3. Place .bsp in `cstrike/maps/` directory
  4. Maps can reference custom textures in WAD files or use Xash3D's HD texture replacement
- **Custom textures in maps:** Yes. Create a .wad file with your textures (using tools like Wally or TexMex), reference it in the map editor. Alternatively, use Xash3D's TGA replacement system to override any texture at higher resolution.
- **Map complexity limits (GoldSrc BSP v30):**
  - Max faces: 32,767
  - Max brush models: 512
  - Max entities: 1024
  - Max texture data: 2MB in BSP (but Xash3D FWGS increases some limits)
  - Max visible faces from any point: ~2000 (VIS optimization)
  - Xash3D FWGS increases several of these limits beyond original GoldSrc

**Caveats:**
- J.A.C.K. and Hammer are Windows-only tools. On macOS you need Wine/VM.
- The HL compile tools (HLCSG/HLBSP/HLVIS/HLRAD) are also Windows-only.
- TrenchBroom does NOT natively support GoldSrc — do not rely on it for this project.
- Map download size matters for browser — a complex map BSP can be 5-15MB. With custom textures, easily 20-50MB.

---

## Claim 6: Custom Sounds Can Replace Stock CS 1.6 Sounds

**Claim:** Sound files can be replaced by dropping in new files.

**Verdict:** VERIFIED

**Evidence:**
- [Xash3D FWGS sounds.lst documentation](https://github.com/FWGS/xash3d-fwgs/blob/master/Documentation/extensions/sounds.lst.md) — Official docs confirm: "Sounds can use any supported sound format (WAV or MP3)." Also supports Ogg Vorbis (.ogg) and Ogg Opus (.opus) per the engine README.
- [FWGS/xash3d-fwgs README](https://github.com/FWGS/xash3d-fwgs) — Lists "Ogg Vorbis (.ogg) & Ogg Opus (.opus) audio formats support" as a fork feature.
- GoldSrc sound replacement is a well-established modding practice — CS 1.6 sound packs are widely available on GameBanana (832+ sound mods listed).

**Technical details:**
- **Supported formats:**
  - WAV — original engine format. Must be: PCM, 8-bit or 16-bit, mono or stereo, 11025/22050/44100 Hz sample rate.
  - MP3 — supported by Xash3D FWGS
  - OGG Vorbis — supported by Xash3D FWGS
  - OGG Opus — supported by Xash3D FWGS
- **Replacement method:** Drop files into `cstrike/sound/` directory, matching original file paths. For example, `cstrike/sound/weapons/ak47-1.wav` replaces the AK-47 firing sound.
- **sounds.lst system:** Xash3D FWGS adds a configurable `scripts/sounds.lst` file to override hardcoded sound paths for temp entities and physics.

**Caveats:**
- Original GoldSrc WAV requirements are strict: PCM format, specific sample rates. Xash3D FWGS is more lenient but stick to standard formats.
- MP3/OGG support is Xash3D FWGS specific — not guaranteed in all GoldSrc engines.
- Total sound pack size affects browser download time. Compress where possible using OGG/Opus.

---

## Claim 7: Custom HUD/UI Sprites Can Replace Stock CS 1.6 HUD

**Claim:** The HUD elements (health, ammo, crosshair, radar, etc.) can be reskinned.

**Verdict:** PARTIALLY VERIFIED

**Evidence:**
- [Xash3D FWGS HD textures docs](https://github.com/FWGS/xash3d-fwgs/blob/master/Documentation/hd-textures.md) — Notes that sprite replacements are supported at `materials/sprites/<sprite>` BUT explicitly states "except HUD sprites." This is a significant exception.
- [GameBanana CS 1.6](https://gamebanana.com/games/4254) — HUD modifications exist in the community, confirming the original engine supports some level of HUD customization.
- GoldSrc HUD sprites are stored as .spr files in `cstrike/sprites/`. The HUD layout is defined in `sprites/hud.txt`.

**Technical details:**
- **Sprite format:** GoldSrc uses .spr (sprite) files — a proprietary binary format containing frames of indexed-color images.
- **HUD replacement approaches:**
  1. **Replace .spr files directly** — Create new .spr files matching original names/dimensions. Tools: SpriteExplorer, SprMake, Half-Life Sprite Wizard.
  2. **Modify HUD code** — Since cs16-client provides the full reverse-engineered HUD source code (in cl_dll/), you can modify the rendering code to draw custom elements.
  3. **Xash3D sprite replacement** — Works for non-HUD sprites via TGA replacement. HUD sprites specifically are excluded from this system.
- **For a wagering platform:** The most robust approach is to modify the cs16-client HUD source code directly, since you need to add custom UI elements anyway (bet amounts, timer, match status).

**Caveats:**
- Xash3D FWGS explicitly does NOT support TGA replacement for HUD sprites. You must either replace .spr files directly or modify client source code.
- Creating .spr files requires specific tools (SprMake/SprWizard) and the format is limited to 256-color indexed images.
- The better path for a wagering product is to overlay HTML/CSS UI on top of the WebGL canvas rather than trying to modify in-engine HUD sprites.

---

## Claim 8: WebGL2 Post-Processing on Top of Xash3D WASM Output

**Claim:** You can apply modern shader effects (bloom, color grading, SSAO, etc.) on top of the WebGL2 canvas that Xash3D renders to.

**Verdict:** PARTIALLY VERIFIED

**Evidence:**
- [Emscripten OpenGL documentation](https://emscripten.org/docs/porting/multimedia_and_graphics/OpenGL-support.html) — Confirms Emscripten supports WebGL2 via `-sMAX_WEBGL_VERSION=2`. Xash3D FWGS web build exports `libref_webgl2.wasm`, confirming it uses WebGL2.
- The xash3d-fwgs npm package exports show `libref_webgl2.wasm` as a renderer option, confirming the engine renders to a WebGL2 context on an HTML canvas element.
- Standard WebGL2 post-processing techniques (render to framebuffer, apply fullscreen quad shader) are well-documented and widely used in web game development.

**Technical details:**
- **Approach 1 — Canvas capture and re-render:**
  1. Let Xash3D render to its WebGL2 canvas
  2. Use a second canvas/WebGL2 context to read the first canvas as a texture
  3. Apply fullscreen post-processing shaders (bloom, color grading, vignette, etc.)
  4. This has significant performance overhead due to texture copy between contexts
- **Approach 2 — Intercept Emscripten's GL context:**
  1. Before Xash3D initializes, hook the WebGL2 context creation
  2. Wrap the GL context with a proxy that intercepts the final present/swapBuffers
  3. After Xash3D renders each frame, bind its output as a texture and run post-processing passes
  4. This is more complex but avoids the cross-context copy
- **Approach 3 — CSS filters (simplest):**
  1. Apply CSS filters (brightness, contrast, saturate, blur) directly to the canvas element
  2. Very limited but zero-effort for basic color correction
- **Approach 4 — Modify Xash3D renderer source:**
  1. The engine is open source. Add post-processing passes directly to the WebGL2 renderer.
  2. Most control, best performance, but requires C engine development.

**Caveats:**
- Nobody has publicly documented doing post-processing on top of a Xash3D WASM canvas specifically.
- Cross-context texture sharing in WebGL is limited. Approach 2 (context interception) is the most viable but requires Emscripten expertise.
- Performance is a real concern — CS 1.6 in WASM already has overhead; adding post-processing passes could drop framerate, especially on mobile browsers.
- Approach 4 (engine modification) is the technically correct solution but requires significant C/OpenGL development.

---

## Claim 9: AMX Mod X / Metamod Works with Xash3D WASM Dedicated Server

**Claim:** Server-side plugins (AMX Mod X) can run on the Xash3D-based dedicated server, enabling custom game logic and external API calls.

**Verdict:** VERIFIED

**Evidence:**
- [Docker: cs-web-server-metpamx](https://github.com/yohimik/webxash3d-fwgs/tree/main/docker/cs-web-server-metpamx) — Dedicated Docker image with Metamod-P and AMX Mod X pre-installed. Dockerfile shows exact versions and SHA256 hashes for verified downloads.
- [ludufre/metamod-p](https://github.com/ludufre/metamod-p) — Metamod-P fork specifically adapted for Xash3D ("Adaptation of metamod-p to work with xash3d"). Latest release: v1.21p37-xash3d-git2 (2026-01-24).
- [ludufre/amxmodx](https://github.com/ludufre/amxmodx) — AMX Mod X fork for Xash3D. Latest releases: v1.10.0-git5474-xash-git1 and v1.9.0-git5302-xash-git2 (both 2026-01-19). 5,484 commits on master.
- The Dockerfile confirms the integration: `sed -i 's/dlls\/cs\.so/addons\/metamod\/dlls\/metamod.so/g' cstrike/liblist.gam` — standard Metamod hookup into game DLL loading.

**Technical details:**
- **Architecture:** Metamod hooks into the game DLL loading chain. AMX Mod X loads as a Metamod plugin.
- **AMX Mod X capabilities for wagering:**
  - Pawn scripting language for custom server-side logic
  - Can intercept all game events (kills, deaths, round starts/ends, bomb plants, etc.)
  - Has HTTP/socket modules for external API calls — can report match results to an external wagering backend
  - Can enforce custom rules (weapon restrictions, round timers, player counts)
  - Has MySQL module for direct database access if needed
- **The dedicated server runs as native i386 Linux** (not WASM). The Docker image builds Xash3D as a native Linux binary linked into Go via CGO. Only the client runs in WASM.
- **Plugin development:** Write .sma (Small/Pawn) scripts, compile with amxpc to .amxx, drop in `addons/amxmodx/plugins/`.

**Caveats:**
- AMX Mod X runs on the dedicated server, NOT in the browser. The server is a native Linux binary (i386).
- The HTTP/socket modules in AMX Mod X are callback-based and somewhat limited. For a wagering backend integration, you may want to modify the Go server layer instead, which has full access to modern HTTP libraries and can communicate with the engine via the goxash3d-fwgs bindings.
- The AMX Mod X fork (ludufre/amxmodx) is specifically for Xash3D and may lag behind the mainline AMX Mod X project.

---

## Claim 10: The cs16-client (Reverse-Engineered CS Game Logic)

**Claim:** Velaron/cs16-client provides the complete reverse-engineered CS 1.6 game logic (weapon behavior, movement physics, etc.) and can run in the browser.

**Verdict:** VERIFIED

**Evidence:**
- [GitHub: Velaron/cs16-client](https://github.com/Velaron/cs16-client) — 317 stars, 78 forks, actively maintained (updated 2026-04-13). Description: "Counter-Strike reverse-engineered." License: GPLv2+.
- [npm: cs16-client](https://www.npmjs.com/package/cs16-client) — npm package (latest v0.1.2, MIT license for the npm wrapper). Description: "cs16-client emscripten port." Provides WASM binaries: `client_emscripten_wasm32.wasm`, `menu_emscripten_wasm32.wasm`, `cs_emscripten_wasm32.so`.
- **Weapon logic confirmed:** The repo contains individual weapon implementation files for ALL CS 1.6 weapons: `wpn_ak47.cpp`, `wpn_awp.cpp`, `wpn_m4a1.cpp`, `wpn_deagle.cpp`, `wpn_usp.cpp`, `wpn_knife.cpp`, etc. (29 weapon files in `dlls/wpn_shared/`).
- **Movement physics confirmed:** `pm_shared/pm_shared.cpp` — the player movement shared code. Also `pm_math.cpp`, `pm_debug.cpp`.
- **Client-side rendering:** `cl_dll/` directory contains HUD rendering, weapon prediction, studio model rendering, entity management, etc.
- **Server-side game rules:** `dlls/` directory contains server-side headers for game rules, player logic, weapons.

**Technical details:**
- **License split:** The Velaron/cs16-client source is GPLv2 (copyleft). The yohimik npm wrapper packages it under MIT. For a commercial product, the GPLv2 of the underlying game logic code is the binding license — you must comply with GPL terms for any modifications to cs16-client code.
- **What it provides:**
  - Complete client-side DLL (cl_dll): HUD, weapon prediction, entity interpolation, effects
  - Complete server-side DLL (dlls): game rules, weapon logic, player management, bot support
  - Shared code (game_shared, pm_shared): movement physics, weapon behavior, common utilities
- **This is NOT a clean-room implementation.** It's based on reverse engineering and the ReGameDLL_CS project. The code closely mirrors Valve's original implementation.

**Caveats:**
- **GPLv2 license is copyleft.** If you modify cs16-client code, you must release your modifications under GPLv2. This applies to the game logic DLLs. It does NOT necessarily apply to the engine (Xash3D FWGS uses a different license) or your web frontend/wagering backend.
- The npm package requires the xash3d-fwgs engine to run — it cannot operate standalone.
- "Reverse-engineered" means it aims to match original behavior but may have subtle differences. For wagering, any gameplay discrepancy (hit registration, weapon spread, movement speed) could be a fairness issue.

---

## Claim 11: Free CC0/Open Asset Sources

**Claim:** Free asset packs (Kenney, Quaternius, Mixamo, GameBanana) can provide replacement assets that can be converted to GoldSrc format.

**Verdict:** PARTIALLY VERIFIED

**Evidence:**
- [Kenney Blaster Kit](https://kenney.nl/assets/blaster-kit) — 40+ weapon/blaster models, CC0 license, free. Version 2.1 includes crates, silencer, throwables, smoke elements.
- [Kenney Assets](https://kenney.nl/assets) — Hundreds of free CC0 game assets including "Desert Shooter Pack" and other FPS-related content.
- [Quaternius](https://quaternius.com) — 70+ free game asset packs including weapon packs (medieval weapons, modular guns, animated guns), character packs, and complete FPS game kits.
- [GameBanana CS 1.6](https://gamebanana.com/games/4254) — 88,200+ community mods including weapon models, player models, sound packs. Many are free to download. Note: GameBanana mods have varying licenses — check each individually.
- [Mixamo](https://www.mixamo.com) — Free character models and animations (requires Adobe account). Exports to FBX format.

**Conversion to GoldSrc MDL — the pipeline:**
1. Download assets in FBX/glTF/OBJ format
2. Import into Blender
3. Adapt to GoldSrc requirements (re-rig skeleton, reduce poly count, create proper UV mapping for 256x256 textures)
4. Export to SMD via Blender Source Tools
5. Compile to MDL via studiomdl.exe

**GameBanana HD packs — already in GoldSrc format:**
- GameBanana hosts thousands of pre-made CS 1.6 weapon models and player models already in MDL format. Many are HD replacements (higher poly, better textures) that work as direct drop-in replacements.
- Examples include HD weapon packs, HD player model packs, and complete visual overhaul mods.

**Caveats:**
- **Kenney/Quaternius models require significant conversion work.** They are NOT in GoldSrc MDL format. The models are typically in FBX/glTF/OBJ with modern PBR materials — they need to be adapted to GoldSrc's limitations (bone limits, poly limits, 256-color textures).
- **Mixamo to GoldSrc is especially labor-intensive** — skeleton re-rigging is manual (see Claim 4).
- **GameBanana is the most practical source** — models are already in CS 1.6 format and battle-tested by the community.
- **License concerns:** GameBanana mods have varying licenses. For a commercial wagering product, you need explicit commercial-use permission. CC0 (Kenney/Quaternius) is safest. Mixamo has specific licensing terms tied to Adobe account.
- **Art style consistency:** Mixing assets from different sources will produce inconsistent visual quality unless you have an artist unify the style.

---

## Claim 12: The Xash3D FWGS Engine Itself

**Claim:** Xash3D FWGS is open source, actively maintained, and offers visual improvements over original GoldSrc.

**Verdict:** VERIFIED

**Evidence:**
- [GitHub: FWGS/xash3d-fwgs](https://github.com/FWGS/xash3d-fwgs) — 2,443 stars, 403 forks. Actively maintained (multiple commits per week, last update 2026-04-15). Description: "Xash3D FWGS engine."
- The engine is described as "a heavily modified fork of an original Xash3D Engine by Unkle Mike."
- **License:** The FWGS/xash3d-fwgs repo does not have a simple SPDX license tag on GitHub. The engine historically uses a mixed license: engine core is GPLv3+, while some components may have different licenses. The npm wrapper (yohimik/webxash3d-fwgs) is MIT licensed.

**Visual improvements over original GoldSrc:**
Per the official README, Xash3D FWGS adds:
- Multiple renderer support: OpenGL, GLESv1, GLESv2, Software, and WebGL2 (for browser)
- PNG & KTX2 image format support (higher quality than WAD/BMP)
- HD texture replacement system (TGA files at any resolution)
- TrueType font rendering
- Ogg Vorbis & Ogg Opus audio support
- PK3 archive support (like Quake 3, for efficient asset packaging)
- Better multiplayer: multiple master servers, headless dedicated server, voice chat, GoldSrc protocol support, IPv6

**What it does NOT add (important for "modern visuals" goal):**
- No dynamic lighting/shadows (still uses GoldSrc's lightmap system)
- No normal mapping or PBR materials
- No skeletal animation blending improvements
- No particle system upgrades
- No screen-space effects (SSAO, bloom, etc.) built-in
- The renderer is still fundamentally GoldSrc-era

**Technical details:**
- Written in C (pure C, not C++)
- Build system: Waf
- Cross-platform: Windows, Linux, BSD, Android, macOS, PS Vita, and now Web (Emscripten)
- File system: Virtual filesystem with .pk3/.pk3dir support, case-insensitive path emulation
- The WebGL2 renderer (libref_webgl2.wasm) is the browser-specific rendering backend

**Caveats:**
- **The license situation is complex.** FWGS/xash3d-fwgs does not clearly declare a single license on GitHub. For a commercial wagering product, you need to carefully audit the license of every component:
  - Engine core: likely GPLv3+ (copyleft)
  - cs16-client game logic: GPLv2+ (copyleft)
  - yohimik's web port npm packages: MIT
  - Your custom game assets: your own license
- **"Modern visuals" is overstated.** Xash3D FWGS is faithful to GoldSrc. It does NOT add modern rendering features. You can improve textures and models, but the lighting, shadows, and rendering pipeline remain 1998-era. The game will look like a high-res CS 1.6, not a modern FPS.
- The engine is maintained by a small team. Browser/Emscripten support is community-contributed (yohimik, ololoken, ludufre) and not the main focus of FWGS upstream.

---

## Summary Table

| # | Claim | Verdict | Risk Level |
|---|-------|---------|------------|
| 1 | Xash3D FWGS runs CS 1.6 in browser via WASM | VERIFIED | Low |
| 2 | GoldSrc supports HD textures | VERIFIED | Low |
| 3 | Custom weapon models can replace stock weapons | VERIFIED | Medium |
| 4 | Custom player models can replace stock characters | PARTIALLY VERIFIED | High |
| 5 | Custom maps can be created | VERIFIED | Medium |
| 6 | Custom sounds can replace stock sounds | VERIFIED | Low |
| 7 | Custom HUD/UI sprites can be replaced | PARTIALLY VERIFIED | Medium |
| 8 | WebGL2 post-processing on WASM canvas | PARTIALLY VERIFIED | High |
| 9 | AMX Mod X / Metamod works with Xash3D server | VERIFIED | Low |
| 10 | cs16-client provides full game logic | VERIFIED | Medium (GPL) |
| 11 | Free CC0/open assets available | PARTIALLY VERIFIED | High |
| 12 | Xash3D FWGS is open source and improved | VERIFIED | Medium (License) |

**Verified:** 8 | **Partially Verified:** 4 | **False:** 0

---

## Key Risks and Deal-Breakers

### 1. License Complexity (HIGH RISK)
The stack involves multiple licenses:
- Xash3D FWGS engine: GPLv3+ (copyleft — must open-source any engine modifications)
- cs16-client game logic: GPLv2+ (copyleft — must open-source any game logic modifications)
- npm wrappers: MIT (permissive)
- Your wagering backend/frontend: can be proprietary IF kept separate from GPL code

For a commercial wagering product, this means: any modifications to the engine or game logic DLLs must be released as open source. Your proprietary value must be in the wagering platform, matchmaking, and UI layer — not in engine modifications. **Get legal counsel before proceeding.**

### 2. "Modern Visuals" is Limited (MEDIUM RISK)
You can upgrade textures and models, but the rendering pipeline is still GoldSrc-era. There are no dynamic shadows, no PBR, no modern lighting. The result will be "HD CS 1.6" — not "modern FPS." Post-processing via WebGL2 is theoretically possible but unproven and performance-risky.

### 3. Asset Pipeline Friction (MEDIUM RISK)
Converting modern 3D assets (FBX/glTF) to GoldSrc MDL format requires a multi-step pipeline through Windows-only tools. This is labor-intensive and error-prone. The most practical path is sourcing pre-made CS 1.6 HD assets from GameBanana, but these have inconsistent licensing for commercial use.

### 4. Valve Game Assets Required (HIGH RISK)
The engine runs but requires original Valve game assets (valve/ and cstrike/ directories from Steam). For a wagering product, every player would need to own CS 1.6 on Steam, OR you must replace ALL assets with custom ones. The latter is the stated goal but represents a massive asset creation effort.

### 5. Browser Performance (MEDIUM RISK)
Running a 3D FPS engine via WASM+WebGL2 in a browser adds overhead. With HD textures and higher-poly models, performance on mid-range devices and mobile browsers is uncertain. No public benchmarks exist for the WebXash3D build with HD assets.
