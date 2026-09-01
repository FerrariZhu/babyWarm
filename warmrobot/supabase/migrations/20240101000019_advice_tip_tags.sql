-- ============================================================
-- Advice tip tags: weather-threshold chips under conclusion.
-- Codes must match packages/core/src/advice-tip-tags.ts exactly.
-- ============================================================

create table if not exists public.advice_tip_tags (
  code            text primary key,
  label_zh        text not null,
  tone            text not null,
  weather_metric  text not null,
  threshold_value numeric,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint advice_tip_tags_code_check
    check (code in ('uv_caution', 'bring_umbrella', 'wind_caution')),
  constraint advice_tip_tags_tone_check
    check (tone in ('uv', 'rain', 'wind')),
  constraint advice_tip_tags_metric_check
    check (weather_metric in ('uv_index', 'rain', 'wind_speed')),
  constraint advice_tip_tags_threshold_check
    check (threshold_value is not null)
);

comment on table public.advice_tip_tags is
  '天气模块 tip 标签；按天气指标阈值决定是否展示（不在穿搭建议区）';
comment on column public.advice_tip_tags.weather_metric is
  'uv_index=紫外线指数>=threshold; rain=文案含雨或降水概率>=threshold; wind_speed=风速m/s>=threshold';
comment on column public.advice_tip_tags.threshold_value is
  'uv_index 默认 6；rain 默认降水概率 50（%）；wind_speed 默认 5（m/s，对齐「风较大」）';

drop trigger if exists advice_tip_tags_updated_at on public.advice_tip_tags;
create trigger advice_tip_tags_updated_at
  before update on public.advice_tip_tags
  for each row execute function public.set_updated_at();

alter table public.advice_tip_tags enable row level security;

drop policy if exists "advice_tip_tags_select_active" on public.advice_tip_tags;
create policy "advice_tip_tags_select_active"
  on public.advice_tip_tags for select
  using (is_active = true);

drop policy if exists "advice_tip_tags_select_authenticated" on public.advice_tip_tags;
create policy "advice_tip_tags_select_authenticated"
  on public.advice_tip_tags for select
  to authenticated
  using (true);

-- Seed (upsert) — align with ADVICE_TIP_TAG_DEFS
insert into public.advice_tip_tags
  (code, label_zh, tone, weather_metric, threshold_value, sort_order, is_active)
values
  ('uv_caution',     '注意防晒', 'uv',   'uv_index',   6, 10, true),
  ('bring_umbrella', '记得带伞', 'rain', 'rain',      50, 20, true),
  ('wind_caution',   '注意大风', 'wind', 'wind_speed', 5, 30, true)
on conflict (code) do update set
  label_zh = excluded.label_zh,
  tone = excluded.tone,
  weather_metric = excluded.weather_metric,
  threshold_value = excluded.threshold_value,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
