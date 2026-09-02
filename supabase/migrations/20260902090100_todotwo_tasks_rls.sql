-- TodoTwo Phase 1 — row level security for the task system
--
-- Applied immediately after the tables. Between the two migrations the tables
-- exist with the schema's default `select` grant and no policies, which is a
-- window where any authenticated caller could read every task. Never leave
-- those two migrations separated in time.

alter table todotwo.projects          enable row level security;
alter table todotwo.sections          enable row level security;
alter table todotwo.tasks             enable row level security;
alter table todotwo.labels            enable row level security;
alter table todotwo.task_labels       enable row level security;
alter table todotwo.task_assignments  enable row level security;
alter table todotwo.task_dependencies enable row level security;
alter table todotwo.task_comments     enable row level security;
alter table todotwo.saved_views       enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: is the caller an active assignee of this task?
--
-- security definer so a Workawayer can be judged against the assignment table
-- without being able to read all of it.
-- ---------------------------------------------------------------------------

create or replace function todotwo.is_task_assignee(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select exists (
    select 1
    from todotwo.task_assignments ta
    where ta.task_id = p_task_id
      and ta.person_id = todotwo.current_person_id()
      and ta.unassigned_at is null
  );
$$;

revoke all on function todotwo.is_task_assignee(uuid) from public, anon;
grant execute on function todotwo.is_task_assignee(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- projects and sections — staff manage, everyone signed in can see the board
-- ---------------------------------------------------------------------------

create policy projects_admin_all on todotwo.projects
  for all to authenticated
  using (todotwo.is_admin()) with check (todotwo.is_admin());

create policy projects_staff_write on todotwo.projects
  for insert to authenticated
  with check (todotwo.is_staff());

create policy projects_staff_update on todotwo.projects
  for update to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy projects_select on todotwo.projects
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

create policy sections_admin_all on todotwo.sections
  for all to authenticated
  using (todotwo.is_admin()) with check (todotwo.is_admin());

create policy sections_staff_write on todotwo.sections
  for insert to authenticated
  with check (todotwo.is_staff());

create policy sections_staff_update on todotwo.sections
  for update to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy sections_select on todotwo.sections
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

-- ---------------------------------------------------------------------------
-- tasks
--
-- Farm work is not secret: anyone signed in may read the task list, which is
-- how a Workawayer sees what the day holds and who else is on it. What they may
-- not do is change it. Writes are staff-only, and a Workawayer's own progress
-- goes through the security-definer functions below — RLS is row-level and
-- cannot express "may update only these columns".
-- ---------------------------------------------------------------------------

create policy tasks_admin_all on todotwo.tasks
  for all to authenticated
  using (todotwo.is_admin()) with check (todotwo.is_admin());

create policy tasks_staff_insert on todotwo.tasks
  for insert to authenticated
  with check (todotwo.is_staff());

create policy tasks_staff_update on todotwo.tasks
  for update to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy tasks_select on todotwo.tasks
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

-- ---------------------------------------------------------------------------
-- labels — staff curate, everyone reads
-- ---------------------------------------------------------------------------

create policy labels_staff_all on todotwo.labels
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy labels_select on todotwo.labels
  for select to authenticated
  using (todotwo.current_person_id() is not null);

create policy task_labels_staff_all on todotwo.task_labels
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_labels_select on todotwo.task_labels
  for select to authenticated
  using (todotwo.current_person_id() is not null);

-- ---------------------------------------------------------------------------
-- assignments — only staff decide who does what
-- ---------------------------------------------------------------------------

create policy task_assignments_staff_all on todotwo.task_assignments
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_assignments_select on todotwo.task_assignments
  for select to authenticated
  using (todotwo.current_person_id() is not null);

create policy task_dependencies_staff_all on todotwo.task_dependencies
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_dependencies_select on todotwo.task_dependencies
  for select to authenticated
  using (todotwo.current_person_id() is not null);

-- ---------------------------------------------------------------------------
-- comments — anyone signed in may add one and edit their own
-- ---------------------------------------------------------------------------

create policy task_comments_admin_all on todotwo.task_comments
  for all to authenticated
  using (todotwo.is_admin()) with check (todotwo.is_admin());

create policy task_comments_select on todotwo.task_comments
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

create policy task_comments_insert_own on todotwo.task_comments
  for insert to authenticated
  with check (person_id = todotwo.current_person_id());

create policy task_comments_update_own on todotwo.task_comments
  for update to authenticated
  using (person_id = todotwo.current_person_id())
  with check (person_id = todotwo.current_person_id());

-- ---------------------------------------------------------------------------
-- saved views — strictly personal
-- ---------------------------------------------------------------------------

create policy saved_views_own on todotwo.saved_views
  for all to authenticated
  using (person_id = todotwo.current_person_id())
  with check (person_id = todotwo.current_person_id());

-- ---------------------------------------------------------------------------
-- Workawayer progress
--
-- The narrow writes a non-staff member is allowed. Each re-checks the caller's
-- relationship to the row; a security definer function that trusts its
-- arguments is a privilege-escalation hole.
-- ---------------------------------------------------------------------------

create or replace function todotwo.accept_task(p_task_id uuid)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.task_assignments
     set accepted_at = coalesce(accepted_at, now())
   where task_id = p_task_id
     and person_id = todotwo.current_person_id()
     and unassigned_at is null;

  update todotwo.tasks
     set status = 'accepted'
   where id = p_task_id
     and status in ('assigned', 'unassigned')
  returning * into v_task;

  if v_task.id is null then
    select * into v_task from todotwo.tasks where id = p_task_id;
  end if;

  return v_task;
end;
$$;

create or replace function todotwo.start_task(p_task_id uuid)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.tasks
     set status = 'in_progress'
   where id = p_task_id
     and status in ('unassigned', 'assigned', 'accepted', 'blocked', 'not_completed')
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task cannot be started from its current status'
      using errcode = 'check_violation';
  end if;

  return v_task;
end;
$$;

create or replace function todotwo.complete_task(p_task_id uuid, p_actual_minutes integer default null)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.tasks
     set status = 'completed',
         completed_at = now(),
         completed_by_person_id = todotwo.current_person_id(),
         actual_minutes = coalesce(p_actual_minutes, actual_minutes)
   where id = p_task_id
     and status not in ('completed', 'verified', 'cancelled')
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task is already finished' using errcode = 'check_violation';
  end if;

  return v_task;
end;
$$;

-- Undo. The eight-second toast in the UI calls this.
create or replace function todotwo.uncomplete_task(p_task_id uuid)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.tasks
     set status = 'in_progress',
         completed_at = null,
         completed_by_person_id = null
   where id = p_task_id
     and status = 'completed'
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task is not completed' using errcode = 'check_violation';
  end if;

  return v_task;
end;
$$;

revoke all on function todotwo.accept_task(uuid) from public, anon;
revoke all on function todotwo.start_task(uuid) from public, anon;
revoke all on function todotwo.complete_task(uuid, integer) from public, anon;
revoke all on function todotwo.uncomplete_task(uuid) from public, anon;

grant execute on function todotwo.accept_task(uuid) to authenticated;
grant execute on function todotwo.start_task(uuid) to authenticated;
grant execute on function todotwo.complete_task(uuid, integer) to authenticated;
grant execute on function todotwo.uncomplete_task(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants. Since 20260901090000 the schema default is select only, so every
-- table that needs writes says so explicitly.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on todotwo.projects          to authenticated;
grant select, insert, update, delete on todotwo.sections          to authenticated;
grant select, insert, update, delete on todotwo.tasks             to authenticated;
grant select, insert, update, delete on todotwo.labels            to authenticated;
grant select, insert, update, delete on todotwo.task_labels       to authenticated;
grant select, insert, update, delete on todotwo.task_assignments  to authenticated;
grant select, insert, update, delete on todotwo.task_dependencies to authenticated;
grant select, insert, update, delete on todotwo.task_comments     to authenticated;
grant select, insert, update, delete on todotwo.saved_views       to authenticated;

revoke all on todotwo.projects          from anon;
revoke all on todotwo.sections          from anon;
revoke all on todotwo.tasks             from anon;
revoke all on todotwo.labels            from anon;
revoke all on todotwo.task_labels       from anon;
revoke all on todotwo.task_assignments  from anon;
revoke all on todotwo.task_dependencies from anon;
revoke all on todotwo.task_comments     from anon;
revoke all on todotwo.saved_views       from anon;

-- ROLLBACK:
--   drop function if exists todotwo.uncomplete_task(uuid);
--   drop function if exists todotwo.complete_task(uuid, integer);
--   drop function if exists todotwo.start_task(uuid);
--   drop function if exists todotwo.accept_task(uuid);
--   drop function if exists todotwo.is_task_assignee(uuid);
--   -- policies drop with their tables in the Phase 1 rollback.
