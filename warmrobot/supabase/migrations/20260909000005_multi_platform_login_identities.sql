-- One phone number owns one canonical application account.  Multiple verified
-- platform identities may log into that same account, so all existing user_id
-- foreign keys and RLS policies continue to point at a single profiles.id.

create table if not exists public.login_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('wechat', 'xiaohongshu', 'douyin')),
  provider_subject text not null,
  phone_verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

comment on table public.login_identities is
  'Third-party login identities. provider_subject and phone must be obtained from the provider server-side verification result.';

create index if not exists login_identities_user_id_idx
  on public.login_identities (user_id);

alter table public.login_identities enable row level security;

-- These mappings are authentication infrastructure.  They are deliberately not
-- readable or writable from browser sessions; only the service-role callback
-- handlers may access them.

create trigger login_identities_updated_at
  before update on public.login_identities
  for each row execute function public.set_updated_at();

-- Backfill existing WeChat accounts.  The unique provider key makes this safe
-- to run on environments that already contain migrated rows.
insert into public.login_identities (user_id, provider, provider_subject, phone_verified_at)
select id, 'wechat', wechat_openid, now()
from public.profiles
where wechat_openid is not null
  and phone is not null
on conflict (provider, provider_subject) do nothing;
