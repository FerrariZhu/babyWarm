import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { WARMTH_OFFSET_BY_PREFERENCE } from "../web/src/lib/baby-profile.ts";

const bootstrap = await readFile(new URL("../postgres/local-dev/bootstrap.sql", import.meta.url), "utf8");
const authMigration = await readFile(
  new URL("../postgres/migrations/20260910221000_wechat_self_hosted_auth.sql", import.meta.url),
  "utf8"
);

// Schema-contract checks only: never connect to a configured database from this test.
function tableDefinition(source, table) {
  const definition = source.match(
    new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\(([\\s\\S]*?)\\n\\);`, "i")
  );
  assert.ok(definition, `fresh local bootstrap must create public.${table}`);
  return definition[1].trim().replace(/\s+/g, " ");
}

test("fresh local schema can resolve and insert verified WeChat identities", () => {
  const identity = tableDefinition(bootstrap, "login_identities");
  assert.match(identity, /id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
  assert.match(identity, /user_id uuid NOT NULL REFERENCES public\.app_accounts\(id\) ON DELETE CASCADE/i);
  assert.match(identity, /provider text NOT NULL/i);
  assert.match(identity, /provider_subject text NOT NULL/i);
  assert.match(identity, /phone_verified_at timestamptz/i);
  assert.match(identity, /UNIQUE \(provider, provider_subject\)/i);
  assert.ok(
    bootstrap.indexOf("CREATE TABLE IF NOT EXISTS public.app_accounts")
      < bootstrap.indexOf("CREATE TABLE IF NOT EXISTS public.login_identities"),
    "the identity account foreign key must refer to an already-created table"
  );
});

test("fresh local refresh-token schema matches the production auth migration", () => {
  assert.equal(
    tableDefinition(bootstrap, "app_refresh_tokens"),
    tableDefinition(authMigration, "app_refresh_tokens")
  );
  assert.match(
    bootstrap,
    /CREATE INDEX IF NOT EXISTS app_refresh_tokens_account_active_idx\s+ON public\.app_refresh_tokens \(account_id, expires_at\)\s+WHERE revoked_at IS NULL;/i
  );
  assert.match(bootstrap, /REVOKE ALL ON public\.app_refresh_tokens FROM PUBLIC;/i);
  assert.match(bootstrap, /REVOKE ALL ON public\.login_identities FROM PUBLIC;/i);
});

test("local auth bootstrap does not create deployment roles or seed live identities", () => {
  assert.doesNotMatch(bootstrap, /CREATE\s+(?:USER|ROLE)\b/i);
  assert.doesNotMatch(bootstrap, /GRANT\s+[^;]*\bTO\s+warmrobot_app\b/i);
  assert.doesNotMatch(bootstrap, /INSERT INTO public\.(?:login_identities|app_refresh_tokens)\b/i);
});

test("fresh and existing local baby tables support profile create and edit timestamps", () => {
  const baby = tableDefinition(bootstrap, "babies");
  assert.match(baby, /current_size_updated_at timestamptz/i);
  assert.match(baby, /updated_at timestamptz NOT NULL DEFAULT now\(\)/i);
  assert.match(
    bootstrap,
    /ALTER TABLE public\.babies\s+ADD COLUMN IF NOT EXISTS current_size_updated_at timestamptz,\s+ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now\(\);/i
  );
});

test("local warmth preferences update the advice offset when a preference changes", () => {
  const preference = tableDefinition(bootstrap, "baby_warmth_preferences");
  assert.match(preference, /baby_id uuid PRIMARY KEY REFERENCES public\.babies\(id\) ON DELETE CASCADE/i);
  assert.match(preference, /warmth_preference text NOT NULL DEFAULT 'neutral'/i);
  assert.match(preference, /warmth_offset integer GENERATED ALWAYS AS \( CASE warmth_preference/i);
  assert.match(preference, /END \) STORED/i);
  assert.match(preference, /updated_at timestamptz NOT NULL DEFAULT now\(\)/i);
  const allowed = preference.match(/CHECK \(warmth_preference IN \(([^)]+)\)\)/i);
  assert.ok(allowed, "stored preferences must be constrained to supported values");
  assert.deepEqual(
    [...allowed[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort(),
    Object.keys(WARMTH_OFFSET_BY_PREFERENCE).sort()
  );
  for (const [value, offset] of Object.entries(WARMTH_OFFSET_BY_PREFERENCE)) {
    assert.match(preference, new RegExp(`WHEN '${value}' THEN ${offset}\\b`));
  }
});

test("local daily-brief cache supports profile invalidation and the existing upsert", () => {
  const brief = tableDefinition(bootstrap, "home_daily_briefs");
  assert.match(brief, /user_id uuid NOT NULL REFERENCES public\.app_accounts\(id\) ON DELETE CASCADE/i);
  assert.match(brief, /baby_id uuid NOT NULL REFERENCES public\.babies\(id\) ON DELETE CASCADE/i);
  assert.match(brief, /recommended_date date NOT NULL/i);
  assert.match(brief, /brief jsonb NOT NULL/i);
  assert.match(brief, /generated_at timestamptz NOT NULL/i);
  assert.match(brief, /updated_at timestamptz NOT NULL DEFAULT now\(\)/i);
  assert.match(brief, /PRIMARY KEY \(baby_id, recommended_date\)/i);
  assert.ok(
    bootstrap.indexOf("CREATE TABLE IF NOT EXISTS public.babies")
      < bootstrap.indexOf("CREATE TABLE IF NOT EXISTS public.home_daily_briefs")
  );
});
