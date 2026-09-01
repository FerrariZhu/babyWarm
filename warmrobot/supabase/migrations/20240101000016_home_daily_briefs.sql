-- Home daily brief snapshots (baby_id + recommended_date, overwrite on refresh)
create table if not exists public.home_daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  recommended_date date not null,
  brief jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (baby_id, recommended_date)
);

create index if not exists home_daily_briefs_user_date_idx
  on public.home_daily_briefs (user_id, recommended_date desc);

alter table public.home_daily_briefs enable row level security;

create policy "Users manage own home daily briefs"
  on public.home_daily_briefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
