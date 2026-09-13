#!/usr/bin/env bash
set -Eeuo pipefail

export LC_ALL=C

readonly MIGRATIONS_DIR="${1:-}"
: "${DATABASE_URL:?DATABASE_URL must be configured}"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "migration directory is missing" >&2
  exit 2
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
migration_files=("$MIGRATIONS_DIR"/*.sql)

for migration_file in "${migration_files[@]}"; do
  migration_name="$(basename "$migration_file")"
  if [[ ! "$migration_name" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
    echo "invalid migration filename: ${migration_name}" >&2
    exit 3
  fi

  applied="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v migration_name="$migration_name" -At <<'SQL'
SELECT 1
FROM public.schema_migrations
WHERE filename = :'migration_name';
SQL
)"
  if [[ "$applied" == "1" ]]; then
    echo "skip ${migration_name}"
    continue
  fi

  echo "apply ${migration_name}"
  {
    printf '%s\n' 'BEGIN;'
    printf '%s\n' "SELECT pg_advisory_xact_lock(hashtext('warmrobot_schema_migrations'));"
    cat "$migration_file"
    printf '\n%s\n' "INSERT INTO public.schema_migrations (filename) VALUES (:'migration_name');"
    printf '%s\n' 'COMMIT;'
  } | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v migration_name="$migration_name"
done
