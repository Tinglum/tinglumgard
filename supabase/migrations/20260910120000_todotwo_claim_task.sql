-- TodoTwo — letting someone take a task nobody is on
--
-- The Today screen shows an "Up for grabs" section: everything due today that
-- nobody has claimed. Until now that section could only be read. There was no
-- path for a Workawayer to put their own name on one:
--
--   * assign_task() is staff-only ("Only staff may assign work")
--   * accept_task() requires you to already BE the assignee — it stamps
--     accepted_at on an existing row and never creates one
--   * task_assignments has no self-insert RLS policy, deliberately
--
-- So the honest options were a button that throws for exactly the people it
-- is for, or this. Claiming free work is not the same act as assigning work
-- to someone else, so it gets its own narrow function rather than a loosening
-- of assign_task.
--
-- What keeps it safe:
--   * it can only ever write the caller's OWN name (v_person, never a
--     parameter), so it cannot be used to hand work to somebody else
--   * it refuses a task that already has an active assignee, so it cannot be
--     used to take work off a colleague
--   * it refuses finished work
--
-- Concurrency: two people tapping "I'll take it" in the same second must not
-- both end up assigned. The existing partial unique index on
-- (task_id, person_id, role) only stops the same person twice — two different
-- people would both insert happily. So the task row is locked first and the
-- emptiness check happens behind that lock.

create or replace function todotwo.claim_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_status todotwo.task_status;
begin
  if v_person is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  -- Serialises concurrent claims on the same task.
  select status into v_status
    from todotwo.tasks
   where id = p_task_id
     and deleted_at is null
     for update;

  if v_status is null then
    raise exception 'No such task' using errcode = 'no_data_found';
  end if;

  if v_status in ('completed', 'verified', 'cancelled') then
    raise exception 'That task is already finished' using errcode = 'check_violation';
  end if;

  -- Keyed on the assignment row rather than tasks.status, because the row is
  -- the truth about who holds a task and it is what the Up-for-grabs list is
  -- built from. Keying on status would refuse a task that drifted to
  -- 'assigned' with nobody actually on it — visible as free, impossible to
  -- take.
  if exists (
    select 1
      from todotwo.task_assignments
     where task_id = p_task_id
       and unassigned_at is null
       and role = 'assignee'
  ) then
    raise exception 'Someone already has that task' using errcode = 'check_violation';
  end if;

  insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id, role)
  values (p_task_id, v_person, v_person, 'assignee');

  update todotwo.tasks
     set status = 'assigned'
   where id = p_task_id
     and status in ('unassigned', 'draft');
end;
$$;

comment on function todotwo.claim_task(uuid) is
  'Puts the caller''s own name on a task nobody is currently assigned to. Cannot assign anyone else, cannot take a task off a colleague, cannot claim finished work. Locks the task row so simultaneous claims serialise.';

revoke all on function todotwo.claim_task(uuid) from public, anon;
grant execute on function todotwo.claim_task(uuid) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.claim_task(uuid);
