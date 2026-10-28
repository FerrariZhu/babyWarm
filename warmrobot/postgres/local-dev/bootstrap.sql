-- Local schema for Web/WeChat login and mini-program baby/advice flows.
-- Run only against a disposable local warmrobot_dev database.
-- Production uses its existing full schema and migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  password_hash text,
  display_name text,
  phone text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_kind text NOT NULL CHECK (principal_kind = 'consumer'),
  principal_id uuid NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_account_idx
  ON public.app_sessions (principal_id, expires_at DESC);

-- WeChat login resolves an OpenID to an account before creating its sessions.
-- Keep provider subjects unique per provider, not per account: several verified
-- identities can refer to the same account after phone-number account linking.
CREATE TABLE IF NOT EXISTS public.login_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  phone_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS login_identities_user_idx
  ON public.login_identities (user_id);

-- Match the production auth migration without requiring a deployment-specific
-- role in a disposable local database. The bootstrap owner runs the local app.
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

REVOKE ALL ON public.login_identities FROM PUBLIC;
REVOKE ALL ON public.app_refresh_tokens FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  city text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  wechat_openid text,
  wechat_unionid text,
  last_login_channel text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.babies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_date date NOT NULL,
  gender text,
  activity_level text NOT NULL DEFAULT 'low',
  current_size_label text,
  current_size_updated_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  height_cm numeric,
  weight_kg numeric,
  wears_diaper boolean,
  diaper_prompt_last_shown_at timestamptz,
  diaper_prompt_last_answered_at timestamptz,
  diaper_prompt_last_answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- CREATE TABLE IF NOT EXISTS does not upgrade a previously bootstrapped table.
ALTER TABLE public.babies
  ADD COLUMN IF NOT EXISTS current_size_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS babies_user_active_idx
  ON public.babies (user_id, is_active DESC, created_at);

CREATE TABLE IF NOT EXISTS public.baby_warmth_preferences (
  baby_id uuid PRIMARY KEY REFERENCES public.babies(id) ON DELETE CASCADE,
  warmth_preference text NOT NULL DEFAULT 'neutral'
    CHECK (warmth_preference IN ('runs_cold', 'slightly_cold', 'neutral', 'slightly_hot', 'runs_hot')),
  -- Profile writes change only the preference; advice reads its numeric offset.
  -- Keep this mapping aligned with WARMTH_OFFSET_BY_PREFERENCE in baby-profile.ts.
  warmth_offset integer GENERATED ALWAYS AS (
    CASE warmth_preference
      WHEN 'runs_cold' THEN 8
      WHEN 'slightly_cold' THEN 4
      WHEN 'neutral' THEN 0
      WHEN 'slightly_hot' THEN -4
      WHEN 'runs_hot' THEN -8
      ELSE 0
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Baby edits invalidate this cache even when made from the native mini-program.
CREATE TABLE IF NOT EXISTS public.home_daily_briefs (
  user_id uuid NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  baby_id uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  recommended_date date NOT NULL,
  brief jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (baby_id, recommended_date)
);

CREATE TABLE IF NOT EXISTS public.categories (
  code text PRIMARY KEY,
  outfit_slot text,
  icon_key text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.garment_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL REFERENCES public.categories(code),
  warmth_value numeric,
  consumer_label text,
  consumer_label_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  material text,
  thickness text,
  fit_type text,
  sock_height text,
  bodysuit_style text,
  pant_length text,
  fill_type text,
  hat_kind text,
  pros text,
  cons text,
  usage_tips text
);
CREATE INDEX IF NOT EXISTS garment_variants_active_order_idx
  ON public.garment_variants (sort_order) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.category_guide_contents (
  category_code text PRIMARY KEY REFERENCES public.categories(code),
  intro text,
  style_guides jsonb NOT NULL DEFAULT '[]'::jsonb,
  material_guides jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.guide_visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL REFERENCES public.categories(code),
  axis text NOT NULL,
  value text NOT NULL,
  storage_path text NOT NULL,
  alt_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  page_path text NOT NULL,
  module_name text,
  action_name text,
  visitor_id uuid NOT NULL,
  user_id uuid REFERENCES public.app_accounts(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
