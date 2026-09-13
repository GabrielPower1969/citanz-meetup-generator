#!/usr/bin/env bash
# One-time setup on a fresh machine (macOS / Linux). `npm run build` also does this on demand.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Install Node 20+ first: https://nodejs.org"; exit 1; }
node scripts/build.js data/example.json && echo "Setup OK — example pack is in output/2026-08-26-blockchain/"
