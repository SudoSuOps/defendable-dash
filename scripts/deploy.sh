#!/usr/bin/env bash
# DefendableDash · one-command deploy (direct-upload via wrangler, no git-connect).
#   ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Node 22 (next-on-pages + Next 15 require it)
if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; nvm use 22 >/dev/null 2>&1 || true; fi

export CLOUDFLARE_ACCOUNT_ID="6abec5e82728df0610a98be9364918e4"   # rails

echo "▶ building CF Pages artifact (.vercel/output/static)…"
npm run pages:build

echo "▶ deploying to defendable-dash.pages.dev…"
npx wrangler pages deploy .vercel/output/static \
  --project-name=defendable-dash \
  --branch=main \
  --commit-dirty=true

echo "✓ deployed. Live: https://defendable-dash.pages.dev  (defendabledash.com once domain bound)"
