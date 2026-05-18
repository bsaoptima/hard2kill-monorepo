#!/usr/bin/env bash
# Generate a 64-char hex secret suitable for CS16_WEBHOOK_SECRET.
# Same value must be set on BOTH the H2K backend (.env in hard2kill/) and the
# CS droplet (.env next to docker-compose.yml).
#
# Usage:
#   ./scripts/gen-secret.sh                  # print to stdout
#   ./scripts/gen-secret.sh --write .env     # prepend/replace CS16_WEBHOOK_SECRET line in .env
set -euo pipefail

SECRET=$(openssl rand -hex 32)

if [[ "${1:-}" == "--write" && -n "${2:-}" ]]; then
  FILE="$2"
  if [[ -f "$FILE" ]]; then
    # Replace existing line or append
    if grep -q '^CS16_WEBHOOK_SECRET=' "$FILE"; then
      # macOS and Linux have different sed semantics for -i; use a tempfile for portability
      tmp=$(mktemp)
      awk -v s="$SECRET" '/^CS16_WEBHOOK_SECRET=/ { print "CS16_WEBHOOK_SECRET=" s; next } { print }' "$FILE" > "$tmp"
      mv "$tmp" "$FILE"
    else
      echo "CS16_WEBHOOK_SECRET=$SECRET" >> "$FILE"
    fi
  else
    echo "CS16_WEBHOOK_SECRET=$SECRET" > "$FILE"
  fi
  echo "Wrote CS16_WEBHOOK_SECRET to $FILE"
else
  echo "$SECRET"
fi
