# Browser FPS Build Guide: Fastest Path to a Krunker-Style Game

*Last updated: 2026-04-14*

This is a practical guide for a solo developer with existing Colyseus + multiplayer web game experience to build a Krunker.io-style browser FPS as fast as possible.

---

## 1. Ranked Build Paths (Fastest to Slowest)

### Path A: PlayCanvas Engine + Colyseus (RECOMMENDED) — 6-8 weeks

**Why this is fastest:** PlayCanvas is a full game engine (not just a renderer) with built-in physics, asset pipeline, input handling, and audio. The engine is MIT-licensed and can be used standalone via npm without the cloud editor. Multiple shipped FPS games prove the stack: Venge.io, Bullet Bonanza, Mini Royale: Nations. There's an official Colyseus + PlayCanvas tutorial and a community-built multiplayer shooter with Colyseus that handled 500 concurrent players in beta.

- **Rendering:** PlayCanvas engine (14.7k stars, MIT, WebGL2/WebGPU)
- **Networking:** Colyseus (already known)
- **Physics client:** PlayCanvas built-in (ammo.js)
- **Physics server:** Rapier.js via `@thorium-sim/rapier3d-node` (runs headless in Node.js, no GPU needed)
- **Install:** `npm install playcanvas @colyseus/core @thorium-sim/rapier3d-node`

**Time breakdown:**
| Task | Estimate |
|------|----------|
| FPS controller + camera + movement | 3-4 days |
| Weapon system (hitscan raycasting) | 3-4 days |
| Map loading (glTF) + collision | 2-3 days |
| Colyseus room + state sync | 2-3 days (you know this already) |
| Client-side prediction + interpolation | 5-7 days |
| HUD / scoreboard / kill feed | 2-3 days |
| Basic matchmaking + game loop | 2-3 days |
| Polish + testing | 5-7 days |
| **Total** | **~6-8 weeks part-time** |

**Key links:**
- PlayCanvas engine: https://github.com/playcanvas/engine
- PlayCanvas + Colyseus tutorial: https://developer.playcanvas.com/tutorials/real-time-multiplayer-colyseus/
- Colyseus server template for PlayCanvas: https://github.com/colyseus/tutorial-playcanvas-server
- Community FPS with PlayCanvas + Colyseus: https://forum.playcanvas.com/t/multiplayer-shooter-made-with-playcanvas-and-colyseus/38435
- PlayCanvas plans (free tier allows self-hosting): https://playcanvas.com/plans

---

### Path B: Three.js + Colyseus + Rapier.js — 8-12 weeks

**Why:** Maximum control and the largest ecosystem of examples/tutorials. You'll build more from scratch but Three.js has the biggest community. The downside is you're assembling an engine yourself — input, audio, asset loading, etc.

- **Rendering:** Three.js
- **Networking:** Colyseus
- **Physics client:** Rapier.js (WASM, 2-5x faster than 2024 versions)
- **Physics server:** `@thorium-sim/rapier3d-node`
- **Raycasting:** three-mesh-bvh for client-side hit visualization (3.3k stars, MIT)

**Best starting reference:** NotBlox by iErcann (166 stars, Three.js + Rapier + uWebSockets, server-authoritative, ECS architecture)
- https://github.com/iErcann/Notblox

**Also reference:** Enari Engine by the same developer — single-player FPS with weapons, bunny hopping, CS-style mechanics
- https://github.com/iErcann/enari-engine (263 stars, MIT)

The play is to combine NotBlox's server-authoritative multiplayer architecture with Enari Engine's FPS mechanics.

**Additional time:** +2-4 weeks vs PlayCanvas because you're building the engine layer yourself (input system, audio, asset pipeline, loading screens).

---

### Path C: BabylonJS + Nengi.js — 8-10 weeks (with caveats)

**Why:** The nengi-babylon-3d-shooter template (56 stars, Apache-2.0) is the only open-source project that ships with client-side prediction + lag-compensated hit registration + server-authoritative architecture out of the box.

- Template: https://github.com/timetocode/nengi-babylon-3d-shooter
- Nengi.js: https://github.com/timetocode/nengi (355 stars, Apache-2.0)

