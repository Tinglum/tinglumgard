-- TodoTwo — a daily routine cannot be moved to tomorrow
--
-- Tomorrow already has its own. Pushing today's Liam evening to tomorrow does
-- not postpone it: it creates a second Liam evening on a day that has one,
-- and leaves today with none. That is what happened on 26 September — the
-- job was moved from the up-for-grabs list, the dog's evening care vanished
-- from today, and tomorrow grew a duplicate the round then handed to somebody
-- who was also cooking.
--
-- Weekly and one-off work can still be moved: "bake bread tomorrow instead"
-- means something. For a daily routine the honest options are to do it or to
-- hand it to somebody, and both already exist.

create or replace function todotwo.defer_task(p_task_id uuid, p_new_date date)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_task   todotwo.tasks;
  v_holder uuid;
  v_rrule  text;
begin
  if v_person is null then
    raise exception 'You need to be signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into v_task from todotwo.tasks where id = p_task_id and deleted_at is null;

  if v_task.id is null then
    raise exception 'No such task' using errcode = 'no_data_found';
  end if;

  if v_task.status in ('completed', 'verified', 'cancelled') then
    raise exception 'That one is already finished' using errcode = 'check_violation';
  end if;

  if v_task.series_id is not null then
    select rrule into v_rrule from todotwo.task_series where id = v_task.series_id;
    if v_rrule ilike '%FREQ=DAILY%' then
      raise exception 'A daily routine cannot move to another day — that day already has its own'
        using errcode = 'check_violation';
    end if;
  end if;

  select person_id into v_holder
    from todotwo.task_assignments
   where task_id = p_task_id and unassigned_at is null and role = 'assignee'
   limit 1;

  -- Yours, or nobody's. Staff may move anything, as everywhere else.
  if v_holder is not null and v_holder <> v_person and not todotwo.is_staff() then
    raise exception 'Somebody has taken that one on — ask them to move it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_task.due_date is not null and p_new_date <= v_task.due_date then
    raise exception 'A task can only be pushed forwards' using errcode = 'check_violation';
  end if;

  update todotwo.tasks
     set due_date = p_new_date,
         due_at = null
   where id = p_task_id;
end;
$$;

comment on function todotwo.defer_task(uuid, date) is
  'Pushes a task to a later day. Never a daily routine (the day already has its own). The task must be unclaimed, or yours, or you must be staff.';

revoke all on function todotwo.defer_task(uuid, date) from public, anon;
grant execute on function todotwo.defer_task(uuid, date) to authenticated;

-- ROLLBACK:
--   (defer_task reverts to the definition in
--    20260919090000_todotwo_overdue_prompt.sql — re-run that file's function)
