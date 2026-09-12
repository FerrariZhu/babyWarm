-- Approved category-level illustrations. The reserved category/overview key
-- keeps these assets compatible with the existing immutable asset registry,
-- while style-specific imagery remains available for individual guide cards.
comment on table public.guide_visual_assets is
  '衣物指南图片资产；category/overview 表示品类代表图，其余键表示具体款式图。';

insert into public.guide_visual_assets (
  id,
  category_code,
  axis,
  value,
  storage_path,
  alt_text,
  status,
  mime_type,
  byte_size
)
values
  ('00000000-0000-4000-8000-000000000001', 'bodysuit_long', 'category', 'overview', 'bodysuit_long/category/overview/00000000-0000-4000-8000-000000000001.png', '长袖三角款婴儿包屁衣示意图', 'approved', 'image/png', 75855),
  ('00000000-0000-4000-8000-000000000002', 'bodysuit_short', 'category', 'overview', 'bodysuit_short/category/overview/00000000-0000-4000-8000-000000000002.png', '短袖三角款婴儿包屁衣示意图', 'approved', 'image/png', 71013),
  ('00000000-0000-4000-8000-000000000003', 'fleece_top', 'category', 'overview', 'fleece_top/category/overview/00000000-0000-4000-8000-000000000003.png', '婴幼儿卫衣抓绒上衣示意图', 'approved', 'image/png', 73043),
  ('00000000-0000-4000-8000-000000000004', 'gloves', 'category', 'overview', 'gloves/category/overview/00000000-0000-4000-8000-000000000004.png', '婴幼儿保暖手套示意图', 'approved', 'image/png', 43027),
  ('00000000-0000-4000-8000-000000000005', 'hat', 'category', 'overview', 'hat/category/overview/00000000-0000-4000-8000-000000000005.png', '婴幼儿保暖帽示意图', 'approved', 'image/png', 62941),
  ('00000000-0000-4000-8000-000000000006', 'long_johns', 'category', 'overview', 'long_johns/category/overview/00000000-0000-4000-8000-000000000006.png', '婴幼儿秋裤示意图', 'approved', 'image/png', 78183),
  ('00000000-0000-4000-8000-000000000007', 'outer_cotton', 'category', 'overview', 'outer_cotton/category/overview/00000000-0000-4000-8000-000000000007.png', '婴幼儿连帽棉衣示意图', 'approved', 'image/png', 70147),
  ('00000000-0000-4000-8000-000000000008', 'outer_down', 'category', 'overview', 'outer_down/category/overview/00000000-0000-4000-8000-000000000008.png', '蓬松连帽婴幼儿羽绒服，帽檐带防风毛领', 'approved', 'image/png', 90890),
  ('00000000-0000-4000-8000-000000000009', 'outer_shell', 'category', 'overview', 'outer_shell/category/overview/00000000-0000-4000-8000-000000000009.png', '婴幼儿春秋防风外套示意图', 'approved', 'image/png', 59921),
  ('00000000-0000-4000-8000-000000000010', 'outer_uv', 'category', 'overview', 'outer_uv/category/overview/00000000-0000-4000-8000-000000000010.png', '婴幼儿轻薄防晒衣示意图', 'approved', 'image/png', 66912),
  ('00000000-0000-4000-8000-000000000011', 'pants_long', 'category', 'overview', 'pants_long/category/overview/00000000-0000-4000-8000-000000000011.png', '婴幼儿长裤示意图', 'approved', 'image/png', 70164),
  ('00000000-0000-4000-8000-000000000012', 'pants_mid', 'category', 'overview', 'pants_mid/category/overview/00000000-0000-4000-8000-000000000012.png', '婴幼儿中裤示意图', 'approved', 'image/png', 69291),
  ('00000000-0000-4000-8000-000000000013', 'pants_short', 'category', 'overview', 'pants_short/category/overview/00000000-0000-4000-8000-000000000013.png', '婴幼儿短裤示意图', 'approved', 'image/png', 65883),
  ('00000000-0000-4000-8000-000000000014', 'scarf', 'category', 'overview', 'scarf/category/overview/00000000-0000-4000-8000-000000000014.png', '柔软婴幼儿保暖围巾示意图', 'approved', 'image/png', 78634),
  ('00000000-0000-4000-8000-000000000015', 'shoes_boot', 'category', 'overview', 'shoes_boot/category/overview/00000000-0000-4000-8000-000000000015.png', '黄色高帮工装靴四十五度侧俯视示意图', 'approved', 'image/png', 135735),
  ('00000000-0000-4000-8000-000000000016', 'shoes_leather', 'category', 'overview', 'shoes_leather/category/overview/00000000-0000-4000-8000-000000000016.png', '婴幼儿皮鞋四十五度侧俯视示意图', 'approved', 'image/png', 114625),
  ('00000000-0000-4000-8000-000000000017', 'shoes_sandal', 'category', 'overview', 'shoes_sandal/category/overview/00000000-0000-4000-8000-000000000017.png', '婴幼儿凉鞋四十五度侧俯视示意图', 'approved', 'image/png', 129330),
  ('00000000-0000-4000-8000-000000000018', 'shoes_sneaker', 'category', 'overview', 'shoes_sneaker/category/overview/00000000-0000-4000-8000-000000000018.png', '婴幼儿运动鞋四十五度侧俯视示意图', 'approved', 'image/png', 162555),
  ('00000000-0000-4000-8000-000000000019', 'socks', 'category', 'overview', 'socks/category/overview/00000000-0000-4000-8000-000000000019.png', '婴幼儿袜子示意图', 'approved', 'image/png', 63120),
  ('00000000-0000-4000-8000-000000000020', 'sweater', 'category', 'overview', 'sweater/category/overview/00000000-0000-4000-8000-000000000020.png', '婴幼儿针织毛衣示意图', 'approved', 'image/png', 80926),
  ('00000000-0000-4000-8000-000000000021', 'thermal_top', 'category', 'overview', 'thermal_top/category/overview/00000000-0000-4000-8000-000000000021.png', '婴幼儿保暖秋衣示意图', 'approved', 'image/png', 65251),
  ('00000000-0000-4000-8000-000000000022', 'tshirt_long', 'category', 'overview', 'tshirt_long/category/overview/00000000-0000-4000-8000-000000000022.png', '婴幼儿长袖T恤示意图', 'approved', 'image/png', 52421),
  ('00000000-0000-4000-8000-000000000023', 'tshirt_short', 'category', 'overview', 'tshirt_short/category/overview/00000000-0000-4000-8000-000000000023.png', '婴幼儿短袖T恤示意图', 'approved', 'image/png', 61605),
  ('00000000-0000-4000-8000-000000000024', 'vest', 'category', 'overview', 'vest/category/overview/00000000-0000-4000-8000-000000000024.png', '婴幼儿马甲背心示意图', 'approved', 'image/png', 73998),
  ('00000000-0000-4000-8000-000000000025', 'vest_down', 'category', 'overview', 'vest_down/category/overview/00000000-0000-4000-8000-000000000025.png', '婴幼儿羽绒马甲示意图', 'approved', 'image/png', 81986)
on conflict (storage_path) do update set
  alt_text = excluded.alt_text,
  status = excluded.status,
  mime_type = excluded.mime_type,
  byte_size = excluded.byte_size,
  updated_at = now();
