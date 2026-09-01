-- Admin user info: supplemental profile fields + standalone manual records

alter table public.profiles
  add column if not exists wechat_id text,
  add column if not exists admin_notes text;

comment on column public.profiles.wechat_id is '运营记录的微信号（可与 wechat_openid 并存）';
comment on column public.profiles.admin_notes is '后台运营备注，仅管理员可见';

create table public.admin_user_info_records (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  wechat_id text,
  email text,
  city text,
  admin_notes text,
  baby_name text,
  baby_birth_date date,
  baby_gender text check (baby_gender is null or baby_gender in ('male', 'female', 'unknown')),
  baby_height_cm numeric(5, 1) check (baby_height_cm is null or baby_height_cm > 0),
  baby_weight_kg numeric(5, 2) check (baby_weight_kg is null or baby_weight_kg > 0),
  baby_warmth_preference text check (
    baby_warmth_preference is null
    or baby_warmth_preference in (
      'runs_cold',
      'slightly_cold',
      'neutral',
      'slightly_hot',
      'runs_hot'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_user_info_parent_name_not_empty check (char_length(trim(parent_name)) > 0)
);

comment on table public.admin_user_info_records is '后台手动录入的用户信息（无 C 端账号时使用）';

create trigger admin_user_info_records_updated_at
  before update on public.admin_user_info_records
  for each row execute function public.set_updated_at();

alter table public.admin_user_info_records enable row level security;
