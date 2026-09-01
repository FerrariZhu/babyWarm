-- Ensure every category has a concrete outfit_slot (required for merged admin + advice pools).

update public.categories set outfit_slot = 'base_top' where code in ('footed_romper', 'base_top', 'pajamas') and outfit_slot is null;
update public.categories set outfit_slot = 'bottom' where code = 'pants_padded' and outfit_slot is null;
update public.categories set outfit_slot = 'outer' where code = 'outer_rain_uv' and outfit_slot is null;
update public.categories set outfit_slot = 'accessory' where code in ('sleep_sack') and outfit_slot is null;
-- Any remaining nulls → accessory (safe default; operators can reassign in admin)
update public.categories set outfit_slot = 'accessory' where outfit_slot is null;

alter table public.categories
  alter column outfit_slot set not null;

comment on column public.categories.outfit_slot is '穿搭槽位（必填）：base_top/mid_top/outer/base_bottom/bottom/socks/shoes/accessory';
