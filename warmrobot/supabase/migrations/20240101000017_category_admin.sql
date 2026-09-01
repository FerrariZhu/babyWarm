-- ============================================================
-- Category admin: outfit slots, attr groups, warmth range,
-- icons, product links. Seeds align with WARMTH_CATEGORY_BANDS.
-- ============================================================

-- 1. Extend categories
alter table public.categories
  add column if not exists attr_group text,
  add column if not exists outfit_slot text,
  add column if not exists warmth_min smallint not null default 0
    check (warmth_min >= 0 and warmth_min <= 100),
  add column if not exists warmth_max smallint not null default 100
    check (warmth_max >= 0 and warmth_max <= 100),
  add column if not exists icon_key text,
  add column if not exists icon_url text;

alter table public.categories
  drop constraint if exists categories_warmth_range_check;

alter table public.categories
  add constraint categories_warmth_range_check
  check (warmth_min <= warmth_max);

alter table public.categories
  drop constraint if exists categories_attr_group_check;

alter table public.categories
  add constraint categories_attr_group_check
  check (
    attr_group is null
    or attr_group in ('top', 'bottom', 'footwear', 'accessory')
  );

alter table public.categories
  drop constraint if exists categories_outfit_slot_check;

alter table public.categories
  add constraint categories_outfit_slot_check
  check (
    outfit_slot is null
    or outfit_slot in (
      'base_top', 'mid_top', 'outer', 'base_bottom', 'bottom',
      'socks', 'shoes', 'accessory'
    )
  );

comment on column public.categories.attr_group is '粗分组: top=上装 bottom=下装 footwear=鞋袜 accessory=配饰';
comment on column public.categories.outfit_slot is '穿搭槽位: base_top/mid_top/outer/base_bottom/bottom/socks/shoes/accessory';
comment on column public.categories.warmth_min is '建议值适用下限 (0-100)，对齐 requiredWarmth';
comment on column public.categories.warmth_max is '建议值适用上限 (0-100)';
comment on column public.categories.icon_key is 'Material Symbols 图标名';
comment on column public.categories.icon_url is '自定义 icon 图片 URL（优先于 icon_key）';

-- 2. Product links
create table if not exists public.category_product_links (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete cascade,
  url          text not null,
  title        text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint category_product_links_url_not_empty check (char_length(trim(url)) > 0)
);

comment on table public.category_product_links is '品类可关联的商品链接（多条）';

create index if not exists category_product_links_category_idx
  on public.category_product_links (category_id, sort_order);

drop trigger if exists category_product_links_updated_at on public.category_product_links;
create trigger category_product_links_updated_at
  before update on public.category_product_links
  for each row execute function public.set_updated_at();

alter table public.category_product_links enable row level security;

drop policy if exists "category_product_links_select_active" on public.category_product_links;
create policy "category_product_links_select_active"
  on public.category_product_links for select
  using (
    is_active = true
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.is_active = true
    )
  );

-- Authenticated can read all categories (admin UI); public still only active via existing policy
drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated
  using (true);

drop policy if exists "category_product_links_select_authenticated" on public.category_product_links;
create policy "category_product_links_select_authenticated"
  on public.category_product_links for select
  to authenticated
  using (true);

-- Writes go through service role (admin API); no insert/update/delete for anon/authenticated

-- 3. Storage for category icons
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-icons',
  'category-icons',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "category_icons_select" on storage.objects;
create policy "category_icons_select"
  on storage.objects for select
  using (bucket_id = 'category-icons');

-- 4. Seed outfit metadata for the 25 spec categories
update public.categories set
  attr_group = v.attr_group,
  outfit_slot = v.outfit_slot,
  warmth_min = v.warmth_min,
  warmth_max = v.warmth_max,
  icon_key = v.icon_key,
  updated_at = now()
from (values
  ('bodysuit_short', 'top',       'base_top',     0,  39,  'checkroom'),
  ('bodysuit_long',  'top',       'base_top',    40,  54,  'checkroom'),
  ('tshirt_short',   'top',       'base_top',     0,  39,  'apparel'),
  ('tshirt_long',    'top',       'base_top',    40,  54,  'apparel'),
  ('thermal_top',    'top',       'base_top',    55, 100,  'layers'),
  ('sweater',        'top',       'mid_top',     55, 100,  'sweater'),
  ('fleece_top',     'top',       'mid_top',     70,  84,  'apparel'),
  ('vest',           'top',       'mid_top',     55,  84,  'apparel'),
  ('outer_uv',       'top',       'outer',        0,  39,  'sunny'),
  ('outer_shell',    'top',       'outer',       40,  69,  'styler'),
  ('outer_cotton',   'top',       'outer',       70,  84,  'styler'),
  ('outer_down',     'top',       'outer',       85, 100,  'ac_unit'),
  ('long_johns',     'bottom',    'base_bottom', 55, 100,  'layers'),
  ('pants_short',    'bottom',    'bottom',      25,  39,  'styler'),
  ('pants_mid',      'bottom',    'bottom',      40,  54,  'styler'),
  ('pants_long',     'bottom',    'bottom',      40, 100,  'styler'),
  ('shoes_sandal',   'footwear',  'shoes',        0,  24,  'beach_access'),
  ('shoes_sneaker',  'footwear',  'shoes',       25,  69,  'steps'),
  ('shoes_leather',  'footwear',  'shoes',       40,  69,  'steps'),
  ('shoes_boot',     'footwear',  'shoes',       70, 100,  'hiking'),
  ('hat',            'accessory', 'accessory',    0, 100,  'apparel'),
  ('scarf',          'accessory', 'accessory',   85, 100,  'styler'),
  ('gloves',         'accessory', 'accessory',   70, 100,  'back_hand'),
  ('socks',          'footwear',  'socks',        0, 100,  'socks'),
  ('other',          'accessory', 'accessory',    0, 100,  'category')
) as v(code, attr_group, outfit_slot, warmth_min, warmth_max, icon_key)
where public.categories.code = v.code;

create index if not exists categories_attr_group_idx
  on public.categories (attr_group)
  where is_active = true;

create index if not exists categories_outfit_slot_idx
  on public.categories (outfit_slot, warmth_min, warmth_max)
  where is_active = true;
