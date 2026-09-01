-- Dressing records: one saved checklist per baby per local calendar day
create table if not exists public.dressing_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  baby_name text not null default '',
  recorded_date date not null,
  saved_at timestamptz not null default now(),
  required_warmth integer not null,
  reason text,
  location_label text,
  weather jsonb,
  outfit jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (baby_id, recorded_date),
  constraint dressing_records_outfit_object check (jsonb_typeof(outfit) = 'object')
);

comment on table public.dressing_records is '用户保存的当日穿衣记录（同宝宝同日覆盖）';

create index if not exists dressing_records_user_date_idx
  on public.dressing_records (user_id, recorded_date desc);

drop trigger if exists dressing_records_updated_at on public.dressing_records;
create trigger dressing_records_updated_at
  before update on public.dressing_records
  for each row execute function public.set_updated_at();

alter table public.dressing_records enable row level security;

drop policy if exists "Users manage own dressing records" on public.dressing_records;
create policy "Users manage own dressing records"
  on public.dressing_records
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
