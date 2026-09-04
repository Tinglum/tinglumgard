-- TodoTwo — clearing the slate before a re-assign
--
-- The owner's workflow is "wipe who is on what from today, then assign again
-- from scratch". Doing that by hand is one assign_task(task, null) per day per
-- routine, which is both tedious and easy to leave half-done.
--
-- Deliberately narrow: this unassigns, it does not delete. Tasks, routines and
-- history all survive; only the current assignee is removed. The past is left
-- exactly as it was, and so is anything already finished — clearing the name
-- off a completed task would rewrite a record of who actually did the work.

create or replace function todotwo.clear_assignments_from(p_from date default current_date)
returns integer
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task    record;
  v_cleared integer := 0;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may clear assignments' using errcode = 'insufficient_privilege';
  end if;

  for v_task in
    select t.id
    from todotwo.tasks t
    where t.deleted_at is null
      and t.due_date is not null
      and t.due_date >= p_from
      -- Finished work keeps its assignee. Unassigning it would erase the
      -- answer to "who did this?" from the record.
      and t.status not in ('completed', 'verified', 'cancelled')
      and exists (
        select 1 from todotwo.task_assignments a
        where a.task_id = t.id and a.unassigned_at is null
      )
  loop
    -- Exactly what assign_task(id, null) does for one task, so the two paths
    -- cannot drift into two different meanings of "unassigned".
    update todotwo.task_assignments
       set unassigned_at = now()
     where task_id = v_task.id and unassigned_at is null;

    update todotwo.tasks
       set status = 'unassigned'
     where id = v_task.id and status = 'assigned';

    v_cleared := v_cleared + 1;
  end loop;

  return v_cleared;
end;
$$;

-- The is_staff() check inside is the boundary; the grant only decides who may
-- get as far as being refused.
revoke all on function todotwo.clear_assignments_from(date) from public, anon;
grant execute on function todotwo.clear_assignments_from(date) to authenticated;

comment on function todotwo.clear_assignments_from(date) is
  'Unassigns every open task due on or after p_from. Deletes nothing; skips completed, verified and cancelled work. Returns the number of tasks cleared.';

-- ROLLBACK:
--   drop function if exists todotwo.clear_assignments_from(date);
