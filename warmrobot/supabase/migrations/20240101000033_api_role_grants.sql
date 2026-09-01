-- Supabase API roles need table-level GRANTs (RLS alone is not enough).
-- Local `supabase db reset` was missing SELECT/INSERT/UPDATE/DELETE on core tables.

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all privileges on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant all privileges on all sequences in schema public to postgres, service_role;
grant usage, select on all sequences in schema public to authenticated, anon;

grant execute on all functions in schema public to postgres, service_role, authenticated, anon;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges for role postgres in schema public
  grant select on tables to anon;

alter default privileges for role postgres in schema public
  grant all on sequences to postgres, service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, anon;

alter default privileges for role postgres in schema public
  grant execute on functions to postgres, service_role, authenticated, anon;
