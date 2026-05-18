#!/usr/bin/env bash
# Install CSDM 2.1.2 (Counter-Strike Deathmatch Mod) into the running cs16
# container. Idempotent — safe to re-run; skips copy if files are already
# in place unless --force is passed.
#
# Uses the vendored zip at cs/parked/csdm/csdm-2.1.2.zip so we don't depend
# on bailopan.net being up.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"    # cs/
CONTAINER=cs16
ZIP="$HERE/parked/csdm/csdm-2.1.2.zip"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    *) echo "usage: $0 [--force]" >&2; exit 2 ;;
  esac
done

if [[ ! -f "$ZIP" ]]; then
  echo "Error: CSDM zip not found at $ZIP" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
  echo "Error: container '$CONTAINER' is not running." >&2
  exit 1
fi

# Idempotence check: already installed?
if [[ "$FORCE" -eq 0 ]] \
   && docker exec "$CONTAINER" test -f /xashds/cstrike/addons/amxmodx/plugins/csdm_main.amxx \
   && docker exec "$CONTAINER" test -f /xashds/cstrike/addons/amxmodx/configs/csdm.cfg; then
  echo "[install-csdm] CSDM already installed. Use --force to reinstall."
  exit 0
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "[install-csdm] Unzipping $ZIP → $WORK"
unzip -oq "$ZIP" -d "$WORK"

echo "[install-csdm] Copying 5 plugins into container"
for p in csdm_main csdm_equip csdm_spawn_preset csdm_misc csdm_protection; do
  docker cp "$WORK/addons/amxmodx/plugins/${p}.amxx" \
    "$CONTAINER:/xashds/cstrike/addons/amxmodx/plugins/${p}.amxx"
  echo "  copied ${p}.amxx"
done

echo "[install-csdm] Copying configs (csdm.cfg, plugins-csdm.ini, csdm/ spawn files)"
docker cp "$WORK/addons/amxmodx/configs/csdm.cfg" \
  "$CONTAINER:/xashds/cstrike/addons/amxmodx/configs/csdm.cfg"
docker cp "$WORK/addons/amxmodx/configs/plugins-csdm.ini" \
  "$CONTAINER:/xashds/cstrike/addons/amxmodx/configs/plugins-csdm.ini"
docker cp "$WORK/addons/amxmodx/configs/csdm" \
  "$CONTAINER:/xashds/cstrike/addons/amxmodx/configs/"

echo "[install-csdm] Registering CSDM plugins in plugins.ini + removing any h2k_tdm entry"
docker exec -u root "$CONTAINER" sh -c '
  F=/xashds/cstrike/addons/amxmodx/configs/plugins.ini
  # Comment out h2k_tdm if it was ever enabled; CSDM replaces it.
  sed -i "s/^h2k_tdm\.amxx/;h2k_tdm.amxx/" "$F"
  # Remove the compiled h2k_tdm plugin file so it cannot load from anywhere.
  rm -f /xashds/cstrike/addons/amxmodx/plugins/h2k_tdm.amxx
  # Add CSDM plugins if not already present.
  for p in csdm_main csdm_equip csdm_spawn_preset csdm_misc csdm_protection; do
    grep -q "^${p}\.amxx" "$F" || echo "${p}.amxx" >> "$F"
  done
'

echo "[install-csdm] Restarting $CONTAINER so AMX reloads plugins"
docker restart "$CONTAINER" >/dev/null

echo "[install-csdm] Done. Verify the boot log in a few seconds:"
echo "  docker logs $CONTAINER --tail 20"
