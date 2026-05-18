#!/usr/bin/env bash
# Full deploy orchestration on the droplet. Run AFTER rsyncing this directory
# from laptop and writing .env (via gen-secret.sh + manual H2K_WEBHOOK_URL).
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

# Pick docker-compose or `docker compose`
if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  echo "Error: neither 'docker-compose' nor 'docker compose' available. Install one." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Error: .env missing. Run ./scripts/gen-secret.sh --write .env first and add H2K_WEBHOOK_URL." >&2
  exit 1
fi

if [[ ! -d client-dist ]]; then
  echo "Warning: client-dist/ not present on droplet — skipping install-client step."
  echo "  Run ./scripts/build-client.sh on your laptop and rsync before re-running deploy."
  SKIP_CLIENT=1
fi

echo "[deploy] Bringing up containers"
$DC up -d

echo "[deploy] Waiting 3s for cs16 to settle"
sleep 3

echo "[deploy] Installing H2K plugin"
./scripts/install-plugin.sh

if [[ -z "${SKIP_CLIENT:-}" ]]; then
  echo "[deploy] Installing H2K client bundle"
  ./scripts/install-client.sh
fi

echo ""
echo "[deploy] Summary"
$DC ps
echo ""
echo "Verify with:"
echo "  docker logs cs16 2>&1 | grep 'H2K Deathmatch'"
echo "  docker logs h2k-sidecar | tail"
echo "  curl -s https://fps.hard2kill.me/h2k_state.json"
