#!/usr/bin/env bash
# Strip a CS 1.6 asset bundle down to just what's needed for de_dust2 + 1v1 deathmatch.
# Conservative pass — removes other maps, other player models, bot files, radio chatter.
# Leaves weapons alone initially (small size, high risk of breakage if something's missing).
#
# Usage:
#   ./strip-valve.sh                                       # defaults: /root/valve.zip → /root/valve-minimal.zip
#   ./strip-valve.sh /root/valve-slim.zip /root/out.zip    # explicit
set -euo pipefail

SRC="${1:-/root/valve.zip}"
DEST="${2:-/root/valve-minimal.zip}"

if [[ ! -f "$SRC" ]]; then
  echo "Error: $SRC not found" >&2
  exit 1
fi

command -v unzip >/dev/null || { echo "unzip not installed. apt install unzip" >&2; exit 1; }
command -v zip   >/dev/null || { echo "zip not installed. apt install zip" >&2; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "[strip] Extracting $SRC → $WORK"
unzip -q "$SRC" -d "$WORK"
cd "$WORK"

SIZE_BEFORE=$(du -sh . | cut -f1)
echo "[strip] Extracted size: $SIZE_BEFORE"

# ---------- Maps: keep only de_dust2 ----------
if [[ -d cstrike/maps ]]; then
  echo "[strip] Pruning maps (keep de_dust2 only)"
  find cstrike/maps -maxdepth 1 -type f \
    ! -name 'de_dust2.*' \
    ! -name 'default.res' \
    -delete 2>/dev/null || true
  # graphs/ contains bot nav meshes per map
  [[ -d cstrike/maps/graphs ]] && find cstrike/maps/graphs -type f ! -name 'de_dust2.*' -delete 2>/dev/null || true
fi

# ---------- Player models: keep urban (CT) + leet (T) ----------
if [[ -d cstrike/models/player ]]; then
  echo "[strip] Pruning player models (keep urban + leet)"
  for d in cstrike/models/player/*/; do
    name=$(basename "$d")
    if [[ "$name" != "urban" && "$name" != "leet" ]]; then
      rm -rf "$d"
    fi
  done
fi

# ---------- Bot profiles & chatter ----------
echo "[strip] Removing bot files"
rm -f cstrike/BotChatter.db cstrike/BotPackList.cfg cstrike/BotProfile.db 2>/dev/null || true

# ---------- Radio voice lines ----------
if [[ -d cstrike/sound/radio ]]; then
  echo "[strip] Removing radio voice lines"
  rm -rf cstrike/sound/radio
fi

# ---------- Intro / misc media ----------
rm -f cstrike/media/*.avi cstrike/media/*.mp3 2>/dev/null || true
rm -f valve/media/*.avi valve/media/*.mp3 2>/dev/null || true

SIZE_AFTER=$(du -sh . | cut -f1)
echo "[strip] After pruning: $SIZE_AFTER (was $SIZE_BEFORE)"

# ---------- Rezip ----------
echo "[strip] Repacking → $DEST"
cd "$WORK"
zip -qr "$DEST" valve/ cstrike/ 2>/dev/null

FINAL=$(du -sh "$DEST" | cut -f1)
echo "[strip] Done. $DEST = $FINAL"
echo ""
echo "To use:"
echo "  cd /root/cs16-server"
echo "  sed -i 's|valve-slim.zip|valve-minimal.zip|' docker-compose.yml"
echo "  sed -i 's|/root/valve.zip|/root/valve-minimal.zip|' docker-compose.yml"
echo "  docker rm -f cs16 2>/dev/null; docker-compose up -d cs16"
echo "  ./scripts/install-plugin.sh"
echo ""
echo "If the game crashes on load, diff with the original and add back whatever was pruned."
