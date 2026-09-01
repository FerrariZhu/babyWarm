#!/usr/bin/env bash
# Stop any running Next.js dev server, clear stale .next cache, then start fresh.
# Avoids ENOENT / webpack pack corruption from deleting .next while a process still holds it open.
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"

echo "Stopping existing Next.js dev servers (port ${PORT})..."
if lsof -ti ":${PORT}" >/dev/null 2>&1; then
  lsof -ti ":${PORT}" | xargs kill -9 2>/dev/null || true
fi
sleep 1

echo "Clearing .next cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Starting next dev on port ${PORT}..."
exec next dev -p "${PORT}"
