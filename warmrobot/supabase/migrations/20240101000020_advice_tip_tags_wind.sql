-- ============================================================
-- Tip tags: drop indoor_ok; add wind_caution (≥5 m/s).
-- Safe if 00019 already applied with the previous seed.
-- ============================================================

alter table public.advice_tip_tags
  drop constraint if exists advice_tip_tags_code_check;

alter table public.advice_tip_tags
  drop constraint if exists advice_tip_tags_tone_check;

alter table public.advice_tip_tags
  drop constraint if exists advice_tip_tags_metric_check;

alter table public.advice_tip_tags
  drop constraint if exists advice_tip_tags_threshold_check;

delete from public.advice_tip_tags where code = 'indoor_ok';

alter table public.advice_tip_tags
  add constraint advice_tip_tags_code_check
    check (code in ('uv_caution', 'bring_umbrella', 'wind_caution'));

alter table public.advice_tip_tags
  add constraint advice_tip_tags_tone_check
    check (tone in ('uv', 'rain', 'wind'));

alter table public.advice_tip_tags
  add constraint advice_tip_tags_metric_check
    check (weather_metric in ('uv_index', 'rain', 'wind_speed'));

alter table public.advice_tip_tags
  add constraint advice_tip_tags_threshold_check
    check (threshold_value is not null);

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

comment on column public.advice_tip_tags.weather_metric is
  'uv_index=紫外线指数>=threshold; rain=文案含雨或降水概率>=threshold; wind_speed=风速m/s>=threshold';
comment on column public.advice_tip_tags.threshold_value is
  'uv_index 默认 6；rain 默认降水概率 50（%）；wind_speed 默认 5（m/s，对齐「风较大」）';
