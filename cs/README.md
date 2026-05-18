# cs/ — Hard2Kill CS 1.6 browser deployment

Self-contained. No ties to `hard2kill/` or `cs16-wagering/` (upstream reference checkout).
Deploy target: DigitalOcean droplet `161.35.99.157` / `fps.hard2kill.me`.

## Current scope

Load `fps.hard2kill.me` → assets download → connect → pick team + model → spawn at a random point on `de_dust2` via CSDM → pick weapons → instant-respawn TDM, no bomb, no round-end.

See `hard2kill-coworker/engineering/cs16-wagering/ROADMAP.md` for the live plan. Phase 0 shipped Apr 22-23; Phase 1 (branded boot + auto-download) is next.

## Layout

```
cs/
├── docker-compose.yml      # cs16 service; bind-mounts server.cfg + valve.zip
├── .env.example
├── cs-server/
│   ├── server.cfg          # our cvars — sv_timeout 600, TDM defaults, "Hard2Kill" hostname
│   └── plugins/            # (empty — CSDM plugins live inside the container)
├── client/                 # Vite bundle — upstream source today, HARD2KILL boot in Phase 1
├── parked/                 # In git, not deployed. Re-enabled in Phase 5+ (wagering).
│   ├── csdm/csdm-2.1.2.zip # Vendored CSDM so we don't depend on bailopan.net
│   ├── plugin/             # h2k_deathmatch.sma (wager 1v1) + h2k_tdm.sma (minimal TDM, replaced by CSDM)
│   ├── sidecar/            # Node event-tailer (HMAC webhook POSTer)
│   ├── overlays/index.html # Wagering UI: balance, +$/-$ killfeed, YOU WIN/LOSE
│   ├── scripts/            # install-plugin.sh (h2k_tdm-specific), gen-secret.sh
│   └── fly.toml            # Old Fly.io manifest (unused — we're on droplet)
└── scripts/
    ├── deploy.sh           # Idempotent orchestration: compose up + install-csdm + install-client
    ├── build-client.sh     # Build Vite bundle locally → client/dist/
    ├── install-client.sh   # docker cp client/dist/ → /xashds/public/ inside cs16
    ├── install-csdm.sh     # Unzip parked/csdm/*.zip, copy plugins+configs into cs16
    ├── slim-valve.sh       # Strip valve.zip → valve-dust2.v1.zip (~80 MB)
    └── resync-upstream.sh  # Pull fresh engine from ../cs16-wagering/
```

## Reserved names (future integration)

- `server/` — reserved for a future Node auth/wagering service if/when it colocates here. Don't use this directory name for anything else.
- `.env` — add `MATCH_WEBHOOK_URL` + `CS16_WEBHOOK_SECRET` when wagering re-lands.

## Typical workflows

**First-time deploy (or full reset) on droplet:**
```bash
# From laptop
cd /Users/stefan/Desktop/Code/game
rsync -avz --delete --exclude node_modules --exclude client/dist --exclude .env --exclude .git \
  cs/ root@161.35.99.157:/root/cs/

# On droplet
ssh root@161.35.99.157
cd /root/cs
cp .env.example .env        # first time only
./scripts/deploy.sh         # idempotent — runs compose up, install-csdm, install-client
```

**Subsequent code changes (most common path):**
```bash
# From laptop — just rsync, then run deploy on droplet (idempotent)
rsync -avz --delete --exclude node_modules --exclude client/dist --exclude .env --exclude .git \
  cs/ root@161.35.99.157:/root/cs/
ssh root@161.35.99.157 "cd /root/cs && ./scripts/deploy.sh"
```

**Slim valve.zip (run once on droplet when ready):**
```bash
./scripts/slim-valve.sh  # /root/valve.zip → /root/valve-dust2.v1.zip
# Then set VALVE_ZIP=/root/valve-dust2.v1.zip in .env and re-deploy
```

**Force re-install CSDM** (after changing plugin files):
```bash
./scripts/install-csdm.sh --force
```

**Pull a newer engine from upstream:**
```bash
./scripts/resync-upstream.sh  # overwrites client bundle, review diff after
```

## Known gotchas

- **docker-compose 1.29.2 `ContainerConfig` bug.** On a recreate, compose can fail with a KeyError. Fix: `docker rm -f $(docker ps -aq --filter name=cs16)` then `docker-compose up -d`.
- **sv_timeout 600** buys tab-background slack but doesn't fix the underlying "browser throttles hidden tab → WebRTC drops → engine falls back to GoldSrc main menu" bug. Real fix is Phase 1 Page Visibility API in our rewritten client.
- **CSDM is community, not upstream.** Sourced from `bailopan.net/csdm/` (now vendored). If anything breaks after a Xash3D engine update, that's where to look.

## Upstream

Engine base: https://github.com/yohimik/webxash3d-fwgs at `../cs16-wagering/`.
Our patches live in this repo's git history. Never push changes back into the upstream checkout — treat it as read-only reference.
