-- Versioned visual references for clothing-guide entries. Images are public to
-- read, while all writes go through the trusted admin server using service_role.
create table public.guide_visual_assets (
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

comment on table public.guide_visual_assets is
  '衣物指南款式图资产；storage_path 使用不可变版本路径，发布状态由后台维护。';

create index guide_visual_assets_category_axis_value_idx
  on public.guide_visual_assets (category_code, axis, value, status, created_at desc);

drop trigger if exists guide_visual_assets_updated_at on public.guide_visual_assets;
create trigger guide_visual_assets_updated_at
  before update on public.guide_visual_assets
  for each row execute function public.set_updated_at();

alter table public.guide_visual_assets enable row level security;
drop policy if exists guide_visual_assets_public_select on public.guide_visual_assets;
create policy guide_visual_assets_public_select
  on public.guide_visual_assets for select
  to anon, authenticated
  using (true);

-- Migration 00033 grants broad defaults. This visual-asset registry is a
-- deliberate exception: browser roles may read only; trusted server actions
-- use service_role, which bypasses RLS.
revoke all on public.guide_visual_assets from anon, authenticated;
grant select on public.guide_visual_assets to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garment-guide-images',
  'garment-guide-images',
  true,
  2097152,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public reads support direct public bucket URLs. No browser-role write policy
-- is created: the admin action uploads with service_role only.
drop policy if exists garment_guide_images_public_select on storage.objects;
create policy garment_guide_images_public_select
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'garment-guide-images');
