-- ============================================================
-- category_style_guides: editorial style cards per category
-- Shown in C-end half-sheet when tapping a checklist slot card.
-- Decoupled from garment_variants (warmth cartesian product).
-- Spec: docs/specs/category-style-guides.md
-- ============================================================

create table if not exists public.category_style_guides (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references public.categories (id) on delete cascade,
  category_code   text not null,
  title           text not null,
  subtitle        text,
  pros            text not null default '',
  cons            text not null default '',
  usage_tips      text not null default '',
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint category_style_guides_title_not_empty
    check (char_length(trim(title)) > 0)
);

comment on table public.category_style_guides is
  '品类编辑型款式说明：标题/优劣/使用场景；C 端半弹层与后台配置共用';
comment on column public.category_style_guides.title is '款式卡标题，如「三角款 · 纯棉」';
comment on column public.category_style_guides.subtitle is '可选副标，如「换尿布最快」';
comment on column public.category_style_guides.pros is '优点（一句）';
comment on column public.category_style_guides.cons is '局限（一句）';
comment on column public.category_style_guides.usage_tips is '建议使用场景（一句）';

create index if not exists category_style_guides_category_code_active_idx
  on public.category_style_guides (category_code, is_active, sort_order)
  where is_active = true;

create index if not exists category_style_guides_category_id_idx
  on public.category_style_guides (category_id, sort_order);

drop trigger if exists category_style_guides_updated_at on public.category_style_guides;
create trigger category_style_guides_updated_at
  before update on public.category_style_guides
  for each row execute function public.set_updated_at();

alter table public.category_style_guides enable row level security;

drop policy if exists "category_style_guides_select_active" on public.category_style_guides;
create policy "category_style_guides_select_active"
  on public.category_style_guides for select
  using (
    is_active = true
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.is_active = true
    )
  );

drop policy if exists "category_style_guides_select_authenticated" on public.category_style_guides;
create policy "category_style_guides_select_authenticated"
  on public.category_style_guides for select
  to authenticated
  using (true);

-- Seed: curated editorial cards (not full attribute cartesian)
insert into public.category_style_guides
  (category_id, category_code, title, subtitle, pros, cons, usage_tips, sort_order)
