-- Hat variants were seeded as generic「帽子」× material × thickness.
-- Product copy (home-daily-brief) needs 遮阳帽 in the hot/UV outdoor slot.
-- Relabel existing rows; warmth_value unchanged.

update public.garment_variants
set
  consumer_label = regexp_replace(consumer_label, '^帽子', '遮阳帽'),
  admin_label = regexp_replace(admin_label, '^帽子', '遮阳帽'),
  consumer_tags = case
    when not ('防晒' = any (consumer_tags)) then consumer_tags || array['防晒']
    else consumer_tags
  end,
  updated_at = now()
where category_code = 'hat'
  and thickness = 'thin'
  and coalesce(material, '') not in ('fleece', 'wool', 'down')
  and consumer_label like '帽子%';

update public.garment_variants
set
  consumer_label = regexp_replace(consumer_label, '^帽子', '保暖帽'),
  admin_label = regexp_replace(admin_label, '^帽子', '保暖帽'),
  updated_at = now()
where category_code = 'hat'
  and (
    thickness = 'thick'
    or coalesce(material, '') in ('fleece', 'wool', 'down')
  )
  and consumer_label like '帽子%';

update public.category_style_guides g
set
  title = '遮阳帽',
  subtitle = '晒天出门'
from public.categories c
where g.category_id = c.id
  and c.code = 'hat'
  and g.title = '薄棉帽';
