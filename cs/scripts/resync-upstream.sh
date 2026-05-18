#!/usr/bin/env bash
# Re-pull the client bundle source from the upstream webxash3d-fwgs checkout.
# Use this when we want a newer Xash3D WASM build: pull upstream, run this,
# re-apply our main.ts + index.html customizations, rebuild.
#
# Our patches vs upstream live in git history under cs/. After running this,
# `git diff` in cs/client/src/ shows what got overwritten — rebase our changes
# on top by hand (or cherry-pick from the cs/ git log).
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"  # cs/
UPSTREAM="${UPSTREAM:-$(cd "$HERE/../cs16-wagering" 2>/dev/null && pwd || true)}"

if [[ -z "$UPSTREAM" || ! -d "$UPSTREAM" ]]; then
  echo "Error: upstream checkout not found." >&2
  echo "Expected at \$UPSTREAM (default: ../cs16-wagering). Clone it with:" >&2
  echo "  git clone https://github.com/yohimik/webxash3d-fwgs.git ../cs16-wagering" >&2
  exit 1
fi

SRC="$UPSTREAM/docker/cs-web-server"
DST="$HERE/client"

echo "[resync] Source: $SRC"
echo "[resync] Target: $DST"
echo ""
echo "This will OVERWRITE files in $DST/src/ and $DST/package.json/tsconfig.json/vite.config.ts."
echo "Our customizations (HARD2KILL boot, progress bar, auto-connect, wagering hooks) will be overwritten."
echo "Recover them from git after:  cd $HERE && git diff"
echo ""
read -r -p "Proceed? [y/N] " ans
[[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 0; }

# Copy bundle source
cp "$SRC/src/client/main.ts"   "$DST/src/main.ts"
cp "$SRC/src/client/webrtc.ts" "$DST/src/webrtc.ts"
cp "$SRC/src/client/index.html" "$DST/src/index.html"
cp "$SRC/src/client/favicon.png" "$DST/src/favicon.png"
cp "$SRC/src/client/logo.png"    "$DST/src/logo.png"

# Copy build configs — note: vite.config.ts uses src/client/, our layout uses src/
# You'll need to re-apply the root: 'src' fix after this resync.
cp "$SRC/package.json"    "$DST/package.json"
cp "$SRC/tsconfig.json"   "$DST/tsconfig.json"
cp "$SRC/vite.config.ts"  "$DST/vite.config.ts"

echo ""
echo "[resync] Done. Review and re-apply our customizations:"
echo "  cd $HERE && git diff"
echo ""
echo "Known manual fixes after every resync:"
echo "  - vite.config.ts — change root from 'src/client' to 'src'"
echo "  - vite.config.ts — input path from 'src/client/index.html' to 'src/index.html'"
echo "  - package.json — drop 'build-docker' / 'push-image' scripts (not relevant here)"
