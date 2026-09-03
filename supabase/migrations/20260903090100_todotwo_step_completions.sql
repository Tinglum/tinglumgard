-- TodoTwo — ticking off the steps of a routine
--
-- A series' steps are a template: "Kitchen" has six of them, held once so
-- editing the text corrects every future day. But ticking one off is about a
-- particular Tuesday, not about the template. So completion lives here, against
-- the occurrence, and the template stays untouched.
--
-- One-off tasks need none of this: their steps are child rows in todotwo.tasks
-- and carry their own status.

create table todotwo.task_step_completions (
  id                    uuid primary key default gen_random_uuid(),
  task_id               uuid not null references todotwo.tasks (id) on delete cascade,
  series_step_id        uuid not null references todotwo.task_series_steps (id) on delete cascade,
  completed_at          timestamptz not null default now(),
  completed_by_person_id uuid references todotwo.people (id) on delete set null,
  unique (task_id, series_step_id)
);

create index task_step_completions_task_idx on todotwo.task_step_completions (task_id);

alter table todotwo.task_step_completions enable row level security;

create policy task_step_completions_select on todotwo.task_step_completions
  for select to authenticated
  using (todotwo.current_person_id() is not null);

create policy task_step_completions_staff_all on todotwo.task_step_completions
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

grant select, insert, update, delete on todotwo.task_step_completions to authenticated;
revoke all on todotwo.task_step_completions from anon;

-- ---------------------------------------------------------------------------
-- Toggling a step
--
-- A Workawayer has no direct write on the table — same reasoning as
-- complete_task. The function re-checks the caller against the occurrence
-- rather than trusting the arguments.
-- ---------------------------------------------------------------------------

create or replace function todotwo.toggle_step(p_task_id uuid, p_step_id uuid)
returns boolean
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_existing uuid;
begin
  if v_person is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  -- The step must belong to the series this occurrence came from. Without this
  -- check a caller could tick a step from an unrelated routine.
  if not exists (
    select 1
    from todotwo.tasks t
    join todotwo.task_series_steps s on s.series_id = t.series_id
    where t.id = p_task_id and s.id = p_step_id
  ) then
    raise exception 'Step does not belong to this task' using errcode = 'check_violation';
  end if;

  select id into v_existing
  from todotwo.task_step_completions
  where task_id = p_task_id and series_step_id = p_step_id;

  if v_existing is not null then
    delete from todotwo.task_step_completions where id = v_existing;
    return false;
  end if;

  insert into todotwo.task_step_completions (task_id, series_step_id, completed_by_person_id)
  values (p_task_id, p_step_id, v_person);

  return true;
end;
$$;

revoke all on function todotwo.toggle_step(uuid, uuid) from public, anon;
grant execute on function todotwo.toggle_step(uuid, uuid) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.toggle_step(uuid, uuid);
--   drop table if exists todotwo.task_step_completions cascade;
