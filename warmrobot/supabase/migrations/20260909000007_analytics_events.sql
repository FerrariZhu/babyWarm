-- Product analytics: page/module exposure and module click events.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view', 'module_impression', 'module_click')),
  page_path text not null check (page_path ~ '^/[a-z0-9_/-]*$'),
  module_name text check (module_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  action_name text check (action_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint analytics_events_shape check (
    (event_type = 'page_view' and module_name is null and action_name is null)
    or (event_type in ('module_impression', 'module_click') and module_name is not null and action_name is not null)
  )
);

comment on table public.analytics_events is 'C 端页面与模块埋点；UV 使用 visitor_id 去重，不记录定位、设备指纹或表单内容。';

create index if not exists analytics_events_event_date_idx
  on public.analytics_events (occurred_at desc, event_type, page_path, module_name, action_name);
create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id, occurred_at desc);

alter table public.analytics_events enable row level security;
create policy "analytics_events_insert"
  on public.analytics_events for insert
  with check (user_id is null or user_id = (select auth.uid()));

-- Query this view from the service-role-backed admin application for daily UV.
create or replace view public.analytics_daily_uv as
select
  occurred_at::date as event_date,
  event_type,
  page_path,
  module_name,
  action_name,
  count(distinct visitor_id) as uv
from public.analytics_events
group by 1, 2, 3, 4, 5;
