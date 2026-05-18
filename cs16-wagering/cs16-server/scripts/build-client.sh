#!/usr/bin/env bash
# Build the H2K-aware CS web client bundle and stage it for the cs16-server Docker build.
# Run this BEFORE `docker compose build`.
#
# This builds the Vite bundle from docker/cs-web-server/src/client/main.ts (modified to
# read ?token= from URL) and stages the output at cs16-server/client-dist/.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"     # cs16-server/
REPO="$(cd "$HERE/.." && pwd)"               # cs16-wagering/
CLIENT_SRC="$REPO/docker/cs-web-server"

if [[ ! -d "$CLIENT_SRC" ]]; then
  echo "Error: $CLIENT_SRC not found — are we in the right repo?" >&2
  exit 1
fi

echo "[build-client] Installing deps in $CLIENT_SRC"
cd "$CLIENT_SRC"
npm install --no-audit --no-fund

echo "[build-client] Building Vite bundle"
npm run build

# Vite config has root: 'src/client', so the dist/ ends up in src/client/dist/
VITE_DIST="$CLIENT_SRC/src/client/dist"
if [[ ! -d "$VITE_DIST" ]]; then
  # Fallback in case Vite config changes to place dist/ at project root
  VITE_DIST="$CLIENT_SRC/dist"
fi
echo "[build-client] Staging $VITE_DIST → $HERE/client-dist"
rm -rf "$HERE/client-dist"
cp -R "$VITE_DIST" "$HERE/client-dist"

echo "[build-client] Done. Now run: docker compose build"
