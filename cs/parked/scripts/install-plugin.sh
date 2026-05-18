#!/usr/bin/env bash
# Compile cs-server/plugins/h2k_tdm.sma → h2k_tdm.amxx inside the running cs16
# container, register it in plugins.ini, and remove any stale h2k_deathmatch
# references left over from the pre-reset wagering plugin. Idempotent.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"   # cs/
CONTAINER=cs16
SRC="$HERE/cs-server/plugins/h2k_tdm.sma"

if [[ ! -f "$SRC" ]]; then
  echo "Error: plugin source not found at $SRC" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
  echo "Error: container '$CONTAINER' is not running. Run ./scripts/deploy.sh first." >&2
  exit 1
fi

# 1. Copy the source into the container
echo "[install-plugin] Copying h2k_tdm.sma into container"
docker cp "$SRC" "$CONTAINER:/tmp/h2k_tdm.sma"

# 2. Compile. amxxpc32.so is loaded relative to amxxpc's own dir — must cd there.
echo "[install-plugin] Compiling → h2k_tdm.amxx"
docker exec -u root "$CONTAINER" sh -c '
  set -e
  SCRIPTING=/xashds/cstrike/addons/amxmodx/scripting
  chmod +x "$SCRIPTING/amxxpc"
  cd "$SCRIPTING"
  ./amxxpc /tmp/h2k_tdm.sma -o/tmp/h2k_tdm.amxx
  if [ -f /tmp/h2k_tdm.amxx ]; then
    mv /tmp/h2k_tdm.amxx /xashds/cstrike/addons/amxmodx/plugins/h2k_tdm.amxx
  elif [ -f /tmp/h2k_tdm.amx ]; then
    mv /tmp/h2k_tdm.amx /xashds/cstrike/addons/amxmodx/plugins/h2k_tdm.amxx
  else
    echo "FATAL: amxxpc did not produce output in /tmp" >&2
    ls -la /tmp | grep h2k >&2 || true
    exit 1
  fi
  chmod 644 /xashds/cstrike/addons/amxmodx/plugins/h2k_tdm.amxx
'

# 3. Register h2k_tdm in plugins.ini + remove any old h2k_deathmatch reference
echo "[install-plugin] Updating plugins.ini (add h2k_tdm, drop h2k_deathmatch)"
docker exec -u root "$CONTAINER" sh -c '
  F=/xashds/cstrike/addons/amxmodx/configs/plugins.ini
  # Remove the old wagering plugin line if present
  sed -i "/^h2k_deathmatch\.amxx/d" "$F"
  # Add h2k_tdm if not already there
  grep -q "^h2k_tdm\.amxx" "$F" || printf "\nh2k_tdm.amxx\n" >> "$F"
'

# 4. Delete the old compiled wagering plugin so AMX cannot load it
echo "[install-plugin] Removing old h2k_deathmatch.amxx if present"
docker exec -u root "$CONTAINER" sh -c '
  rm -f /xashds/cstrike/addons/amxmodx/plugins/h2k_deathmatch.amxx
'

# 5. Restart so AMX reloads plugins
echo "[install-plugin] Restarting $CONTAINER to reload AMX"
docker restart "$CONTAINER" >/dev/null

echo "[install-plugin] Done. Verify with: docker logs $CONTAINER 2>&1 | grep 'H2K TDM'"