**Major caveat:** Nengi.js is NOT actively maintained. It's stuck on Node 14, and the experimental Node 16 branch hasn't been merged. You'd be building on an abandoned networking library. This is a dealbreaker unless you're willing to fork and maintain it yourself.

**If you go this route,** consider replacing Nengi with Colyseus and keeping the BabylonJS FPS template as reference architecture only.

---

### Path D: Fork an Existing Open-Source FPS — 4-6 weeks (lowest quality)

Forking an existing project gets you running fastest but you inherit someone else's architectural debt and usually bad netcode.

**Best fork candidates:**

| Repo | Stars | License | Multiplayer | Last Active | Notes |
|------|-------|---------|-------------|-------------|-------|
| TOSIOS | 430 | MIT | Colyseus | 2020 | 2D top-down (not FPS), but Colyseus architecture is solid reference |
| three-arena | ~20 | MIT | Socket.io | 2021 | Three.js FPS with octree collision, client-trusted (bad for betting) |
| Moxxi | ~15 | MIT | Socket.io | Unknown | Low-poly multiplayer FPS, thin on features |
| threejs-multiplayer-shooter | ~10 | Unknown | Socket.io | Unknown | Very basic |

**Verdict:** None of these are worth forking directly. They're too incomplete or have fundamentally wrong networking (client-trusted). Use them as reference code only.

---

## 2. Best Open-Source Starting Points

### Tier 1: Use as Architecture Reference

| Project | URL | Why |
|---------|-----|-----|
| **NotBlox** | https://github.com/iErcann/Notblox | Server-authoritative Three.js + Rapier.js + uWebSockets. ECS architecture. TypeScript monorepo. The closest thing to a correct multiplayer game server in Three.js. |
| **Enari Engine** | https://github.com/iErcann/enari-engine | FPS mechanics: weapons, bunny hop, multiple maps, CS-style gameplay. Single-player but excellent FPS controller reference. |
| **nengi-babylon-3d-shooter** | https://github.com/timetocode/nengi-babylon-3d-shooter | The ONLY open-source browser FPS with client-side prediction + rewind lag compensation. Study the netcode architecture even if you don't use nengi. |
| **TOSIOS** | https://github.com/halftheopposite/TOSIOS | Clean Colyseus + TypeScript architecture. Matchmaking, rooms, game modes. It's 2D but the server code is excellent Colyseus reference. |

### Tier 2: Useful Components

| Project | URL | Why |
|---------|-----|-----|
| **three-mesh-bvh** | https://github.com/gkjohnson/three-mesh-bvh | 3.3k stars. Fast raycasting for Three.js (500 rays against 80k poly at 60fps). Essential if using Three.js. |
| **Rapier.js** | https://github.com/dimforge/rapier.js | WASM physics. Runs on client AND server (via rapier-node). 2-5x faster than 2024. |
| **rapier-node** | https://github.com/Thorium-Sim/rapier-node | Node.js bindings for Rapier. No async init, no GPU needed. `npm i @thorium-sim/rapier3d-node` |

---

## 3. The Minimum Viable Krunker Clone

### Essential (Week 1-6)

- **FPS controller** — WASD + mouse look + jump. Fixed timestep physics.
- **Hitscan weapons** — Raycasting, not projectile. At least 2 weapon types (rifle + shotgun).
- **One map** — Simple box geometry or a single glTF level. Collision via trimesh.
- **Multiplayer** — 2-8 players per room. Colyseus state sync. Server-authoritative movement.
- **Health + death + respawn** — Basic damage model, kill counter, instant respawn.
- **HUD** — Crosshair, health bar, ammo count, kill feed, scoreboard (Tab).
- **Client-side prediction** — For local player movement (mandatory for playable feel).
- **Entity interpolation** — For remote players (smooth movement between server ticks).

### Important But Can Wait (Week 7-10)

- Slidehopping / bunny hop movement (this is what makes Krunker *feel* good)
- Multiple weapon classes with different stats
- Map variety (2-3 maps)
- Sound effects
- Kill cam / death screen
- Match timer + round system
- Basic anti-cheat (speed validation, teleport detection)

