-- ============================================================
-- Category warmth intervals (穿衣指数 0–100) for all 25 spec categories.
-- Aligns with packages/core/src/category-warmth-ranges.ts and
-- WARMTH_CATEGORY_BANDS; intervals include ±buffer for 薄/中/厚 variation.
-- ============================================================

comment on column public.categories.warmth_min is
  '穿衣指数适用下限 (0-100)，闭区间；对齐 requiredWarmth，含厚薄版型波动';
comment on column public.categories.warmth_max is
  '穿衣指数适用上限 (0-100)，闭区间；对齐 requiredWarmth，含厚薄版型波动';

update public.categories set
  warmth_min = v.warmth_min,
  warmth_max = v.warmth_max,
  updated_at = now()
from (values
  -- base_top
  ('bodysuit_short',  0,  42),
  ('bodysuit_long',  32,  58),
  ('tshirt_short',    0,  42),
  ('tshirt_long',    32,  62),
  ('thermal_top',    48, 100),
  -- mid_top
  ('sweater',        48, 100),
  ('fleece_top',     62,  92),
  ('vest',           40,  78),
  -- outer
  ('outer_uv',        0,  45),
  ('outer_shell',    32,  72),
  ('outer_cotton',   62,  92),
  ('outer_down',     78, 100),
  -- base_bottom / bottom
  ('long_johns',     48, 100),
  ('pants_short',    18,  45),
  ('pants_mid',      28,  58),
  ('pants_long',     35,  85),
  -- footwear
  ('shoes_sandal',    0,  28),
  ('shoes_sneaker',  22,  72),
  ('shoes_leather',  32,  68),
  ('shoes_boot',     62, 100),
  ('socks',           0, 100),
  -- accessory
  ('hat',             0, 100),
  ('scarf',          78, 100),
  ('gloves',         62, 100),
  ('other',           0, 100)
) as v(code, warmth_min, warmth_max)
where public.categories.code = v.code;
