-- Professional English display names for C-end (shown beside Chinese).
-- Catalog / baby-apparel tone; keep name_zh unchanged.

update public.categories as c
set
  name_en = v.name_en,
  updated_at = now()
from (values
  ('bodysuit_short', 'Short-Sleeve Bodysuit'),
  ('bodysuit_long',  'Long-Sleeve Bodysuit'),
  ('tshirt_short',   'Short-Sleeve T-Shirt'),
  ('tshirt_long',    'Long-Sleeve T-Shirt'),
  ('thermal_top',    'Thermal Undershirt'),
  ('sweater',        'Knit Sweater'),
  ('fleece_top',     'Fleece Top'),
  ('vest',           'Vest'),
  ('outer_uv',       'UV Protection Jacket'),
  ('outer_shell',    'Light Jacket'),
  ('outer_cotton',   'Padded Jacket'),
  ('outer_down',     'Down Jacket'),
  ('long_johns',     'Thermal Leggings'),
  ('pants_short',    'Shorts'),
  ('pants_mid',      'Cropped Pants'),
  ('pants_long',     'Long Pants'),
  ('shoes_sandal',   'Sandals'),
  ('shoes_sneaker',  'Sneakers'),
  ('shoes_leather',  'Leather Shoes'),
  ('shoes_boot',     'High-Top Boots'),
  ('hat',            'Hat'),
  ('scarf',          'Scarf'),
  ('gloves',         'Gloves'),
  ('socks',          'Socks'),
  ('other',          'Other')
) as v(code, name_en)
where c.code = v.code;
