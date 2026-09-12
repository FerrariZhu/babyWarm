BEGIN;

CREATE TABLE IF NOT EXISTS public.app_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by uuid REFERENCES public.app_refresh_tokens(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(token_digest) = 64)
);

CREATE INDEX IF NOT EXISTS app_refresh_tokens_account_active_idx
  ON public.app_refresh_tokens (account_id, expires_at)
  WHERE revoked_at IS NULL;

REVOKE ALL ON public.app_refresh_tokens FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_refresh_tokens TO warmrobot_app;
GRANT SELECT, INSERT, UPDATE ON public.login_identities TO warmrobot_app;

COMMIT;
