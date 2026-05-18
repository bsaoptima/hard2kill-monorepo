#!/usr/bin/env bash
# Droplet deploy. Run AFTER rsyncing cs/ from laptop and writing .env.
# Idempotent — safe to re-run; skips work that's already done.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"  # cs/
cd "$HERE"

# Pick docker-compose or `docker compose`
if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  echo "Error: neither 'docker-compose' nor 'docker compose' is available." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Warning: .env missing. Using defaults from docker-compose.yml + .env.example."
  echo "  For wagering to actually pay out, set MATCH_WEBHOOK_URL + CS16_WEBHOOK_SECRET."
fi

echo "[deploy] Bringing up containers"
$DC up -d

echo "[deploy] Waiting 3s for cs16 to settle"
sleep 3

# Install CSDM (TDM gameplay) if not already present.
if [[ -f parked/csdm/csdm-2.1.2.zip ]]; then
  echo "[deploy] Ensuring CSDM is installed"
  ./scripts/install-csdm.sh
fi

# Install our wagering companion plugin (token reader + match-end events).
if [[ -f cs-server/plugins/h2k_match.sma ]]; then
  echo "[deploy] Installing h2k_match plugin"
  ./scripts/install-h2k-plugin.sh
fi

# Inject HARD2KILL client bundle if built.
if [[ -d client/dist ]]; then
  echo "[deploy] Installing client bundle"
  ./scripts/install-client.sh
else
  echo "[deploy] No client/dist/ — skipping install-client. Run ./scripts/build-client.sh first to enable."
fi

echo ""
echo "[deploy] Summary"
$DC ps
echo ""
echo "Verify:"
echo "  docker logs cs16 2>&1 | grep -E 'H2K Match|csdm'"
echo "  docker logs h2k-sidecar --tail 20"
echo "  curl -s https://fps.hard2kill.me/h2k_state.json"
