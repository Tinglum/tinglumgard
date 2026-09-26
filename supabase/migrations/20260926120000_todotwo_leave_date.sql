-- TodoTwo — knowing when somebody leaves
--
-- Departures were only ever handled after the fact: somebody left, their name
-- stayed on the next few days of work, and the jobs sat assigned to a person
-- who was on a train. Unticking "on the farm" releases their work, but only
-- once somebody remembers to do it — which is after they have gone.
--
-- A leave date lets the farm say it in advance. From that day on the person is
-- never scheduled: the nightly round treats the day they leave, and every day
-- after it, as a day they are not here. Leaving day itself is included on
-- purpose — nobody does the evening round on the day they catch a bus.
--
-- Setting the date also releases anything already assigned to them from that
-- day forward, so work handed out before anybody knew they were leaving does
-- not quietly stay on their name.

alter table todotwo.people
  add column leave_date date;

comment on column todotwo.people.leave_date is
  'The day this person leaves the farm. They are not scheduled on this day or any day after. Null means no departure is planned.';

-- ---------------------------------------------------------------------------
-- Setting it
-- ---------------------------------------------------------------------------

create or replace function todotwo.set_person_leave_date(p_person_id uuid, p_leave_date date)
returns integer
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_today    date := (now() at time zone 'Europe/Oslo')::date;
  v_from     date;
  v_released integer := 0;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may set a leave date'
      using errcode = 'insufficient_privilege';
  end if;

  update todotwo.people
     set leave_date = p_leave_date
   where id = p_person_id
     and deleted_at is null;

  if not found then
    raise exception 'No such person' using errcode = 'no_data_found';
  end if;

  -- Clearing the date (they are staying after all) releases nothing and
  -- reassigns nothing. The nightly round will pick them up again.
  if p_leave_date is null then
    return 0;
  end if;

  -- From the leave date, or today if the date is already past: a leave date
  -- set in hindsight should not rewrite work that was already done.
  v_from := greatest(p_leave_date, v_today);

  with released as (
    update todotwo.task_assignments a
       set unassigned_at = now()
      from todotwo.tasks t
     where a.task_id = t.id
       and a.person_id = p_person_id
       and a.unassigned_at is null
       and t.deleted_at is null
       and t.due_date >= v_from
       and t.status not in ('completed', 'verified', 'cancelled')
    returning a.task_id
  ), reopened as (
    -- Back to up for grabs, but only if nobody else still holds it.
    update todotwo.tasks t
       set status = 'unassigned'
     where t.id in (select task_id from released)
       and t.status in ('assigned', 'accepted', 'in_progress', 'blocked')
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

comment on function todotwo.set_person_leave_date(uuid, date) is
  'Sets or clears a leave date. Setting one releases every open task due on or after that day (or today, if the date has passed) back to up for grabs. Staff only.';

revoke all on function todotwo.set_person_leave_date(uuid, date) from public, anon;
grant execute on function todotwo.set_person_leave_date(uuid, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Telling the Upcoming panel
-- ---------------------------------------------------------------------------
--
-- The days-off panel works out headcount from this function, separately from
-- the nightly round. If it did not know about leave dates, it would count
-- somebody who has left as available and show a day off that the nightly
-- round, which does know, would never give. Dropped and recreated because the
-- returned columns change, which `create or replace` cannot do.

drop function if exists todotwo.rota_days_off_inputs(date, date);

create function todotwo.rota_days_off_inputs(p_from date, p_to date)
returns table (person_id uuid, farm_start_date date, leave_date date, time_off jsonb)
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select
    p.id,
    p.farm_start_date,
    p.leave_date,
    coalesce((
      select jsonb_agg(jsonb_build_object('start', t.start_date, 'end', t.end_date) order by t.start_date)
      from todotwo.time_off_requests t
      where t.person_id = p.id
        and t.status = 'approved'
        and t.start_date <= p_to
        and t.end_date >= p_from
    ), '[]'::jsonb)
  from todotwo.people p
  where p.deleted_at is null
    and p.is_active
    -- Members only: a signed-in caller with no person row gets nothing.
    and todotwo.current_person_id() is not null
    -- The panel asks for two weeks; refuse to become a bulk export.
    and p_to - p_from <= 31;
$$;

revoke all on function todotwo.rota_days_off_inputs(date, date) from public, anon;
grant execute on function todotwo.rota_days_off_inputs(date, date) to authenticated, service_role;

-- ROLLBACK:
--   drop function if exists todotwo.set_person_leave_date(uuid, date);
--   (rota_days_off_inputs reverts to the definition in
--    20260926100000_todotwo_rota_days_off.sql — drop it and re-run that file's function)
--   alter table todotwo.people drop column if exists leave_date;