select c.id, v.category_code, v.title, v.subtitle, v.pros, v.cons, v.usage_tips, v.sort_order
from (values
  -- bodysuit_short
  ('bodysuit_short', '三角款 · 纯棉', '换尿布最快',
   '裆部按扣多，换尿布不必脱衣；纯棉亲肤透气。',
   '腿部覆盖少，偏凉时略显单薄。',
   '热天居家、频繁换尿布的小月龄首选。', 10),
  ('bodysuit_short', '平裤款 · 纯棉', '更遮大腿',
   '比三角多盖一点腿，活动时不易走光。',
   '换尿布稍慢于三角款。',
   '暖天出门短途、希望稍多覆盖时。', 20),
  ('bodysuit_short', '长裤款 · 纯棉', '一条顶上下',
   '连脚/长裤一体，省去另穿短裤。',
   '热天可能偏闷，换尿布步骤更多。',
   '微凉过渡天、想减少单品件数时。', 30),
  ('bodysuit_short', '莫代尔薄款', '凉感柔软',
   '手感滑软、吸湿快干，闷热天更舒服。',
   '耐磨与定型略逊于纯棉；价位通常更高。',
   '湿热天气、出汗多或爱踢被的宝宝。', 40),
  ('bodysuit_short', '腈纶/涤纶混纺', '易干耐穿',
   '洗后干得快，颜色更耐洗。',
   '贴身透气与亲肤感一般不如棉/莫代尔。',
   '备洗量大、常外出洗衣不便时当备份。', 50),

  -- bodysuit_long
  ('bodysuit_long', '三角款 · 纯棉', '温天贴身',
   '长袖保暖手臂，三角裆换尿布仍方便。',
   '腿部仍需另配外裤或袜子。',
   '春秋室内、需长袖但不想穿秋衣时。', 10),
  ('bodysuit_long', '长裤款 · 中厚棉', '一体更暖',
   '躯干与腿同层保暖，减少空隙灌风。',
   '换尿布较慢；过热时不好分层脱。',
   '凉天居家、睡眠或短途抱娃出门。', 20),
  ('bodysuit_long', '莫代尔/混纺薄长袖', '过渡季贴身',
   '薄长袖不显臃肿，叠穿空间大。',
   '单穿在大风天不够挡风。',
   '温凉交界、白天室内偏暖时。', 30),

  -- tshirt_short
  ('tshirt_short', '纯棉标准版', '日常百搭',
   '亲肤耐洗，和短裤/包屁裙都好搭。',
   '吸汗后贴身可能略沉。',
   '热天日常居家与散步。', 10),
  ('tshirt_short', '纯棉宽松版', '活动更自在',
   '腋下与胸围留余量，爬行翻身少勒。',
   '视觉上略显宽大，袖口易卷。',
   '学爬学走阶段、出汗多时。', 20),
  ('tshirt_short', '莫代尔薄款', '闷热天更干爽',
   '凉感好、干得快。',
   '勾丝与起球风险略高于厚棉。',
   '高湿闷热、室内空调温差大时。', 30),

  -- tshirt_long
  ('tshirt_long', '纯棉薄长袖', '过渡层基础',
   '可单穿也可当打底，袖口不勒。',
   '大风天需再加外套。',
   '春秋早晚温差大的日子。', 10),
  ('tshirt_long', '纯棉厚/宽松', '微凉单穿',
   '面料更厚，室内可少叠一层。',
   '热起来不好只脱一层袖。',
   '凉天室内、不想上秋衣时。', 20),

  -- thermal_top
  ('thermal_top', '薄秋衣 · 棉/莫代尔', '凉档打底',
   '贴身蓄热，外套不显臃肿。',
   '单独抗风能力弱。',
   '初凉、室内暖气不足时打底。', 10),
  ('thermal_top', '中厚秋衣 · 紧身', '锁温更好',
   '贴身减少空气对流，保暖效率高。',
   '穿脱略慢；领口袖口要选松紧合适的。',
   '凉–冷天叠毛衣或外套前的基础层。', 20),

  -- sweater
  ('sweater', '薄针织 · 标准', '轻暖中层',
   '比卫衣更透气，叠穿层次清晰。',
   '钩丝；洗涤要更小心。',
   '凉天室内或薄外套内搭。', 10),
  ('sweater', '厚毛衣 · 宽松', '明显加暖',
   '保暖感强，外观更「冬装」。',
   '体积大，再套厚外套会显臃肿。',
   '冷天居家或短时户外。', 20),

  -- fleece_top
  ('fleece_top', '薄卫衣/抓绒', '抗凉又好动',
   '比针织更耐磨，适合爬行玩耍。',
   '静电与起球；闷热时偏捂。',
   '凉天户外活动、幼儿园接送。', 10),
  ('fleece_top', '中厚抓绒', '风大时更暖',
   '挡凉风好于薄卫衣。',
   '室内暖气房容易过热。',
   '冷天短途出门、公园玩耍。', 20),

  -- vest
  ('vest', '薄棉/摇粒马甲', '护胸腹不捂胳膊',
   '核心保暖，手臂活动自由。',
   '手臂与肩部仍需其他层。',
   '温凉天室外玩、怕袖子妨碍活动时。', 10),

  -- outer_uv
  ('outer_uv', '薄防晒衣 · 涤纶', '挡晒透气',
   '轻薄易收纳，UV 防护明确。',
   '几乎不保暖；大风天挡风有限。',
   '热天户外暴晒、海边或公园。', 10),

  -- outer_shell
  ('outer_shell', '薄风衣/夹克', '挡风防小雨',
   '防风层清晰，里面可自由叠穿。',
   '本身保暖弱，冷天必须内搭够。',
   '春秋有风、偶有小雨的日子。', 10),
  ('outer_shell', '中厚外套', '过渡季主外层',
   '单件即可应对凉意。',
   '再冷就需要棉/羽绒。',
   '深秋初冬、早晚出门。', 20),

  -- outer_cotton
  ('outer_cotton', '薄棉服', '轻暖出门',
   '比羽绒服轻便，保暖适中。',
   '极寒不够；洗后鼓度可能下降。',
   '冷而不至极寒的日常通勤式出门。', 10),
  ('outer_cotton', '厚棉服', '明显抗寒',
   '蓄热强，适合长时间在外。',
   '体积大，车内/室内易过热。', '冷天户外长时间、无暖气场所。', 20),

  -- outer_down
  ('outer_down', '轻薄羽绒', '高暖低负担',
   '同等厚度保暖最高，易压缩收纳。',
   '怕湿；价格高；护理要求高。',
   '真正冷天短途、需要塞进包里备用时。', 10),
  ('outer_down', '厚羽绒', '极寒主力',
   '抗极寒能力强。',
   '臃肿；进暖气房必须马上脱。',
   '严寒户外、长时间等候。', 20),

  -- long_johns
  ('long_johns', '薄秋裤', '凉档下装打底',
   '腿部蓄热，外裤仍可穿得薄一点。',
   '热了只能连外裤一起调整。',
   '初凉天、外穿薄长裤时。', 10),
  ('long_johns', '中厚秋裤 · 紧身', '冷天锁温',
   '贴腿减少灌风。',
   '穿脱与如厕稍麻烦。',
   '冷天外穿厚裤或包屁裙内。', 20),

  -- pants_short
  ('pants_short', '纯棉短裤', '热天外下',
   '透气、好搭配短袖或包屁衣。',
   '覆盖少，空调房或傍晚易凉。',
   '热天居家与户外短时活动。', 10),

  -- pants_mid
  ('pants_mid', '七分裤 · 纯棉', '过渡外下',
   '比短裤多盖小腿，比长裤凉快。',
   '季节窗口短。',
   '温天外出、不想穿长裤时。', 10),

  -- pants_long
  ('pants_long', '薄长裤 · 标准', '日常外下',
   '防护与外观平衡。',
   '热天可能偏捂。',
   '春秋日常、幼儿园等。', 10),
  ('pants_long', '厚长裤 / 摇粒', '凉冷外下',
   '单层即可明显加暖。',
   '室内暖气房偏热。',
   '冷天户外、可与薄秋裤二选一或叠穿。', 20),

  -- socks
  ('socks', '短筒薄棉袜', '热天护脚',
   '透气、穿脱快。',
   '护踝少，凉时不够。',
   '热天室内外短时。', 10),
  ('socks', '中筒棉袜', '日常默认',
   '覆盖适中，不易下滑。',
   '极热天略闷。',
   '绝大多数温凉日常。', 20),
  ('socks', '长筒 / 厚袜', '护小腿加暖',
   '明显减少小腿灌风。',
   '过热时难只调袜子。',
   '凉冷天、穿短裤或包屁衣时。', 30),

  -- shoes
  ('shoes_sandal', '凉鞋', '透气散热',
   '脚汗少、穿脱快。',
   '防护弱，不适合寒凉与粗糙地面。',
   '热天户外短时。', 10),
  ('shoes_sneaker', '运动鞋', '学步友好',
   '抓地与包裹均衡。',
   '闷热天脚汗多。',
   '日常户外、学步与幼儿园。', 10),
  ('shoes_leather', '皮鞋/步前鞋', '略更防风',
   '比网面鞋更挡凉。',
   '透气差；硬度因款而异。',
   '凉天正式一点的场合。', 10),
  ('shoes_boot', '短靴', '护踝加暖',
   '覆盖更多，抗凉。',
   '穿脱慢；热天不适用。',
   '冷天户外。', 10),

  -- accessory
  ('hat', '薄棉帽', '遮阳/轻护头',
   '轻便，热天也戴得住。',
   '几乎不抗寒风。',
   '晒天出门或微风天。', 10),
  ('hat', '摇粒/厚帽', '护头耳',
   '头部散热少，体感明显更暖。',
   '室内戴易过热。',
   '冷天户外。', 20),
  ('scarf', '薄围巾/脖围', '护脖颈',
   '减少领口灌风。',
   '要注意缠绕安全，看护下使用。',
   '凉风天短时户外。', 10),
  ('gloves', '薄手套', '护手防凉',
   '手背少受风。',
   '小月龄易扯掉；影响抓握。',
   '冷天推车或短时户外。', 10)
) as v(category_code, title, subtitle, pros, cons, usage_tips, sort_order)
join public.categories c on c.code = v.category_code;
