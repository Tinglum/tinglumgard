-- TodoTwo — completing a task also finishes its still-open steps
--
-- Ticking a task off previously left task_step_completions untouched, so a
-- task could show "completed" while its checklist still had unticked rows.
-- "Check off a task and its subtasks once they are done" means: finishing the
-- parent finishes any steps the person did not individually tick already, in
-- one action. Steps already ticked (possibly by someone else, or earlier)
-- keep their original completed_by_person_id/completed_at — this only fills
-- in the gaps, it never overwrites existing completion rows.
--
-- Postgres migrations here are additive/forward-only, so this reproduces the
-- existing complete_task body (20260902090100_todotwo_tasks_rls.sql) plus the
-- new step-completion loop, via create or replace.

create or replace function todotwo.complete_task(p_task_id uuid, p_actual_minutes integer default null)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
  v_person uuid := todotwo.current_person_id();
  v_now timestamptz := now();
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.tasks
     set status = 'completed',
         completed_at = v_now,
         completed_by_person_id = v_person,
         actual_minutes = coalesce(p_actual_minutes, actual_minutes)
   where id = p_task_id
     and status not in ('completed', 'verified', 'cancelled')
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task is already finished' using errcode = 'check_violation';
  end if;

  -- Cascade: mark every step of this occurrence's series that isn't already
  -- ticked as completed too, stamped with the same actor and timestamp as the
  -- task itself. A task with no series (a one-off) has no series_step rows to
  -- join against, so this is a no-op for it.
  insert into todotwo.task_step_completions (task_id, series_step_id, completed_at, completed_by_person_id)
  select v_task.id, s.id, v_now, v_person
  from todotwo.task_series_steps s
  where s.series_id = v_task.series_id
  on conflict (task_id, series_step_id) do nothing;

  return v_task;
end;
$$;

revoke all on function todotwo.complete_task(uuid, integer) from public, anon;
grant execute on function todotwo.complete_task(uuid, integer) to authenticated;

-- ROLLBACK:
--   -- Restores the pre-cascade body from 20260902090100_todotwo_tasks_rls.sql.
--   create or replace function todotwo.complete_task(p_task_id uuid, p_actual_minutes integer default null)
--   returns todotwo.tasks
--   language plpgsql
--   security definer
--   set search_path = todotwo, public, pg_temp
--   as $$
--   declare
--     v_task todotwo.tasks;
--   begin
--     if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
--       raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
--     end if;
--     update todotwo.tasks
--        set status = 'completed',
--            completed_at = now(),
--            completed_by_person_id = todotwo.current_person_id(),
--            actual_minutes = coalesce(p_actual_minutes, actual_minutes)
--      where id = p_task_id
--        and status not in ('completed', 'verified', 'cancelled')
--     returning * into v_task;
--     if v_task.id is null then
--       raise exception 'Task is already finished' using errcode = 'check_violation';
--     end if;
--     return v_task;
--   end;
--   $$;
--   revoke all on function todotwo.complete_task(uuid, integer) from public, anon;
--   grant execute on function todotwo.complete_task(uuid, integer) to authenticated;
