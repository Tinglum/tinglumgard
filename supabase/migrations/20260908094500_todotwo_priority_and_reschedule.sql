-- TodoTwo — priority editing + single-occurrence reschedule/skip
--
-- Two small, narrow RPCs. Neither widens the update surface beyond what it
-- names: set_task_priority touches only tasks.priority, and
-- reschedule_occurrence/skip_occurrence only operate on a single generated
-- occurrence of a recurring series, never the series definition itself.
--
-- Design decision — due_date vs occurrence_date:
-- tasks_series_occurrence_unique is a partial unique index on
-- (series_id, occurrence_date) where series_id is not null and deleted_at is
-- null. occurrence_date is the generator's idempotency key: generateOccurrences
-- upserts on (series_id, occurrence_date) with ignoreDuplicates, so it is what
-- answers "did I already materialise this day". If reschedule_occurrence moved
-- occurrence_date, two problems follow: (1) the generator would think the
-- original day was never generated and would happily create a fresh occurrence
-- there on its next run, duplicating the work; and (2) moving it onto a date
-- that already has its own generated occurrence would collide with the unique
-- index. occurrence_date is therefore treated as immutable history — "this is
-- the day the series generated this task for" — and only due_date (the date
-- the work actually shows up on, everywhere the UI reads it) is moved.
--
-- ---------------------------------------------------------------------------
-- set_task_priority — the only writable surface for changing a task's
-- priority from the UI, so an assignee cannot reach for a general update RPC.
-- ---------------------------------------------------------------------------

create or replace function todotwo.set_task_priority(p_task_id uuid, p_priority smallint)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  if p_priority not between 1 and 4 then
    raise exception 'Priority must be between 1 and 4' using errcode = 'check_violation';
  end if;

  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not allowed to change this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.tasks
     set priority = p_priority
   where id = p_task_id
     and deleted_at is null
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;

  return v_task;
end;
$$;

revoke all on function todotwo.set_task_priority(uuid, smallint) from public, anon;
grant execute on function todotwo.set_task_priority(uuid, smallint) to authenticated;

-- ---------------------------------------------------------------------------
-- reschedule_occurrence — move one dated occurrence of a series. Rejects a
-- one-off task (series_id is null) with a message pointing the caller at
-- editing the task directly instead, rather than building a parallel
-- due-date-only update path here.
-- ---------------------------------------------------------------------------

create or replace function todotwo.reschedule_occurrence(p_task_id uuid, p_new_date date)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  select * into v_task from todotwo.tasks where id = p_task_id and deleted_at is null;
  if v_task.id is null then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;

  if v_task.series_id is null then
    raise exception
      'This is not a recurring occurrence — edit the task''s due date directly instead'
      using errcode = 'check_violation';
  end if;

  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not allowed to reschedule this task' using errcode = 'insufficient_privilege';
  end if;

  if v_task.status in ('completed', 'verified', 'cancelled') then
    raise exception 'This occurrence is already finished' using errcode = 'check_violation';
  end if;

  -- occurrence_date is left untouched by design (see the comment at the top of
  -- this migration) — only due_date, the date the work actually appears on,
  -- moves. due_at is cleared rather than shifted onto the new date blind: a
  -- time-of-day carried across an arbitrary date jump is more likely wrong
  -- than right, and tasks_derive_due_date would otherwise silently overwrite
  -- due_date back from a stale due_at.
  update todotwo.tasks
     set due_date = p_new_date,
         due_at = null
   where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

revoke all on function todotwo.reschedule_occurrence(uuid, date) from public, anon;
grant execute on function todotwo.reschedule_occurrence(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- skip_occurrence — cancel a single occurrence. The series is untouched and
-- the generator (keyed on series_id + occurrence_date) is unaffected, so the
-- next occurrence still materialises on schedule. Reuses the existing
-- 'cancelled' status rather than adding a new one.
-- ---------------------------------------------------------------------------

create or replace function todotwo.skip_occurrence(p_task_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
begin
  select * into v_task from todotwo.tasks where id = p_task_id and deleted_at is null;
  if v_task.id is null then
    raise exception 'Task not found' using errcode = 'no_data_found';
  end if;

  if v_task.series_id is null then
    raise exception
      'This is not a recurring occurrence — cancel the task directly instead'
      using errcode = 'check_violation';
  end if;

  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not allowed to skip this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.tasks
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = p_reason
   where id = p_task_id
     and status not in ('completed', 'verified', 'cancelled');

  if not found then
    raise exception 'This occurrence is already finished or skipped' using errcode = 'check_violation';
  end if;
end;
$$;

revoke all on function todotwo.skip_occurrence(uuid, text) from public, anon;
grant execute on function todotwo.skip_occurrence(uuid, text) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.skip_occurrence(uuid, text);
--   drop function if exists todotwo.reschedule_occurrence(uuid, date);
--   drop function if exists todotwo.set_task_priority(uuid, smallint);
