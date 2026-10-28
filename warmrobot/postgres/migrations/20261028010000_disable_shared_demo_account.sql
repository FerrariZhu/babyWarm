-- Production hardening: retain historical data, but disable the formerly public
-- shared identity and invalidate all of its consumer sessions. Never delete data.
UPDATE public.app_accounts
SET is_active = false, updated_at = now()
WHERE lower(email) = 'demo_user_1@warmrobot.dev';

UPDATE public.app_sessions
SET revoked_at = now()
WHERE principal_kind = 'consumer'
  AND principal_id IN (
    SELECT id FROM public.app_accounts WHERE lower(email) = 'demo_user_1@warmrobot.dev'
  )
  AND revoked_at IS NULL;

UPDATE public.app_refresh_tokens
SET revoked_at = now()
WHERE account_id IN (
    SELECT id FROM public.app_accounts WHERE lower(email) = 'demo_user_1@warmrobot.dev'
  )
  AND revoked_at IS NULL;