### Skip For Now

- Cosmetic skins / marketplace
- XP / ranking system
- Custom map editor
- Replay system
- Team modes (start with FFA deathmatch)
- Mobile support
- Voice chat

---

## 4. Asset Pipeline

### Krunker's Art Style

Krunker uses voxel-style, low-poly graphics. This is a strategic choice — it's fast to produce, performs well on low-end hardware, and has a distinctive look.

### Weapon Assets (Fastest to Slowest)

| Source | Cost | Quality | Format | License |
|--------|------|---------|--------|---------|
| **Kenney Blaster Kit** | Free | Good | glTF/OBJ | CC0 (public domain) |
| https://kenney.nl/assets/blaster-kit | | 30 weapons (knives to rocket launchers) | | |
| **Quaternius Weapons** | Free | Good | glTF/FBX | CC0 |
| https://quaternius.com/ | | 1400+ free models total | | |
| **Poly Pizza** | Free | Varies | glTF | CC-BY |
| https://poly.pizza/ | | Huge library, search "weapon" | | |
| **itch.io Low Poly FPS Packs** | Free-$15 | Great | Various | Check each |
| https://itch.io/game-assets/tag-fps/tag-low-poly | | | | |
| **JustCreate3D FPS Pack Lite** | Free | Pro | FBX | Commercial OK |
| https://justcreate3d.itch.io/low-poly-fps-weapons-pack-lite | | Free sample, full pack paid | | |

### Character Models + Animations

- **Mixamo** (free with Adobe account): https://www.mixamo.com/
  - Upload any humanoid mesh, auto-rig in seconds
  - Huge animation library (run, jump, shoot, die, idle)
  - Export as FBX, convert to glTF with Blender or gltf-transform
  - **Caveat:** Animations are 3rd-person. For FPS, you only need arm animations for the first-person view model, and full-body anims for other players seeing you.

### Map Creation

