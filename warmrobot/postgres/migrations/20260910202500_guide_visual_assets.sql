create table if not exists public.guide_visual_assets (
  id uuid primary key default gen_random_uuid(),
  category_code text not null references public.categories(code) on delete cascade,
  axis text not null check (axis ~ '^[a-z][a-z0-9_]{0,63}$'),
  value text not null check (value ~ '^[a-z][a-z0-9_]{0,63}$'),
  storage_path text not null unique check (
    storage_path ~ '^[a-z0-9_]+/[a-z0-9_]+/[a-z0-9_]+/[0-9a-f-]{36}\.(webp|png|jpe?g)$'
  ),
  alt_text text not null check (char_length(alt_text) between 1 and 180),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  mime_type text not null check (mime_type in ('image/webp', 'image/png', 'image/jpeg')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 2097152),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guide_visual_assets_category_axis_value_idx
  on public.guide_visual_assets (category_code, axis, value, status, created_at desc);

drop trigger if exists guide_visual_assets_updated_at on public.guide_visual_assets;
create trigger guide_visual_assets_updated_at
  before update on public.guide_visual_assets
  for each row execute function public.set_updated_at();

alter table public.guide_visual_assets owner to warmrobot_migrator;
revoke all on public.guide_visual_assets from public;
grant select on public.guide_visual_assets to warmrobot_app;

comment on table public.guide_visual_assets is
  'Self-hosted clothing-guide image registry; storage_path resolves through the application media origin.';
