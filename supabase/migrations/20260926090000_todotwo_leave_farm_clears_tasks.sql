-- TodoTwo — taking someone off the farm gives their upcoming work back
--
-- Two UI paths flip people.is_active: the "On the farm right now" checkbox on
-- the edit form and the Disable button. Both were a bare update, so a person
-- switched off kept every future assignment. Today's "Up for grabs" never saw
-- those tasks, and tomorrow's milking stayed on somebody who was not there.
--
-- This puts the flip and its consequences behind one function, so neither UI
-- path can do half of it. It is the same release that remove_person_from_farm
-- does, minus deleted_at, with two corrections:
--
--   * "today" is the farm's today (Europe/Oslo), not the database's UTC date,
--     so switching someone off at 00:30 local time does not skip a day.
--   * a task only goes back to 'unassigned' when nobody else still holds it;
--     a shared job with a second assignee is still somebody's job.
--
-- Turning someone back ON only flips the flag. Deliberately no reassignment:
-- the nightly round decides who gets what, and doing it here would give two
-- places that each think they own that decision.

create or replace function todotwo.set_person_on_farm(p_person_id uuid, p_on_farm boolean)
returns integer
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_today    date := (now() at time zone 'Europe/Oslo')::date;
  v_released integer := 0;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may change who is on the farm'
      using errcode = 'insufficient_privilege';
  end if;

  if p_on_farm is null then
    raise exception 'p_on_farm must be true or false' using errcode = 'invalid_parameter_value';
  end if;

  -- Flag FIRST, as in remove_person_from_farm: the assignment-change trigger
  -- only queues "no longer yours" notices for active people, so someone who
  -- has left is not sent a pile of them.
  update todotwo.people
     set is_active = p_on_farm
   where id = p_person_id
     and deleted_at is null;

  if not found then
    raise exception 'No such person' using errcode = 'no_data_found';
  end if;

  if p_on_farm then
    return 0;
  end if;

  -- Upcoming, unfinished work only. Today counts: a job due this evening still
  -- needs doing. The past and anything finished is a record, left as it was.
  with released as (
    update todotwo.task_assignments a
       set unassigned_at = now()
      from todotwo.tasks t
     where a.task_id = t.id
       and a.person_id = p_person_id
       and a.unassigned_at is null
       and t.deleted_at is null
       and t.due_date >= v_today
       and t.status not in ('completed', 'verified', 'cancelled')
    returning a.task_id
  ), reopened as (
    update todotwo.tasks t
       set status = 'unassigned'
     where t.id in (select task_id from released)
       and t.status in ('assigned', 'accepted', 'in_progress', 'blocked')
       -- A CTE's update is not visible to its siblings, so the released rows
       -- still look live here; exclude this person explicitly.
       and not exists (
         select 1 from todotwo.task_assignments o
          where o.task_id = t.id
            and o.unassigned_at is null
            and o.person_id <> p_person_id
       )
    returning t.id
  )
  select count(distinct task_id) into v_released from released;

  return v_released;
end;
$$;

comment on function todotwo.set_person_on_farm(uuid, boolean) is
  'Sets people.is_active. Turning someone off releases their upcoming unfinished assignments (farm-local today onward) and reopens tasks nobody else holds. Returns tasks released. Staff only.';

-- is_staff() inside is the boundary; the grant only decides who gets refused.
revoke all on function todotwo.set_person_on_farm(uuid, boolean) from public, anon;
grant execute on function todotwo.set_person_on_farm(uuid, boolean) to authenticated, service_role;

-- ROLLBACK:
--   drop function if exists todotwo.set_person_on_farm(uuid, boolean);
