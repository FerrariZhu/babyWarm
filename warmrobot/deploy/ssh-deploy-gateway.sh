#!/usr/bin/env bash
set -Eeuo pipefail

readonly REQUESTED_COMMAND="${SSH_ORIGINAL_COMMAND:-}"
readonly COMMAND_PATTERN='^warmrobot-deploy [0-9a-f]{40}$'

if [[ ! "$REQUESTED_COMMAND" =~ $COMMAND_PATTERN ]]; then
  echo "this SSH identity can only activate a validated release" >&2
  exit 64
fi

readonly RELEASE_ID="${REQUESTED_COMMAND#warmrobot-deploy }"
exec /usr/local/sbin/warmrobot-deploy "$RELEASE_ID"
