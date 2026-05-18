#!/usr/bin/env bash
# Compile h2k_deathmatch.sma → .amxx inside the running cs16 container, wire it
# into plugins.ini, and create the data→public symlinks for h2k_state.json and
# h2k_events.jsonl. Idempotent — safe to re-run after every deploy.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"   # cs16-server/
CONTAINER=cs16

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
  echo "Error: container '$CONTAINER' is not running. Run 'docker-compose up -d' first." >&2
  exit 1
fi

# 1. Copy the source into the container
echo "[install-plugin] Copying h2k_deathmatch.sma into container"
docker cp "$HERE/h2k_deathmatch.sma" "$CONTAINER:/tmp/h2k_deathmatch.sma"

# 2. Compile. amxxpc ships without execute permission — chmod first. Compile as
# root into /tmp (always writable), then move with the correct .amxx extension
# into plugins/. amxxpc appends/strips extensions inconsistently, so doing the
# rename ourselves is more reliable than fighting its -o behavior.
echo "[install-plugin] Compiling → h2k_deathmatch.amxx"
docker exec -u root "$CONTAINER" sh -c '
  set -e
  SCRIPTING=/xashds/cstrike/addons/amxmodx/scripting
  chmod +x "$SCRIPTING/amxxpc"
  # amxxpc loads amxxpc32.so from its own dir — must cd there before invoking.
  # Output into the same dir, then move with canonical .amxx extension.
  cd "$SCRIPTING"
  ./amxxpc /tmp/h2k_deathmatch.sma -o/tmp/h2k_deathmatch.amxx
  if [ -f /tmp/h2k_deathmatch.amxx ]; then
    mv /tmp/h2k_deathmatch.amxx /xashds/cstrike/addons/amxmodx/plugins/h2k_deathmatch.amxx
  elif [ -f /tmp/h2k_deathmatch.amx ]; then
    mv /tmp/h2k_deathmatch.amx /xashds/cstrike/addons/amxmodx/plugins/h2k_deathmatch.amxx
  else
    echo "FATAL: amxxpc did not produce a .amx/.amxx output in /tmp" >&2
    ls -la /tmp | grep h2k >&2 || true
    exit 1
  fi
  chmod 644 /xashds/cstrike/addons/amxmodx/plugins/h2k_deathmatch.amxx
'

# 3. Register in plugins.ini (idempotent) — run as root to avoid ownership issues
echo "[install-plugin] Ensuring plugins.ini references h2k_deathmatch.amxx"
docker exec -u root "$CONTAINER" sh -c '
  F=/xashds/cstrike/addons/amxmodx/configs/plugins.ini
  grep -q "^h2k_deathmatch.amxx" "$F" || printf "\nh2k_deathmatch.amxx\n" >> "$F"
'

# 4. Symlinks so the HTTP server exposes plugin-written files at a stable URL
echo "[install-plugin] Creating state + events symlinks"
docker exec -u root "$CONTAINER" sh -c '
  mkdir -p /xashds/cstrike/addons/amxmodx/data
  ln -sf /xashds/cstrike/addons/amxmodx/data/h2k_state.json   /xashds/public/h2k_state.json
  ln -sf /xashds/cstrike/addons/amxmodx/data/h2k_events.jsonl /xashds/public/h2k_events.jsonl
'

# 5. Restart so AMX reloads the plugin
echo "[install-plugin] Restarting cs16 to reload AMX plugins"
docker restart "$CONTAINER" >/dev/null

echo "[install-plugin] Done. Verify with: docker logs $CONTAINER 2>&1 | grep 'H2K Deathmatch'"
