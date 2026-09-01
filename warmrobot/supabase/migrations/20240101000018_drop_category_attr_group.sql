-- Drop redundant attr_group; outfit_slot is the single source of truth.

drop index if exists categories_attr_group_idx;

alter table public.categories
  drop constraint if exists categories_attr_group_check;

alter table public.categories
  drop column if exists attr_group;
