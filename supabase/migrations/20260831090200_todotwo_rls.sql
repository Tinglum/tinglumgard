-- TodoTwo Phase 0 — row level security
--
-- RLS is the access boundary, not a second opinion after a UI check. Every
-- TodoTwo request goes through a session-bound client, so these policies are
-- what actually runs. There is no `using (true)` policy anywhere, and `anon`
-- gets nothing.

-- ---------------------------------------------------------------------------
-- Helpers
--
-- security definer so a caller can resolve their own roles without needing
-- read access to role_assignments first, which would be circular. search_path
-- is pinned; both are marked stable so the planner calls them once per query.
-- ---------------------------------------------------------------------------

create or replace function todotwo.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select p.id
  from todotwo.people p
  where p.auth_user_id = auth.uid()
    and p.deleted_at is null
  limit 1;
$$;

create or replace function todotwo.has_role(wanted todotwo.role_name)
returns boolean
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select exists (
    select 1
    from todotwo.role_assignments ra
    join todotwo.people p on p.id = ra.person_id
    where p.auth_user_id = auth.uid()
      and p.deleted_at is null
      and ra.role = wanted
      and ra.revoked_at is null
  );
$$;

create or replace function todotwo.is_admin()
returns boolean
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select todotwo.has_role('super_admin') or todotwo.has_role('farm_admin');
$$;

create or replace function todotwo.is_staff()
returns boolean
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select todotwo.is_admin() or todotwo.has_role('coordinator');
$$;

revoke all on function todotwo.current_person_id() from public, anon;
revoke all on function todotwo.has_role(todotwo.role_name) from public, anon;
revoke all on function todotwo.is_admin() from public, anon;
revoke all on function todotwo.is_staff() from public, anon;

grant execute on function todotwo.current_person_id() to authenticated;
grant execute on function todotwo.has_role(todotwo.role_name) to authenticated;
grant execute on function todotwo.is_admin() to authenticated;
grant execute on function todotwo.is_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Force it so even a table owner is subject to policy.
-- ---------------------------------------------------------------------------

alter table todotwo.people             enable row level security;
alter table todotwo.people_private     enable row level security;
alter table todotwo.role_assignments   enable row level security;
alter table todotwo.locations          enable row level security;
alter table todotwo.settings           enable row level security;
alter table todotwo.audit_log          enable row level security;

-- ---------------------------------------------------------------------------
-- people
--
-- Note on columns: `people` deliberately holds nothing a coordinator may not
-- see. Emergency contacts and private notes live in people_private, which no
-- non-admin role can touch at all. That is why a coordinator's row policy can
-- be simple rather than a column-filtered view.
-- ---------------------------------------------------------------------------

create policy people_admin_all on todotwo.people
  for all to authenticated
  using (todotwo.is_admin())
  with check (todotwo.is_admin());

create policy people_select_self on todotwo.people
  for select to authenticated
  using (auth_user_id = auth.uid() and deleted_at is null);

create policy people_coordinator_select on todotwo.people
  for select to authenticated
  using (todotwo.has_role('coordinator') and deleted_at is null and is_active);

-- ---------------------------------------------------------------------------
-- people_private — admins only, all verbs. No other role gets a policy.
-- ---------------------------------------------------------------------------

create policy people_private_admin_all on todotwo.people_private
  for all to authenticated
  using (todotwo.is_admin())
  with check (todotwo.is_admin());

-- ---------------------------------------------------------------------------
-- role_assignments — admins manage; a person may read their own.
-- ---------------------------------------------------------------------------

create policy role_assignments_admin_all on todotwo.role_assignments
  for all to authenticated
  using (todotwo.is_admin())
  with check (todotwo.is_admin());

create policy role_assignments_select_self on todotwo.role_assignments
  for select to authenticated
  using (person_id = todotwo.current_person_id());

-- ---------------------------------------------------------------------------
-- locations — admins manage; anyone signed in may read the farm.
-- ---------------------------------------------------------------------------

create policy locations_admin_all on todotwo.locations
  for all to authenticated
  using (todotwo.is_admin())
  with check (todotwo.is_admin());

create policy locations_select_authenticated on todotwo.locations
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

-- ---------------------------------------------------------------------------
-- settings — admins only.
-- ---------------------------------------------------------------------------

create policy settings_admin_all on todotwo.settings
  for all to authenticated
  using (todotwo.is_admin())
  with check (todotwo.is_admin());

-- ---------------------------------------------------------------------------
-- audit_log — admins read. Nobody updates or deletes, ever.
--
-- Inserts arrive only through todotwo.audit_trigger(), which is security
-- definer and therefore not subject to these policies. There is deliberately
-- no insert, update or delete policy: the log is append-only from the
-- application's point of view.
-- ---------------------------------------------------------------------------

create policy audit_log_admin_select on todotwo.audit_log
  for select to authenticated
  using (todotwo.is_admin());

-- ---------------------------------------------------------------------------
-- Explicit grants. "Automatically expose new tables" is off on this project,
-- so nothing is reachable through PostgREST without the lines below.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on todotwo.people           to authenticated;
grant select, insert, update, delete on todotwo.people_private   to authenticated;
grant select, insert, update, delete on todotwo.role_assignments to authenticated;
grant select, insert, update, delete on todotwo.locations        to authenticated;
grant select, insert, update, delete on todotwo.settings         to authenticated;
grant select                          on todotwo.audit_log       to authenticated;

-- anon gets nothing in Phase 0. Applicant token access arrives in Phase 10 and
-- will be granted explicitly and narrowly then.
revoke all on todotwo.people           from anon;
revoke all on todotwo.people_private   from anon;
revoke all on todotwo.role_assignments from anon;
revoke all on todotwo.locations        from anon;
revoke all on todotwo.settings         from anon;
revoke all on todotwo.audit_log        from anon;

-- ROLLBACK:
--   drop policy if exists audit_log_admin_select on todotwo.audit_log;
--   drop policy if exists settings_admin_all on todotwo.settings;
--   drop policy if exists locations_select_authenticated on todotwo.locations;
--   drop policy if exists locations_admin_all on todotwo.locations;
--   drop policy if exists role_assignments_select_self on todotwo.role_assignments;
--   drop policy if exists role_assignments_admin_all on todotwo.role_assignments;
--   drop policy if exists people_private_admin_all on todotwo.people_private;
--   drop policy if exists people_coordinator_select on todotwo.people;
--   drop policy if exists people_select_self on todotwo.people;
--   drop policy if exists people_admin_all on todotwo.people;
--   drop function if exists todotwo.is_staff();
--   drop function if exists todotwo.is_admin();
--   drop function if exists todotwo.has_role(todotwo.role_name);
--   drop function if exists todotwo.current_person_id();