**Option 1 (Fastest): Blockbench or MagicaVoxel**
- MagicaVoxel: https://ephtracy.github.io/ — Free voxel editor
- Export as OBJ, convert to optimized glTF
- For Krunker-style blocky maps, this is the fastest path
- Use V-Optimizer (https://vailor1.itch.io/v-optimizer) to optimize voxel meshes for game use

**Option 2: Blender with simple geometry**
- Box-model maps in Blender, export as glTF
- More flexible than voxel editors
- Use gltf-transform (https://gltf-transform.dev/) to compress: Draco or Meshoptimizer compression, texture compression to KTX2

**Option 3: Tiled + custom converter**
- TOSIOS uses Tiled Map Editor for 2D maps
- Could define top-down map layout in Tiled and extrude to 3D

### Asset Optimization Pipeline

```
MagicaVoxel/Blender → glTF export → gltfpack/gltf-transform → compressed .glb
```

Use `gltfpack` (https://meshoptimizer.org/gltf/) for mesh optimization:
- Quantized vertex positions (smaller files)
- Meshopt compression
- Texture resizing + KTX2 compression

---

## 5. The Hard Problems and Their Solutions

### Problem 1: Client-Side Prediction + Server Reconciliation

**Why it's hard:** Without prediction, every movement has 50-200ms of input lag. With bad prediction, you get rubber-banding.

**Solution:**
1. Read Gabriel Gambetta's 4-part series (the bible for this): https://www.gabrielgambetta.com/client-server-game-architecture.html
2. Colyseus has an official tutorial on client-predicted input: https://learn.colyseus.io/phaser/3-client-predicted-input
3. Share movement logic between client and server (both TypeScript — this is Colyseus's biggest advantage)

**Implementation pattern:**
```
Client: Apply input locally → Send input + sequence number to server
Server: Validate input → Apply to authoritative state → Broadcast
Client: Receive server state → Re-apply unacknowledged inputs on top
```

**Key insight:** Since both client and server are TypeScript with Colyseus, you write movement physics ONCE and import it on both sides. This eliminates desync bugs.

### Problem 2: Hit Registration

**Why it's hard:** The server needs to validate hits, but the shooting player saw their target at a past position due to latency.

**Two approaches:**

**A) Client-trusted raycasting (simpler, Krunker's actual approach at 10 tick)**
- Client sends: "I shot, here's my position and direction"
- Server validates: Is this player alive? Do they have ammo? Is the timing reasonable?
- Server applies damage
- Faster to implement, good enough for casual play
- Anti-cheat validates ray origin matches server-known position (within tolerance)

**B) Server-side rewind raycasting (correct, harder)**
- Server stores position history for all entities
- When a shot arrives, rewind world state by the shooter's latency
- Perform raycast against historical positions
- This is what nengi-babylon-3d-shooter demonstrates
- More complex but prevents aim botting

**Recommendation for MVP:** Start with approach A. Krunker ran at 10 tick rate with client-trusted hits and got millions of players. Move to B only when you have a cheating problem.

### Problem 3: Movement Feel (Bunny Hop / Slidehopping)

**Why it matters:** This is what separates Krunker from a generic FPS. The Quake-style air strafing creates a skill ceiling that keeps competitive players engaged.

**The Math:**
The Quake acceleration bug works by limiting only the projection of velocity onto the acceleration direction, not total velocity. When strafing perpendicular to current velocity, projection stays low, allowing speed to compound beyond max:

```javascript
// Core air acceleration (from Quake III source)
function accelerate(currentVel, wishDir, accelRate, maxSpeed, dt) {
  const currentSpeed = dot(currentVel, wishDir);
  const addSpeed = maxSpeed - currentSpeed;
  if (addSpeed <= 0) return currentVel;
  let accelSpeed = accelRate * dt * maxSpeed;
  if (accelSpeed > addSpeed) accelSpeed = addSpeed;
  return add(currentVel, scale(wishDir, accelSpeed));
}
```

**Key implementation details:**
- Ground movement: apply friction, use `ground_accelerate` (high value)
- Air movement: NO friction, use `air_accelerate` (lower value)
- Jump: 1-frame window where friction is not applied (allows speed preservation)
- Slide: Reduce friction to near-zero, apply gravity, time-limited duration
- Reference: https://adrianb.io/2015/02/14/bunnyhop.html

**Krunker-specific addition — Slidehopping:**
- Press shift near ground to slide (low friction, time-limited)
- Jump during slide to preserve speed
- Chain slide → jump → slide → jump
- Physics must be framerate-independent (Krunker fixed this in v2.8.4)

### Problem 4: Anti-Cheat in Browser Environment

**Why it's hard:** The client is JavaScript. Everything is inspectable, modifiable, injectable.

**Layers of defense:**

1. **Server-authoritative movement** — Server validates all position changes. Client can't teleport.
2. **Rate limiting** — Max movement speed per tick, max fire rate per weapon
3. **Sanity checks** — Is this player shooting through a wall? Is their reaction time physically possible?
4. **Position verification** — Server-known position vs client-claimed position must be within tolerance (ping + interpolation margin)
5. **Behavioral analysis** — Track accuracy over time. Inhuman accuracy = flag.
6. **Obfuscation** — Minify + obfuscate client code. Not security, but raises the bar.
7. **WebAssembly** — Move sensitive game logic to WASM (harder to reverse-engineer than JS)

**What NOT to waste time on:** Kernel-level anti-cheat (impossible in browser), client-side integrity checks (trivially bypassed).

**Key reference:** https://jsgaming.io/courses/browser-game-security-and-cheat-prevention/

### Problem 5: Tick Rate vs Bandwidth vs Feel

**Krunker runs at 10 tick.** This is low but it works because client-side prediction fills the gaps.

**Recommended approach:**
- Server physics tick: 20 Hz (50ms) — good balance of accuracy vs CPU
- Network send rate: 20 Hz (same as tick, or halved to 10 Hz for bandwidth)
- Client render: 60+ FPS with interpolation between server updates
- Colyseus patchRate: 50ms default, tune based on your needs

**Bandwidth optimization:**
- Use Colyseus Schema (binary, delta-compressed by default)
- Send inputs at 20-30 Hz, not 60 Hz
- For bullets: send origin + angle, let clients simulate trajectory locally
- Use Colyseus State Views to limit what each client receives

---

## 6. Recommended Stack

### The Single Best Combination

```
CLIENT
├── PlayCanvas Engine (npm install playcanvas)
│   ├── Rendering (WebGL2/WebGPU)
│   ├── Input handling
│   ├── Audio
│   └── Asset loading (glTF)
├── Colyseus.js client
├── Rapier.js (client-side prediction physics)
└── TypeScript

SERVER
├── Colyseus (room management, matchmaking, state sync)
├── @thorium-sim/rapier3d-node (authoritative physics)
├── Shared game logic (movement, weapon stats, damage calc)
└── TypeScript

ASSETS
├── Kenney weapon kit (CC0, free)
├── Quaternius character models (CC0, free)
├── Mixamo animations (free)
├── MagicaVoxel or Blender for maps
└── gltfpack for optimization

DEPLOYMENT
├── Client: Static hosting (Cloudflare Pages, Vercel)
├── Server: Fly.io or Railway (containerized Node.js)
└── Matchmaking: Colyseus built-in
```

### Why PlayCanvas Over Three.js

For a solo dev building a game (not an art installation or data viz), PlayCanvas gives you:
- Built-in input system, audio system, asset pipeline
- Better out-of-box performance (automatic batching, culling)
- WebGPU support for future-proofing
- Proven at scale (Venge.io, Mini Royale: Nations, Bullet Bonanza are all PlayCanvas)
- Same MIT license, same npm install

The 2-4 weeks you save not building engine plumbing is worth more than Three.js's larger tutorial ecosystem.

### Why NOT the PlayCanvas Cloud Editor

The cloud editor is useful but locks you into their hosting and workflow. For a betting platform that needs custom server infrastructure:
- Use PlayCanvas as an npm package only
- Keep your own build system (Vite/esbuild)
- Deploy to your own infrastructure
- Full control over server code and matchmaking

---

## Appendix: Key References

### Networking & Multiplayer
- Gabriel Gambetta's Fast-Paced Multiplayer series: https://www.gabrielgambetta.com/client-server-game-architecture.html
- Colyseus client-predicted input tutorial: https://learn.colyseus.io/phaser/3-client-predicted-input
- Colyseus documentation: https://docs.colyseus.io
- Browser Game Security: https://jsgaming.io/courses/browser-game-security-and-cheat-prevention/

### Movement & Physics
- Bunny Hopping from the Programmer's Perspective: https://adrianb.io/2015/02/14/bunnyhop.html
- Rapier.js documentation: https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- Rapier Node.js bindings: https://github.com/Thorium-Sim/rapier-node

### Assets
- Kenney game assets: https://kenney.nl/assets
- Quaternius free models: https://quaternius.com/
- Poly Pizza: https://poly.pizza/
- itch.io FPS asset packs: https://itch.io/game-assets/tag-fps/tag-low-poly
- Mixamo animations: https://www.mixamo.com/
- MagicaVoxel: https://ephtracy.github.io/
- gltfpack optimizer: https://meshoptimizer.org/gltf/

### Technical Breakdowns
- Krunker was built with Three.js, server rewritten in JS from scratch
- Krunker server tick rate: 10 Hz
- Krunker physics were originally FPS-dependent, fixed in v2.8.4
- Krunker movement: Quake-style air strafing + custom slidehopping mechanic
- Mini Royale: Nations used PlayCanvas + Node.js + Socket.io + Redis + MySQL

### Engine & Framework Repos
- PlayCanvas engine (14.7k stars, MIT): https://github.com/playcanvas/engine
- three-mesh-bvh (3.3k stars, MIT): https://github.com/gkjohnson/three-mesh-bvh
- Rapier.js (4k+ stars, Apache-2.0): https://github.com/dimforge/rapier.js
- NotBlox (166 stars, Three.js multiplayer reference): https://github.com/iErcann/Notblox
- TOSIOS (430 stars, MIT, Colyseus reference): https://github.com/halftheopposite/TOSIOS
