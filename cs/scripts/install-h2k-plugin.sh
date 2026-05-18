#!/usr/bin/env bash
# Compile cs-server/plugins/h2k_match.sma → h2k_match.amxx inside the running
# cs16 container, register it in plugins.ini alongside CSDM, and create the
# symlinks that expose state + events files via the container's HTTP server.
#
# Idempotent — safe to re-run after every deploy. Requires: cs16 already up
# with CSDM installed (via install-csdm.sh).
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"  # cs/
CONTAINER=cs16
SRC="$HERE/cs-server/plugins/h2k_match.sma"

if [[ ! -f "$SRC" ]]; then
  echo "Error: plugin source not found at $SRC" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
  echo "Error: container '$CONTAINER' is not running. Run ./scripts/deploy.sh first." >&2
  exit 1
fi

echo "[install-h2k-plugin] Copying h2k_match.sma into container"
docker cp "$SRC" "$CONTAINER:/tmp/h2k_match.sma"

echo "[install-h2k-plugin] Compiling → h2k_match.amxx"
docker exec -u root "$CONTAINER" sh -c '
  set -e
  SCRIPTING=/xashds/cstrike/addons/amxmodx/scripting
  chmod +x "$SCRIPTING/amxxpc"
  cd "$SCRIPTING"
  ./amxxpc /tmp/h2k_match.sma -o/tmp/h2k_match.amxx
  if [ -f /tmp/h2k_match.amxx ]; then
    mv /tmp/h2k_match.amxx /xashds/cstrike/addons/amxmodx/plugins/h2k_match.amxx
  elif [ -f /tmp/h2k_match.amx ]; then
    mv /tmp/h2k_match.amx /xashds/cstrike/addons/amxmodx/plugins/h2k_match.amxx
  else
    echo "FATAL: amxxpc did not produce output" >&2
    ls -la /tmp | grep h2k >&2 || true
    exit 1
  fi
  chmod 644 /xashds/cstrike/addons/amxmodx/plugins/h2k_match.amxx
'

echo "[install-h2k-plugin] Registering in plugins.ini (after CSDM plugins)"
docker exec -u root "$CONTAINER" sh -c '
  F=/xashds/cstrike/addons/amxmodx/configs/plugins.ini
  # Drop any old wagering plugin lines
  sed -i "/^h2k_deathmatch\.amxx/d; /^h2k_tdm\.amxx/d" "$F"
  # Drop any stale h2k_match line so we re-add it cleanly
  sed -i "/^h2k_match\.amxx/d" "$F"
  # Add at end (after CSDM entries)
  echo "h2k_match.amxx" >> "$F"
'

echo "[install-h2k-plugin] Creating state + events symlinks (HTTP-fetchable from sidecar)"
docker exec -u root "$CONTAINER" sh -c '
  mkdir -p /xashds/cstrike/addons/amxmodx/data
  # Pre-create the files so symlinks point at something even before plugin writes
  touch /xashds/cstrike/addons/amxmodx/data/h2k_state.json
  touch /xashds/cstrike/addons/amxmodx/data/h2k_events.jsonl
  ln -sf /xashds/cstrike/addons/amxmodx/data/h2k_state.json   /xashds/public/h2k_state.json
  ln -sf /xashds/cstrike/addons/amxmodx/data/h2k_events.jsonl /xashds/public/h2k_events.jsonl
'

echo "[install-h2k-plugin] Restarting $CONTAINER so AMX reloads plugins"
docker restart "$CONTAINER" >/dev/null

echo "[install-h2k-plugin] Done. Verify with: docker logs $CONTAINER 2>&1 | grep 'H2K Match'"
