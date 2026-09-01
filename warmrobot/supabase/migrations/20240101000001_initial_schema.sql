-- ============================================================
-- 暖宝宝 — Initial Schema for Supabase
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensions
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 2. Enums
-- ------------------------------------------------------------
create type public.activity_level as enum ('low', 'medium', 'high');
-- low= mostly carried/stroller, medium= crawling, high= walking/running

create type public.clothing_category as enum (
  'bodysuit',       -- 连体衣 / 包屁衣
  'inner',          -- 内层（打底）
  'mid',            -- 中层（毛衣、抓绒）
  'outer',          -- 外层（外套、羽绒）
  'pants',          -- 裤子
  'sleepwear',      -- 睡袋 / 睡衣
  'hat',            -- 帽子
  'socks',          -- 袜子
  'gloves',         -- 手套
  'scarf',          -- 围巾
  'other'
);

create type public.fabric_material as enum (
  'cotton_light',   -- 纯棉单面 / 薄棉
  'cotton_heavy',   -- 纯棉双面 / 罗纹 / 厚棉
  'bamboo',         -- 竹纤维
  'fleece',         -- 抓绒
  'wool_light',     -- 薄针织 / 羊毛
  'wool_heavy',     -- 厚毛衣
  'down_light',     -- 薄羽绒
  'down_heavy',     -- 厚羽绒
  'waterproof',     -- 防风防水外层
  'other'
);

create type public.thickness_level as enum ('thin', 'medium', 'thick');

create type public.item_source as enum ('manual', 'url', 'template', 'ocr');

create type public.recommendation_feedback as enum ('too_cold', 'just_right', 'too_hot');

-- ------------------------------------------------------------
-- 3. Profiles (extends auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  city         text,           -- 默认城市，用于天气
  latitude     numeric(9, 6),
  longitude    numeric(9, 6),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is '用户扩展信息，与 Supabase Auth 1:1 关联';

-- ------------------------------------------------------------
-- 4. Babies
-- ------------------------------------------------------------
create table public.babies (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  birth_date      date not null,
  gender          text check (gender in ('male', 'female', 'unknown')),
  activity_level  public.activity_level not null default 'low',
  notes           text,
  is_active       boolean not null default true,  -- 当前选中的宝宝
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint babies_name_not_empty check (char_length(trim(name)) > 0)
);

comment on table public.babies is '0-3 岁宝宝档案';
comment on column public.babies.activity_level is 'low=抱/推车, medium=爬, high=走/跑';

create index babies_user_id_idx on public.babies (user_id);

-- ------------------------------------------------------------
-- 5. Clothing Items (衣柜单品)
-- ------------------------------------------------------------
create table public.clothing_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  baby_id         uuid references public.babies (id) on delete set null,

  name            text not null,
  category        public.clothing_category not null,
  material        public.fabric_material not null,
  thickness       public.thickness_level not null default 'medium',

  size_label      text,              -- 如 66, 73, 80
  weight_grams    integer check (weight_grams is null or weight_grams > 0),
  color           text,

  -- 系统计算的保暖值 (0-100)，可由 trigger 或 Edge Function 更新
  warmth_score    numeric(5, 2) not null default 0
                    check (warmth_score >= 0 and warmth_score <= 100),

  image_url       text,
  source          public.item_source not null default 'manual',
  source_url      text,              -- 网店链接
  source_metadata jsonb default '{}', -- 解析到的原始数据

  is_available    boolean not null default true,  -- 是否在库/可穿
  season_tags     text[] default '{}',            -- 如 {'spring','winter'}
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint clothing_items_name_not_empty check (char_length(trim(name)) > 0)
);

comment on table public.clothing_items is '衣柜单品';
comment on column public.clothing_items.warmth_score is '保暖值 0-100，由材料/厚度/类目计算';

create index clothing_items_user_id_idx on public.clothing_items (user_id);
create index clothing_items_baby_id_idx on public.clothing_items (baby_id);
create index clothing_items_category_idx on public.clothing_items (category);
create index clothing_items_warmth_score_idx on public.clothing_items (warmth_score);

-- ------------------------------------------------------------
-- 6. Clothing Templates (系统预设，快速导入典型衣柜)
-- ------------------------------------------------------------
create table public.clothing_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  category        public.clothing_category not null,
  material        public.fabric_material not null,
  thickness       public.thickness_level not null default 'medium',
  warmth_score    numeric(5, 2) not null,
  age_months_min  integer default 0,
  age_months_max  integer default 36,
  image_url       text,
  sort_order      integer default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.clothing_templates is '系统预设衣物模板，用户可一键导入到衣柜';

