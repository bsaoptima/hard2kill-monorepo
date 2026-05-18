#!/usr/bin/env bash
# Copy the built Vite client bundle into the running cs16 container.
# Survives container restarts until the container is recreated (then re-run).
# Prereq: ./scripts/build-client.sh produced client/dist/.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"   # cs/
CONTAINER=cs16
DIST="$HERE/client/dist"

if [[ ! -d "$DIST" ]]; then
  echo "Error: $DIST not found. Run ./scripts/build-client.sh first." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
  echo "Error: container '$CONTAINER' not running." >&2
  exit 1
fi

echo "[install-client] Copying new bundle into $CONTAINER:/xashds/public/"
docker cp "$DIST/index.html" "$CONTAINER:/xashds/public/index.html"
if [[ -d "$DIST/assets" ]]; then
  docker cp "$DIST/assets" "$CONTAINER:/xashds/public/"
fi
# Non-hashed top-level assets (favicon, logo, etc.)
find "$DIST" -maxdepth 1 -type f ! -name 'index.html' -print0 | while IFS= read -r -d '' f; do
  docker cp "$f" "$CONTAINER:/xashds/public/$(basename "$f")"
done

echo "[install-client] Done. HTTP server serves new files on next request (no restart needed)."
