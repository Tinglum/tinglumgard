-- TodoTwo: inputs for the headcount-based days-off rotation.
--
-- Who is off on a date depends on who else can work it, so every member's
-- Upcoming panel needs the whole farm's availability: farm_start_date (the
-- onboarding ramp) and approved time off. Neither is readable across people
-- under RLS — time_off_requests is own-or-staff, and people_roster
-- deliberately omits farm_start_date. Rather than widening those policies,
-- this returns only what the rotation needs: dates. No kind, no notes, no
-- reason, nothing about pending or declined requests. Stays and assignment
-- rules are already readable by members and are not repeated here.

create or replace function todotwo.rota_days_off_inputs(p_from date, p_to date)
returns table (person_id uuid, farm_start_date date, time_off jsonb)
language sql
stable
security definer
set search_path = todotwo, public
as $$
  select
    p.id,
    p.farm_start_date,
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
-- drop function if exists todotwo.rota_days_off_inputs(date, date);
