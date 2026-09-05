-- TodoTwo — removing someone from the farm without erasing them
--
-- There are three different things people mean by "delete this person", and
-- only one of them was possible:
--
--   disable  — still on the roster, not currently working. is_active = false,
--              already handled by an ordinary update.
--   remove   — they have gone home. They should leave every list and rota AND
--              their upcoming work should go back to the pool, or tomorrow's
--              milking stays assigned to somebody who is on a plane. Their
--              history stays exactly where it is.
--   delete   — a duplicate or a test entry, genuinely erased. Destructive,
--              because most tables referencing a person are ON DELETE
--              CASCADE; handled in the UI with the real numbers shown.
--
-- This adds the middle one, which is the common case and the one that was
-- missing.

create or replace function todotwo.remove_person_from_farm(p_person_id uuid)
returns integer
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_released integer := 0;
begin
  if not todotwo.is_admin() then
    raise exception 'Only an administrator may remove someone from the farm'
      using errcode = 'insufficient_privilege';
  end if;

  -- Marked gone FIRST, deliberately. The assignment-change trigger looks the
  -- person up with `deleted_at is null and is_active` before queueing a
  -- notice, so doing this first means the releases below do not fire a stack
  -- of "no longer yours" messages at somebody who has already left.
  update todotwo.people
     set deleted_at = now(),
         is_active  = false
   where id = p_person_id
     and deleted_at is null;

  -- Upcoming work goes back to the pool so somebody else can pick it up.
  -- Today counts as upcoming: a job due this evening still needs doing.
  with released as (
    update todotwo.task_assignments a
       set unassigned_at = now()
      from todotwo.tasks t
     where a.task_id = t.id
       and a.person_id = p_person_id
       and a.unassigned_at is null
       and t.deleted_at is null
       and t.due_date >= current_date
       and t.status not in ('completed', 'verified', 'cancelled')
    returning a.task_id
  )
  update todotwo.tasks
     set status = 'unassigned'
   where id in (select task_id from released)
     and status = 'assigned';

  get diagnostics v_released = row_count;

  -- Anything they had claimed but not yet done in the past is left alone: it
  -- is a record of what was true, not work anyone can still pick up.
  return v_released;
end;
$$;

comment on function todotwo.remove_person_from_farm(uuid) is
  'Marks someone gone and returns their upcoming work to the unassigned pool, keeping all history. Returns how many tasks were released. Admin only.';

revoke all on function todotwo.remove_person_from_farm(uuid) from public, anon;
grant execute on function todotwo.remove_person_from_farm(uuid) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.remove_person_from_farm(uuid);
