-- TodoTwo — anyone signed in may report a task, assigned to themselves
--
-- THE GAP
--
-- Until now every task in the system arrived by series generation, by
-- todotwo.clone_task, or through one of two staff-only entry points:
-- todotwo.apply_task_template (20260908095200) and todotwo.create_task
-- (20260909083000). Both were deliberately staff-gated, and create_task's own
-- header says why, and says what to do next:
--
--   "A lesser-privileged 'quick add a task assigned only to yourself' variant
--    was considered but rejected for this pass ... Revisit as its own decision
--    if self-assigned quick-add turns out to be wanted."
--
-- This migration is that decision, taken on its own rather than as a side
-- effect of a quick-add feature. The gap is now the sharp end of the product:
-- a Workawayer who finds a broken fence, a sick animal or an empty feed bin
-- has no way at all to record it. That is exactly the moment the farm most
-- wants it recorded, and the current answer is "tell someone with a
-- coordinator role, and hope". A board that cannot capture what a person
-- standing in the field just saw is not a record of the farm.
--
-- AUTHORIZATION DECISION
--
-- Any signed-in person (todotwo.current_person_id() is not null) may create a
-- task through todotwo.report_task. The blast radius is deliberately smaller
-- than create_task's in three specific ways, each aimed at one of the worries
-- the earlier agent actually named:
--
--   1. It lands ASSIGNED TO THE CALLER, always. p_assignee_person_id does not
--      exist on this function; there is no parameter through which a caller
--      could name anybody else. Deciding who does what stays staff-only via
--      todotwo.assign_task, exactly as before. Self-assignment is also the
--      honest default for the reporting case: the person who saw the broken
--      fence is the person who currently owns knowing about it. Staff can
--      reassign it away with the existing tools the moment they triage.
--
--      (The alternative — dropping it unassigned into today's pool — was
--      considered and rejected. An unassigned task is a claim on somebody
--      else's day: it appears in the shared pool, and the pool is precisely
--      the shared surface the earlier agent did not want any Workawayer able
--      to inject into unilaterally. Self-assignment keeps the report visible
--      on the board without silently making it someone else's problem.)
--
--   2. It cannot file into a shared project or section. p_project_id and
--      p_section_id do not exist on this function either, and the insert
--      forces both null. The earlier note's remaining objection to a
--      self-assigned variant was that it "would still let any Workawayer
--      inject arbitrary, unreviewed tasks into shared projects/sections
--      farm-wide (only the assignee would be constrained)". Removing the
--      parameters removes that objection rather than arguing with it.
--
--   3. It records provenance. created_by_person_id is stamped with the
--      caller, so a triaging coordinator can always see that a row was
--      reported from the floor rather than planned.
--
-- What is left is genuinely narrow: a signed-in person may add, to their own
-- plate, a titled note-to-the-farm with an optional description and due date.
-- That is the smallest thing that closes the gap, and nothing wider.
--
-- NOT DUPLICATING create_task
--
-- Rather than a second copy of the insert, the row-building logic is lifted
-- into one internal helper, todotwo.insert_task_row, which performs NO
-- authorization of its own and is revoked from every role including
-- authenticated — it is reachable only from inside a security-definer
-- function that has already decided the caller may proceed. create_task is
-- then re-created (body reproduced faithfully from 20260909083000, its
-- is_staff() gate and behaviour unchanged) to delegate to it, so the two
-- entry points can never drift apart on how a task row is shaped.

-- ---------------------------------------------------------------------------
-- Internal: build the row. No auth check — callers must have done it.
-- ---------------------------------------------------------------------------

create or replace function todotwo.insert_task_row(
  p_title               text,
  p_description         text,
  p_project_id          uuid,
  p_section_id          uuid,
  p_due_date            date,
  p_assignee_person_id  uuid,
  p_created_by_person_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_new_id uuid;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'A title is required';
  end if;

  insert into todotwo.tasks (
    project_id, section_id, title, description, status, due_date,
    created_by_person_id
  )
  values (
    p_project_id, p_section_id, trim(p_title), p_description,
    (case when p_assignee_person_id is not null then 'assigned' else 'unassigned' end)::todotwo.task_status,
    p_due_date,
    p_created_by_person_id
  )
  returning id into v_new_id;

  if p_assignee_person_id is not null then
    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    values (v_new_id, p_assignee_person_id, p_created_by_person_id);
  end if;

  return v_new_id;
end;
$$;

-- Not callable by anyone directly, including authenticated. It trusts its
-- arguments completely, so exposing it would be a privilege-escalation hole:
-- it is a private implementation detail of the two gated functions below.
revoke all on function todotwo.insert_task_row(text, text, uuid, uuid, date, uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_task — unchanged behaviour and unchanged staff gate, now delegating.
-- ---------------------------------------------------------------------------

create or replace function todotwo.create_task(
  p_title               text,
  p_description         text default null,
  p_project_id          uuid default null,
  p_section_id          uuid default null,
  p_due_date            date default null,
  p_assignee_person_id  uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
begin
  if not todotwo.is_staff() then
    raise exception 'Not allowed to create a task' using errcode = 'insufficient_privilege';
  end if;

  return todotwo.insert_task_row(
    p_title, p_description, p_project_id, p_section_id, p_due_date,
    p_assignee_person_id, todotwo.current_person_id()
  );
end;
$$;

revoke all on function todotwo.create_task(text, text, uuid, uuid, date, uuid) from public, anon;
grant execute on function todotwo.create_task(text, text, uuid, uuid, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- report_task — the new, narrow, everyone-signed-in path.
-- ---------------------------------------------------------------------------

create or replace function todotwo.report_task(
  p_title       text,
  p_description text default null,
  p_due_date    date default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
begin
  -- The whole authorization check. current_person_id() resolves auth.uid() to
  -- a live, non-deleted person row, so this is "a real signed-in member of the
  -- farm" and not merely "holds a JWT".
  if v_person is null then
    raise exception 'You need to be signed in to report a task'
      using errcode = 'insufficient_privilege';
  end if;

  -- Assignee is the caller, full stop; project and section are forced null.
  -- Neither is a parameter, so neither can be influenced from outside.
  return todotwo.insert_task_row(
    p_title, p_description, null, null, p_due_date, v_person, v_person
  );
end;
$$;

comment on function todotwo.report_task(text, text, date) is
  'Any signed-in person may create a task on their own plate. Cannot assign to others (see assign_task) and cannot file into a project or section.';

revoke all on function todotwo.report_task(text, text, date) from public, anon;
grant execute on function todotwo.report_task(text, text, date) to authenticated;

-- ROLLBACK:
--   revoke all on function todotwo.report_task(text, text, date) from authenticated;
--   drop function if exists todotwo.report_task(text, text, date);
--   -- Restores the self-contained create_task body from
--   -- 20260909083000_todotwo_quick_add.sql.
--   create or replace function todotwo.create_task(
--     p_title               text,
--     p_description         text default null,
--     p_project_id          uuid default null,
--     p_section_id          uuid default null,
--     p_due_date            date default null,
--     p_assignee_person_id  uuid default null
--   )
--   returns uuid
--   language plpgsql
--   security definer
--   set search_path = todotwo, public, pg_temp
--   as $$
--   declare
--     v_new_id uuid;
--   begin
--     if not todotwo.is_staff() then
--       raise exception 'Not allowed to create a task' using errcode = 'insufficient_privilege';
--     end if;
--     if p_title is null or length(trim(p_title)) = 0 then
--       raise exception 'A title is required';
--     end if;
--     insert into todotwo.tasks (
--       project_id, section_id, title, description, status, due_date
--     )
--     values (
--       p_project_id, p_section_id, trim(p_title), p_description,
--       (case when p_assignee_person_id is not null then 'assigned' else 'unassigned' end)::todotwo.task_status,
--       p_due_date
--     )
--     returning id into v_new_id;
--     if p_assignee_person_id is not null then
--       insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
--       values (v_new_id, p_assignee_person_id, todotwo.current_person_id());
--     end if;
--     return v_new_id;
--   end;
--   $$;
--   revoke all on function todotwo.create_task(text, text, uuid, uuid, date, uuid) from public, anon;
--   grant execute on function todotwo.create_task(text, text, uuid, uuid, date, uuid) to authenticated;
--   drop function if exists todotwo.insert_task_row(text, text, uuid, uuid, date, uuid, uuid);
