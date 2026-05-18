#!/usr/bin/env bash
# Strip a CS 1.6 asset bundle down for de_dust2-only deployment.
#
# HISTORY:
#   - v1 (aggressive): pruned maps, overviews, 6 player models, bot files,
#     intro media, valve/ SP maps. Produced 222 MB but BROKE connections —
#     something in that set is required by the server at connect time.
#   - v2 (current): conservative. Drops ONLY other maps. If this works,
#     we re-add cuts one at a time in future iterations.
#
# Usage:
#   ./slim-valve.sh                                 # /root/valve.zip → /root/valve-dust2.v1.zip
#   ./slim-valve.sh /path/to/in.zip /path/to/out.zip
set -euo pipefail

SRC="${1:-/root/valve.zip}"
DEST="${2:-/root/valve-dust2.v1.zip}"

if [[ ! -f "$SRC" ]]; then
  echo "Error: $SRC not found" >&2
  exit 1
fi

command -v unzip >/dev/null || { echo "unzip not installed. apt install unzip" >&2; exit 1; }
command -v zip   >/dev/null || { echo "zip not installed. apt install zip"   >&2; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "[slim] Extracting $SRC → $WORK"
unzip -q "$SRC" -d "$WORK"
cd "$WORK"

SIZE_BEFORE=$(du -sh . | cut -f1)
echo "[slim] Extracted size: $SIZE_BEFORE"

# ---------- Maps: keep only de_dust2 ----------
# Verified safe (Apr 24). Other maps only load on map change; our server
# is pinned to de_dust2, so they're pure dead weight.
if [[ -d cstrike/maps ]]; then
  echo "[slim] Pruning maps (keep de_dust2 only)"
  find cstrike/maps -maxdepth 1 -type f \
    ! -name 'de_dust2.*' \
    ! -name 'default.res' \
    -delete 2>/dev/null || true
  # bot nav meshes — one per map
  [[ -d cstrike/maps/graphs ]] && find cstrike/maps/graphs -type f ! -name 'de_dust2.*' -delete 2>/dev/null || true
fi

# ---------- Overviews for other maps ----------
# Tiny PNG/tga files per map (tactical minimap overlay). de_dust2's is kept.
if [[ -d cstrike/overviews ]]; then
  echo "[slim] Pruning overviews (keep de_dust2 only)"
  find cstrike/overviews -maxdepth 1 -type f ! -name 'de_dust2.*' -delete 2>/dev/null || true
fi

# ---------- Intro / misc media ----------
# AVIs and MP3s in media/ are opening movies and jingles; not referenced by
# the game server.
rm -f cstrike/media/*.avi cstrike/media/*.mp3 2>/dev/null || true
rm -f valve/media/*.avi   valve/media/*.mp3   2>/dev/null || true

# ---------- Half-Life single-player maps ----------
# valve/maps/ contains the HL SP campaign; CS doesn't load these. We kept
# valve/gfx, valve/sound, valve/sprites, valve/models, valve/dlls — those
# ARE shared with CS. Only maps/ is safe to drop.
if [[ -d valve/maps ]]; then
  echo "[slim] Removing Half-Life SP maps"
  rm -rf valve/maps
fi

# NOTE: Player-model prune + bot-files removal broke connectivity in v1.
# Don't re-add without isolated testing.

SIZE_AFTER=$(du -sh . | cut -f1)
echo "[slim] After pruning: $SIZE_AFTER (was $SIZE_BEFORE)"

echo "[slim] Repacking → $DEST"
# zip -r UPDATES an existing archive rather than recreating it — stale entries
# from a previous slim run would survive. Delete first to guarantee clean output.
rm -f "$DEST"
zip -qr "$DEST" valve/ cstrike/ 2>/dev/null

FINAL=$(du -sh "$DEST" | cut -f1)
echo "[slim] Done. $DEST = $FINAL"
echo ""
echo "To use:"
echo "  sed -i 's|VALVE_ZIP=.*|VALVE_ZIP=$DEST|' /root/cs/.env"
echo "  cd /root/cs && docker rm -f cs16 && docker-compose up -d"
echo "  ./scripts/install-csdm.sh && ./scripts/install-client.sh"