-- ------------------------------------------------------------
-- 7. Outfit Recommendations (推荐记录)
-- ------------------------------------------------------------
create table public.outfit_recommendations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  baby_id             uuid not null references public.babies (id) on delete cascade,

  recommended_date    date not null default current_date,

  -- 天气快照
  weather_temp        numeric(5, 2),   -- 气温 °C
  weather_feels_like  numeric(5, 2), -- 体感温度
  weather_humidity    integer,       -- 湿度 %
  weather_wind_speed  numeric(5, 2), -- 风速 m/s
  weather_pressure    numeric(7, 2), -- 气压 hPa
  weather_text        text,          -- 晴/雨/雪
  weather_raw         jsonb default '{}',

  required_warmth     numeric(5, 2) not null,  -- 所需保暖值
  actual_warmth       numeric(5, 2),           -- 推荐组合总保暖值
  reason              text,                    -- 推荐理由文案

  variant             text not null default 'default'
                        check (variant in ('default', 'warmer', 'cooler')),

  user_feedback       public.recommendation_feedback,
  feedback_note       text,

  created_at          timestamptz not null default now(),

  unique (baby_id, recommended_date, variant)
);

comment on table public.outfit_recommendations is '每日穿搭推荐记录';

create index outfit_recommendations_user_date_idx
  on public.outfit_recommendations (user_id, recommended_date desc);

-- ------------------------------------------------------------
-- 8. Recommendation ↔ Clothing (多对多)
-- ------------------------------------------------------------
create table public.outfit_recommendation_items (
  recommendation_id uuid not null
    references public.outfit_recommendations (id) on delete cascade,
  clothing_item_id  uuid not null
    references public.clothing_items (id) on delete cascade,
  layer_order       smallint not null default 1,  -- 1=内层, 2=中层, 3=外层
  primary key (recommendation_id, clothing_item_id)
);

-- ------------------------------------------------------------
-- 9. Weather Cache (减少 API 调用)
-- ------------------------------------------------------------
create table public.weather_cache (
  id            uuid primary key default gen_random_uuid(),
  cache_key     text not null unique,  -- 如 "beijing:2026-05-25:14"
  latitude      numeric(9, 6),
  longitude     numeric(9, 6),
  city          text,
  fetched_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  payload       jsonb not null
);

create index weather_cache_expires_at_idx on public.weather_cache (expires_at);

-- ------------------------------------------------------------
-- 10. updated_at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger babies_updated_at
  before update on public.babies
  for each row execute function public.set_updated_at();

create trigger clothing_items_updated_at
  before update on public.clothing_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 11. Auto-create profile on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 12. Warmth score calculation (DB-side baseline)
--     前端/Edge Function 可复用同一套参数
-- ------------------------------------------------------------
create or replace function public.calc_warmth_score(
  p_category public.clothing_category,
  p_material public.fabric_material,
  p_thickness public.thickness_level
)
returns numeric
language plpgsql
immutable
as $$
declare
  base_material numeric;
  thickness_mul numeric;
  coverage_mul  numeric;
begin
  base_material := case p_material
    when 'cotton_light'  then 15
    when 'cotton_heavy'  then 25
    when 'bamboo'        then 18
    when 'fleece'        then 40
    when 'wool_light'    then 50
    when 'wool_heavy'    then 60
    when 'down_light'    then 70
    when 'down_heavy'    then 85
    when 'waterproof'    then 35
    else 20
  end;

  thickness_mul := case p_thickness
    when 'thin'   then 1.0
    when 'medium' then 1.3
    when 'thick'  then 1.6
    else 1.0
  end;

  coverage_mul := case p_category
    when 'bodysuit'  then 1.0
    when 'inner'     then 0.9
    when 'mid'       then 1.1
    when 'outer'     then 1.2
    when 'pants'     then 0.8
    when 'sleepwear'  then 1.1 
    when 'hat'       then 1.0
    when 'socks'     then 1.0
    when 'gloves'    then 1.0
    when 'scarf'     then 1.0
    else 1.0
  end;

  return least(100, round(base_material * thickness_mul * coverage_mul, 2));
end;
$$;

-- 插入/更新时自动计算 warmth_score
create or replace function public.clothing_items_set_warmth_score()
returns trigger
language plpgsql
as $$
begin
  new.warmth_score := public.calc_warmth_score(new.category, new.material, new.thickness);

  -- 配件类固定加分（帽子/袜子等覆盖面积小但必要）
  if new.category = 'hat' then
    new.warmth_score := new.warmth_score + 8;
  elsif new.category = 'socks' then
    new.warmth_score := new.warmth_score + 5;
  elsif new.category = 'gloves' then
    new.warmth_score := new.warmth_score + 5;
  end if;

  new.warmth_score := least(100, new.warmth_score);
  return new;
