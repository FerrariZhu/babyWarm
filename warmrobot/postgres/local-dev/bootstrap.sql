-- Minimal schema for local Web login and the empty home screen.
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
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  height_cm numeric,
  weight_kg numeric,
  wears_diaper boolean,
  diaper_prompt_last_shown_at timestamptz,
  diaper_prompt_last_answered_at timestamptz,
  diaper_prompt_last_answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS babies_user_active_idx
  ON public.babies (user_id, is_active DESC, created_at);

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
