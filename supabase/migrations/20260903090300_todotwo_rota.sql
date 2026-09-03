-- TodoTwo — assigning a person to each day of a routine
--
-- The whole reason the series model exists: one text, many days, a different
-- person each day. This adds the rota — an ordered list of people attached to a
-- series — and the function that walks it across occurrences.
--
-- Rotation is by position, not by date arithmetic. Walking the occurrences in
-- date order and stepping through the rota means a skipped day, an added
-- weekday, or a changed rota does not silently shift who is on breakfast for
-- the rest of the year.

create table todotwo.series_rota (
  id         uuid primary key default gen_random_uuid(),
  series_id  uuid not null references todotwo.task_series (id) on delete cascade,
  person_id  uuid not null references todotwo.people (id) on delete cascade,
  position   integer not null,
  created_at timestamptz not null default now(),
  unique (series_id, person_id),
  unique (series_id, position) deferrable initially deferred
);

create index series_rota_series_idx on todotwo.series_rota (series_id, position);

alter table todotwo.series_rota enable row level security;

create policy series_rota_staff_all on todotwo.series_rota
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy series_rota_select on todotwo.series_rota
  for select to authenticated
  using (todotwo.current_person_id() is not null);

grant select, insert, update, delete on todotwo.series_rota to authenticated;
revoke all on todotwo.series_rota from anon;

-- ---------------------------------------------------------------------------
-- Applying a rota
--
-- Assigns people to a series' occurrences from a date onwards, round-robin in
-- rota order. Only unassigned occurrences are touched: a deliberate assignment
-- someone made by hand is never overwritten.
--
-- Returns how many were assigned.
-- ---------------------------------------------------------------------------

create or replace function todotwo.apply_rota(
  p_series_id uuid,
  p_from date default current_date,
  p_to date default null
)
returns integer
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_actor   uuid := todotwo.current_person_id();
  v_people  uuid[];
  v_count   integer;
  v_index   integer := 0;
  v_task    record;
  v_applied integer := 0;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may set a rota' using errcode = 'insufficient_privilege';
  end if;

  select array_agg(person_id order by position) into v_people
  from todotwo.series_rota
  where series_id = p_series_id;

  v_count := coalesce(array_length(v_people, 1), 0);
  if v_count = 0 then
    return 0;
  end if;

  for v_task in
    select t.id, t.occurrence_date
    from todotwo.tasks t
    where t.series_id = p_series_id
      and t.deleted_at is null
      and t.occurrence_date >= p_from
      and (p_to is null or t.occurrence_date <= p_to)
      and t.status in ('unassigned', 'draft')
      -- Never disturb an occurrence someone already put a name against.
      and not exists (
        select 1 from todotwo.task_assignments a
        where a.task_id = t.id and a.unassigned_at is null
      )
    order by t.occurrence_date
  loop
    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    values (v_task.id, v_people[(v_index % v_count) + 1], v_actor);

    update todotwo.tasks set status = 'assigned' where id = v_task.id;

    v_index := v_index + 1;
    v_applied := v_applied + 1;
  end loop;

  return v_applied;
end;
$$;

revoke all on function todotwo.apply_rota(uuid, date, date) from public, anon;
grant execute on function todotwo.apply_rota(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Assigning or clearing a single occurrence
-- ---------------------------------------------------------------------------

create or replace function todotwo.assign_task(p_task_id uuid, p_person_id uuid default null)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_actor uuid := todotwo.current_person_id();
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may assign work' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.task_assignments
     set unassigned_at = now()
   where task_id = p_task_id and unassigned_at is null;

  if p_person_id is null then
    -- Clearing the last assignee returns the task to the unassigned pool.
    update todotwo.tasks
       set status = 'unassigned'
     where id = p_task_id and status = 'assigned';
    return;
  end if;

  insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
  values (p_task_id, p_person_id, v_actor);

  update todotwo.tasks
     set status = 'assigned'
   where id = p_task_id and status in ('unassigned', 'draft');
end;
$$;

revoke all on function todotwo.assign_task(uuid, uuid) from public, anon;
grant execute on function todotwo.assign_task(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Workload, for fairness
--
-- Counts assigned and completed work per person over a window. Deliberately
-- counts only: hours would need estimates the farm does not record yet, and a
-- fair-looking number built on missing data is worse than an honest count.
-- ---------------------------------------------------------------------------

create or replace view todotwo.person_workload
with (security_invoker = true)
as
select
  p.id                                                     as person_id,
  p.full_name,
  t.due_date,
  count(*) filter (where t.status not in ('completed', 'verified', 'cancelled')) as open_count,
  count(*) filter (where t.status in ('completed', 'verified'))                  as done_count,
  count(*)                                                                       as total_count
from todotwo.people p
join todotwo.task_assignments a on a.person_id = p.id and a.unassigned_at is null
join todotwo.tasks t on t.id = a.task_id and t.deleted_at is null
where p.deleted_at is null
group by p.id, p.full_name, t.due_date;

grant select on todotwo.person_workload to authenticated;
revoke all on todotwo.person_workload from anon;

create trigger series_rota_audit
  after insert or update or delete on todotwo.series_rota
  for each row execute function todotwo.audit_trigger();

-- ROLLBACK:
--   drop view if exists todotwo.person_workload;
--   drop function if exists todotwo.assign_task(uuid, uuid);
--   drop function if exists todotwo.apply_rota(uuid, date, date);
--   drop table if exists todotwo.series_rota cascade;
