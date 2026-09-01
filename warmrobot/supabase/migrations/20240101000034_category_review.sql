-- Category review: outfit slots (hat/scarf/gloves/other), vest_down, hat_kind axis, variant reseed.
-- Spec: docs/specs/category-review/

-- 1. Drop old outfit slot constraint so rows can be updated
alter table public.categories drop constraint if exists categories_outfit_slot_check;

-- 2. Migrate accessory → dedicated slots (must run before new CHECK)
update public.categories set outfit_slot = 'hat', updated_at = now() where code = 'hat';
update public.categories set outfit_slot = 'scarf', updated_at = now() where code = 'scarf';
update public.categories set outfit_slot = 'gloves', updated_at = now() where code = 'gloves';
update public.categories set outfit_slot = 'other', updated_at = now() where code = 'other';

-- 3. Remove sleep_sack (not in slot system)
delete from public.garment_variants where category_code = 'sleep_sack';
delete from public.categories where code = 'sleep_sack';

-- 4. New category: vest_down (羽绒马甲)
insert into public.categories
  (code, name_zh, name_en, layer_order, coverage_multiplier, warmth_bonus, sort_order, outfit_slot, warmth_min, warmth_max, icon_key, is_active)
values
  ('vest_down', '羽绒马甲', 'Down Vest', 2, 1.05, 0, 8, 'mid_top', 62, 92, 'ac_unit', true)
on conflict (code) do update set
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  outfit_slot = excluded.outfit_slot,
  warmth_min = excluded.warmth_min,
  warmth_max = excluded.warmth_max,
  icon_key = excluded.icon_key,
  is_active = true,
  updated_at = now();

-- 5. Re-add outfit slot constraint (after data migration)
alter table public.categories
  add constraint categories_outfit_slot_check
  check (
    outfit_slot in (
      'base_top', 'mid_top', 'outer', 'base_bottom', 'bottom',
      'socks', 'shoes',
      'hat', 'scarf', 'gloves', 'other'
    )
  );

comment on column public.categories.outfit_slot is
  '穿搭槽位：base_top/mid_top/outer/base_bottom/bottom/socks/shoes/hat/scarf/gloves/other';

-- 6. hat_kind column on garment_variants
alter table public.garment_variants
  add column if not exists hat_kind text;

comment on column public.garment_variants.hat_kind is
  '帽型：sun/everyday/warm；仅 category_code=hat 时使用';

alter table public.garment_variants
  drop constraint if exists garment_variants_unique_attrs;

alter table public.garment_variants
  add constraint garment_variants_unique_attrs unique nulls not distinct
  (category_id, material, fill_type, thickness, fit_type, bodysuit_style, pant_length, sock_height, hat_kind);

-- 7. Clear variants before reseed (INSERT in next migration)
delete from public.garment_variants;