end;
$$;

create trigger clothing_items_warmth_score
  before insert or update of category, material, thickness
  on public.clothing_items
  for each row execute function public.clothing_items_set_warmth_score();

-- ------------------------------------------------------------
-- 13. Row Level Security (RLS)
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.babies enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfit_recommendations enable row level security;
alter table public.outfit_recommendation_items enable row level security;
alter table public.weather_cache enable row level security;

-- profiles: 只能读写自己的
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- babies: 只能操作自己的宝宝
create policy "babies_select_own"
  on public.babies for select
  using (auth.uid() = user_id);

create policy "babies_insert_own"
  on public.babies for insert
  with check (auth.uid() = user_id);

create policy "babies_update_own"
  on public.babies for update
  using (auth.uid() = user_id);

create policy "babies_delete_own"
  on public.babies for delete
  using (auth.uid() = user_id);

-- clothing_items
create policy "clothing_select_own"
  on public.clothing_items for select
  using (auth.uid() = user_id);

create policy "clothing_insert_own"
  on public.clothing_items for insert
  with check (auth.uid() = user_id);

create policy "clothing_update_own"
  on public.clothing_items for update
  using (auth.uid() = user_id);

create policy "clothing_delete_own"
  on public.clothing_items for delete
  using (auth.uid() = user_id);

-- outfit_recommendations
create policy "recommendations_select_own"
  on public.outfit_recommendations for select
  using (auth.uid() = user_id);

create policy "recommendations_insert_own"
  on public.outfit_recommendations for insert
  with check (auth.uid() = user_id);

create policy "recommendations_update_own"
  on public.outfit_recommendations for update
  using (auth.uid() = user_id);

create policy "recommendations_delete_own"
  on public.outfit_recommendations for delete
  using (auth.uid() = user_id);

-- outfit_recommendation_items: 通过 recommendation 归属校验
create policy "rec_items_select_own"
  on public.outfit_recommendation_items for select
  using (
    exists (
      select 1 from public.outfit_recommendations r
      where r.id = recommendation_id and r.user_id = auth.uid()
    )
  );

create policy "rec_items_insert_own"
  on public.outfit_recommendation_items for insert
  with check (
    exists (
      select 1 from public.outfit_recommendations r
      where r.id = recommendation_id and r.user_id = auth.uid()
    )
  );

create policy "rec_items_delete_own"
  on public.outfit_recommendation_items for delete
  using (
    exists (
      select 1 from public.outfit_recommendations r
      where r.id = recommendation_id and r.user_id = auth.uid()
    )
  );

-- clothing_templates: 所有人可读（系统预设）
alter table public.clothing_templates enable row level security;

create policy "templates_select_all"
  on public.clothing_templates for select
  using (is_active = true);

-- weather_cache: 仅 service role 写入；authenticated 可读未过期缓存
create policy "weather_cache_select_valid"
  on public.weather_cache for select
  to authenticated
  using (expires_at > now());

-- ------------------------------------------------------------
-- 14. Seed: 典型 0-3 岁衣柜模板
-- ------------------------------------------------------------
insert into public.clothing_templates
  (name, description, category, material, thickness, warmth_score, age_months_min, age_months_max, sort_order)
values
  ('纯棉连体衣（薄）', '夏季室内基础款', 'bodysuit', 'cotton_light', 'thin', 15, 0, 36, 1),
  ('纯棉连体衣（中厚）', '春秋日常款', 'bodysuit', 'cotton_heavy', 'medium', 33, 0, 36, 2),
  ('抓绒连体衣', '秋冬中层', 'mid', 'fleece', 'medium', 52, 0, 36, 3),
  ('薄羽绒外套', '初冬外出', 'outer', 'down_light', 'medium', 84, 6, 36, 4),
  ('厚羽绒连体衣', '深冬外出', 'outer', 'down_heavy', 'thick', 100, 0, 24, 5),
  ('纯棉小胎帽', '头部保暖', 'hat', 'cotton_heavy', 'medium', 41, 0, 12, 6),
  ('针织小帽', '秋冬帽子', 'hat', 'wool_light', 'medium', 58, 0, 36, 7),
  ('纯棉短袜', '日常袜子', 'socks', 'cotton_light', 'thin', 20, 0, 36, 8),
  ('厚毛圈袜', '冬季袜子', 'socks', 'cotton_heavy', 'thick', 46, 0, 36, 9),
  ('防风外套', '刮风天气外层', 'outer', 'waterproof', 'medium', 42, 6, 36, 10);
