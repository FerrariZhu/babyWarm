#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C
umask 077

readonly RELEASE_ID="${1:-}"
readonly BASE_ID="${2:-}"
readonly RELEASES_DIR="/opt/warmrobot-releases"
readonly SHARED_ENV="/opt/warmrobot-shared/.env.production"
readonly CURRENT_LINK="/opt/warmrobot-current"
readonly ARCHIVE_PATH="/home/deploy/incoming/warmrobot-${RELEASE_ID}.tar.gz"

if [[ ! "$RELEASE_ID" =~ ^[0-9a-f]{40}$ || ! "$BASE_ID" =~ ^[0-9a-f]{40}$ ]]; then
  echo "release and base ids must be 40-character lowercase commit SHAs" >&2
  exit 2
fi

exec 9>"/var/lock/warmrobot-deploy.lock"
if ! flock -n 9; then
  echo "another production deployment is already running" >&2
  exit 3
fi

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "release archive is missing" >&2
  exit 4
fi
if [[ ! -f "$SHARED_ENV" ]]; then
  echo "shared production environment is missing" >&2
  exit 5
fi
if tar -tzf "$ARCHIVE_PATH" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "release archive contains an unsafe path" >&2
  exit 6
fi

install -d -m 0755 "$RELEASES_DIR"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
previous_release=""
if [[ -L "$CURRENT_LINK" ]]; then
  previous_release="$(readlink -f "$CURRENT_LINK")"
elif [[ -f /opt/warmrobot/compose.yaml ]]; then
  previous_release="/opt/warmrobot"
fi
if [[ -z "$previous_release" || ! -f "${previous_release}/.release-id" ]]; then
  echo "base release metadata is missing" >&2
  exit 7
fi
if [[ "$(<"${previous_release}/.release-id")" != "$BASE_ID" ]]; then
  echo "base release does not match ${BASE_ID}" >&2
  exit 8
fi

if [[ ! -f "${RELEASE_DIR}/.release-ready" ]]; then
  if [[ -e "$RELEASE_DIR" ]]; then
    rm -rf -- "$RELEASE_DIR"
  fi
  install -d -m 0755 "$RELEASE_DIR"
  tar --create --file - \
    --exclude='./.env*' \
    --exclude='./node_modules' \
    --exclude='./*/node_modules' \
    --exclude='./.next' \
    --exclude='./*/.next' \
    --directory "$previous_release" . \
    | tar --extract --file - --directory "$RELEASE_DIR" --no-same-owner --no-same-permissions
  tar --extract --gzip --file "$ARCHIVE_PATH" --directory "$RELEASE_DIR" --no-same-owner --no-same-permissions
  if [[ "$(<"${RELEASE_DIR}/.release-base")" != "$BASE_ID" ]]; then
    echo "release archive base does not match ${BASE_ID}" >&2
    exit 9
  fi
  while IFS= read -r deleted_path; do
    [[ -z "$deleted_path" ]] && continue
    if [[ "$deleted_path" == /* || "$deleted_path" == "." || "$deleted_path" == ".." || "$deleted_path" == ../* || "$deleted_path" == */../* || "$deleted_path" == */.. ]]; then
      echo "release deletion contains an unsafe path" >&2
      exit 10
    fi
    rm -rf -- "${RELEASE_DIR}/${deleted_path}"
  done < "${RELEASE_DIR}/.release-deletes"
  printf '%s\n' "$RELEASE_ID" > "${RELEASE_DIR}/.release-id"
  touch "${RELEASE_DIR}/.release-ready"
fi

for required in compose.yaml Dockerfile deploy/run-postgres-migrations.sh; do
  if [[ ! -f "${RELEASE_DIR}/${required}" ]]; then
    echo "release is missing ${required}" >&2
    exit 11
  fi
done

activated=false
rollback() {
  local exit_code=$?
  if [[ "$activated" == true && -n "$previous_release" && -f "${previous_release}/compose.yaml" ]]; then
    echo "deployment failed; restoring ${previous_release}" >&2
    ENV_FILE="$SHARED_ENV" docker compose --project-name warmrobot --file "${previous_release}/compose.yaml" up -d --build --remove-orphans || true
  fi
  exit "$exit_code"
}
trap rollback ERR

ENV_FILE="$SHARED_ENV" docker compose --project-name warmrobot --file "${RELEASE_DIR}/compose.yaml" build --pull

set -a
# shellcheck disable=SC1090
source "$SHARED_ENV"
set +a
bash "${RELEASE_DIR}/deploy/run-postgres-migrations.sh" "${RELEASE_DIR}/postgres/migrations"

activated=true
ENV_FILE="$SHARED_ENV" docker compose --project-name warmrobot --file "${RELEASE_DIR}/compose.yaml" up -d --remove-orphans

wait_for_url() {
  local url="$1"
  local attempt
  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_for_url "http://127.0.0.1:3000/login"
wait_for_url "http://127.0.0.1:3001/login"

ln -sfn "$RELEASE_DIR" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "$CURRENT_LINK"
rm -f -- "$ARCHIVE_PATH"
activated=false
trap - ERR

echo "deployed ${RELEASE_ID}"
