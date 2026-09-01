-- TodoTwo Phase 0 — bootstrap
--
-- Creates the dedicated `todotwo` schema and its grants. Everything TodoTwo
-- owns lives here, never in `public`, so the storefront's tables (orders, Vipps
-- payments, eggs, milk, BNIMSP) are unreachable from a TodoTwo client bound to
-- this schema.
--
-- After applying, `todotwo` must be added to
-- Supabase > Settings > API > Exposed schemas, or PostgREST will not serve it.
-- See docs/todotwo/SETUP.md.

create schema if not exists todotwo;

comment on schema todotwo is
  'TodoTwo: farm and Workawayer management. Isolated from public by design; see docs/todotwo/ARCHITECTURE.md.';

grant usage on schema todotwo to authenticated, anon, service_role;

-- Table privileges are granted explicitly per table in later migrations.
-- "Automatically expose new tables" is disabled on this project, so nothing
-- reaches the API without a deliberate grant.
alter default privileges in schema todotwo
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema todotwo
  grant all on tables to service_role;

alter default privileges in schema todotwo
  grant usage, select on sequences to authenticated, service_role;

-- Shared helper: keep updated_at honest without trusting the caller.
create or replace function todotwo.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ROLLBACK:
--   drop function if exists todotwo.touch_updated_at();
--   drop schema if exists todotwo cascade;
