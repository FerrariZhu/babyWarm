comment on table public.guide_visual_assets is
  '衣物指南图片资产；category/overview 表示品类代表图，其余键表示具体款式图。';

with seed(category_code, alt_text, byte_size) as (
  values
    ('bodysuit_long', '长袖三角款婴儿包屁衣示意图', 75855),
    ('bodysuit_short', '短袖三角款婴儿包屁衣示意图', 71013),
    ('fleece_top', '婴幼儿卫衣抓绒上衣示意图', 73043),
    ('gloves', '婴幼儿保暖手套示意图', 43027),
    ('hat', '婴幼儿保暖帽示意图', 62941),
    ('long_johns', '婴幼儿秋裤示意图', 78183),
    ('outer_cotton', '婴幼儿连帽棉衣示意图', 70147),
    ('outer_down', '蓬松连帽婴幼儿羽绒服，帽檐带防风毛领', 90890),
    ('outer_shell', '婴幼儿春秋防风外套示意图', 59921),
    ('outer_uv', '婴幼儿轻薄防晒衣示意图', 66912),
    ('pants_long', '婴幼儿长裤示意图', 70164),
    ('pants_mid', '婴幼儿中裤示意图', 69291),
    ('pants_short', '婴幼儿短裤示意图', 65883),
    ('scarf', '柔软婴幼儿保暖围巾示意图', 78634),
    ('shoes_boot', '黄色高帮工装靴四十五度侧俯视示意图', 135735),
    ('shoes_leather', '婴幼儿皮鞋四十五度侧俯视示意图', 114625),
    ('shoes_sandal', '婴幼儿凉鞋四十五度侧俯视示意图', 129330),
    ('shoes_sneaker', '婴幼儿运动鞋四十五度侧俯视示意图', 162555),
    ('socks', '婴幼儿袜子示意图', 63120),
    ('sweater', '婴幼儿针织毛衣示意图', 80926),
    ('thermal_top', '婴幼儿保暖秋衣示意图', 65251),
    ('tshirt_long', '婴幼儿长袖T恤示意图', 52421),
    ('tshirt_short', '婴幼儿短袖T恤示意图', 61605),
    ('vest', '婴幼儿马甲背心示意图', 73998),
    ('vest_down', '婴幼儿羽绒马甲示意图', 81986)
), prepared as (
  select
    md5(category_code || ':category:overview')::uuid as id,
    category_code,
    'category'::text as axis,
    'overview'::text as value,
    category_code || '/category/overview/' || md5(category_code || ':category:overview')::uuid || '.png' as storage_path,
    alt_text,
    'approved'::text as status,
    'image/png'::text as mime_type,
    byte_size
  from seed
)
insert into public.guide_visual_assets (
  id, category_code, axis, value, storage_path, alt_text, status, mime_type, byte_size
)
select id, category_code, axis, value, storage_path, alt_text, status, mime_type, byte_size
from prepared
on conflict (storage_path) do update set
  alt_text = excluded.alt_text,
  status = excluded.status,
  mime_type = excluded.mime_type,
  byte_size = excluded.byte_size,
  updated_at = now();
