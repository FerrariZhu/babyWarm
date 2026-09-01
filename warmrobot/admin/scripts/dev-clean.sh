#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if lsof -ti:3001 >/dev/null 2>&1; then
  echo "Stopping process on port 3001..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

rm -rf .next
echo "Starting admin dev server on http://localhost:3001 ..."
exec npm run dev
