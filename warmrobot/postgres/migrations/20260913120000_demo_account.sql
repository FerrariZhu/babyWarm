-- Public, shared Demo account advertised on the consumer login page.
-- The credential is intentionally non-secret; only its scrypt digest is stored.
INSERT INTO public.app_accounts (
  id,
  email,
  password_hash,
  display_name,
  is_active
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'demo_user_1@warmrobot.dev',
  'scrypt$d2FybXJvYm90LWRlbW8x$V_7pZx9YIKR1qHtvGHatlHzF5EN_Y7BLtyCHjAoHn60la3zsBE6AargB5csGqUrE5g58UWABkscGjU1VaP-uoA',
  'Demo 用户',
  true
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    is_active = true,
    updated_at = now();
