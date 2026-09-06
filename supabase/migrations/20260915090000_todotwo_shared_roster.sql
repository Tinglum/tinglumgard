-- TodoTwo — everyone can see who is doing what
--
-- The Today screen grew an "everyone today" section, and for an admin it
-- worked. For a Workawayer it showed one row: their own. The screen was fine;
-- the data was not reaching them. Under RLS a Workawayer could read every task
-- but only their own `people` row and only their own `task_assignments`, so
-- every other task came back with no assignee attached and was dropped.
--
-- That is the wrong default for a household. People who live and work together
-- need to know who has the goats this morning without asking, and the same gap
-- was quietly blanking the assignee avatars on Upcoming and on task detail.
--
-- Two changes, deliberately narrow.
--
-- 1. A roster view rather than opening up `people`. That table carries email
--    and phone, which is more than "who is doing the goats" needs, and more
--    than anybody asked to publish. The view exposes exactly the four columns
--    the assignee display already reads. The genuinely sensitive material
--    (emergency contacts, private notes) lives in people_private and is not
--    touched here.
--
-- 2. A select policy on task_assignments for signed-in members. Who holds
--    which job is the shared fact this whole feature is about; there is no
--    version of it that works while the rows are private.
--
-- `authenticated` is exactly the set of TodoTwo members: the storefront has no
-- Supabase Auth, so no other kind of signed-in user exists in this project.

-- ---------------------------------------------------------------------------
-- The roster
-- ---------------------------------------------------------------------------

create view todotwo.people_roster as
  select
    id,
    full_name,
    preferred_name,
    photo_url,
    is_active
  from todotwo.people
  where deleted_at is null;

-- Runs as the owner, so it is not re-filtered by the policies on `people`.
-- That is the entire point: the view is the controlled hole in those policies,
-- and it is narrow because the column list is narrow.
alter view todotwo.people_roster set (security_invoker = off);

revoke all on todotwo.people_roster from public, anon;
grant select on todotwo.people_roster to authenticated, service_role;

comment on view todotwo.people_roster is
  'Name and face only, for showing who is assigned to what. Readable by every signed-in member. Contact details stay in people, behind its own policies.';

-- ---------------------------------------------------------------------------
-- Who holds what
-- ---------------------------------------------------------------------------

-- Permissive, so it ORs with the existing policies rather than narrowing them.
-- current_person_id() is null for service_role and for an auth user with no
-- person row, so neither is widened by this.
create policy task_assignments_select_members on todotwo.task_assignments
  for select to authenticated
  using (todotwo.current_person_id() is not null);

comment on policy task_assignments_select_members on todotwo.task_assignments is
  'Everybody on the farm can see who is assigned to what. Writing an assignment is still staff-only.';

-- ROLLBACK:
--   drop policy if exists task_assignments_select_members on todotwo.task_assignments;
--   drop view if exists todotwo.people_roster;
