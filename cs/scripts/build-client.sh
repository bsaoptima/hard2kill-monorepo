#!/usr/bin/env bash
# Build the Vite client bundle from cs/client/src/ and stage the output at
# cs/client/dist/ for install-client.sh to docker-cp into the container.
# Run this on your laptop before deploying.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"  # cs/
CLIENT="$HERE/client"

if [[ ! -d "$CLIENT" ]]; then
  echo "Error: $CLIENT not found." >&2
  exit 1
fi

echo "[build-client] Installing deps in $CLIENT"
cd "$CLIENT"
npm install --no-audit --no-fund

echo "[build-client] Running vite build"
npm run build

# Vite config has root: 'src', so dist/ lands at client/src/dist/
VITE_DIST="$CLIENT/src/dist"
if [[ ! -d "$VITE_DIST" ]]; then
  echo "Error: expected build output at $VITE_DIST, not found." >&2
  exit 1
fi

echo "[build-client] Staging → $CLIENT/dist"
rm -rf "$CLIENT/dist"
cp -R "$VITE_DIST" "$CLIENT/dist"

echo "[build-client] Done. Next: ./scripts/install-client.sh"
