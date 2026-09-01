-- Per-variant English display name; strip subtitle from consumer_label (title only).

alter table public.garment_variants
  add column if not exists consumer_label_en text not null default '';

comment on column public.garment_variants.consumer_label_en is 'C 端英文类型名（逐条可编辑）';

-- Strip " · …" subtitle from consumer_label — keep title only.
update public.garment_variants
set consumer_label = trim(split_part(consumer_label, ' · ', 1))
where position(' · ' in consumer_label) > 0;

-- Default English labels by category (matches CATEGORY_DISPLAY_LABELS_EN in core).
update public.garment_variants gv
set consumer_label_en = v.en
from (values
  ('bodysuit_short', 'Short-Sleeve Bodysuit'),
  ('bodysuit_long', 'Long-Sleeve Bodysuit'),
  ('tshirt_short', 'Short-Sleeve T-Shirt'),
  ('tshirt_long', 'Long-Sleeve T-Shirt'),
  ('thermal_top', 'Thermal Undershirt'),
  ('sweater', 'Knit Sweater'),
  ('fleece_top', 'Fleece Top'),
  ('vest', 'Vest'),
  ('outer_uv', 'UV Protection Jacket'),
  ('outer_shell', 'Light Jacket'),
  ('outer_cotton', 'Padded Jacket'),
  ('outer_down', 'Down Jacket'),
  ('long_johns', 'Thermal Leggings'),
  ('pants_short', 'Shorts'),
  ('pants_mid', 'Cropped Pants'),
  ('pants_long', 'Long Pants'),
  ('shoes_sandal', 'Sandals'),
  ('shoes_sneaker', 'Sneakers'),
  ('shoes_leather', 'Leather Shoes'),
  ('shoes_boot', 'High-Top Boots'),
  ('hat', 'Hat'),
  ('scarf', 'Scarf'),
  ('gloves', 'Gloves'),
  ('socks', 'Socks'),
  ('other', 'Other')
) as v(code, en)
where gv.category_code = v.code
  and gv.consumer_label_en = '';

-- Hat rows: Sun / Warm / everyday English names from attrs + title.
update public.garment_variants
set consumer_label_en = case
  when consumer_label in ('遮阳帽', 'Sun Hat') then 'Sun Hat'
  when consumer_label in ('保暖帽', 'Warm Hat') then 'Warm Hat'
  when coalesce(material, '') in ('fleece', 'wool', 'down') or thickness = 'thick' then 'Warm Hat'
  when thickness = 'thin' then 'Sun Hat'
  else 'Hat'
end
where category_code = 'hat';

alter table public.garment_variants
  add constraint garment_variants_consumer_label_en_not_empty
  check (char_length(trim(consumer_label_en)) > 0);
