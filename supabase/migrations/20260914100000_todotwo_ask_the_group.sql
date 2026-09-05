-- TodoTwo — asking the group to take something
--
-- A Workawayer could already offer a task to one named person: pick Amber,
-- Amber accepts or declines. What they could not do is say "I cannot do this
-- one, will anybody?" — which is the ordinary case. Choosing somebody to
-- burden is a bigger social act than asking the room, and on a farm where
-- people are out working, the person best placed to take it is whoever reads
-- the message first.
--
-- Modelled as its own small table rather than by making
-- task_handoff_requests.to_person_id nullable. That column is `not null` and
-- every policy on that table is written around a known counterparty; loosening
-- it would quietly change what "a handoff request" means for the onboarding
-- ramp and the person-to-person offer as well. An open request is a different
-- thing: nobody is being asked, so nobody can decline, and the only outcome
-- is that somebody takes it or nobody does.

create table todotwo.task_help_requests (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid not null references todotwo.tasks (id) on delete cascade,
  asked_by_person_id uuid not null references todotwo.people (id) on delete cascade,
  note           text,
  status         text not null default 'open'
                 check (status in ('open', 'taken', 'withdrawn')),
  taken_by_person_id uuid references todotwo.people (id) on delete set null,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

-- One open ask per task. A second would just be noise, and two people taking
-- it would be worse.
create unique index task_help_requests_one_open
  on todotwo.task_help_requests (task_id)
  where status = 'open';

create index task_help_requests_open_idx
  on todotwo.task_help_requests (status, created_at desc);

alter table todotwo.task_help_requests enable row level security;

-- Everyone signed in sees open asks: that is the entire point of asking the
-- group rather than a person.
create policy task_help_requests_select_all on todotwo.task_help_requests
  for select to authenticated
  using (true);

grant select on todotwo.task_help_requests to authenticated;
revoke all on todotwo.task_help_requests from anon;

comment on table todotwo.task_help_requests is
  'An open "will anybody take this?" on a task. Visible to everyone signed in; created and answered through ask_for_help/take_over_task, never written directly.';

-- ---------------------------------------------------------------------------
-- Asking
-- ---------------------------------------------------------------------------

create or replace function todotwo.ask_for_help(p_task_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_status todotwo.task_status;
  v_id     uuid;
begin
  if v_person is null then
    raise exception 'You need to be signed in' using errcode = 'insufficient_privilege';
  end if;

  -- Only about your own work. Staff may hand anybody's task around through
  -- assign_task; this is for the person actually holding it.
  if not exists (
    select 1 from todotwo.task_assignments
     where task_id = p_task_id
       and person_id = v_person
       and unassigned_at is null
       and role = 'assignee'
  ) then
    raise exception 'That task is not yours to hand on' using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from todotwo.tasks where id = p_task_id and deleted_at is null;

  if v_status is null then
    raise exception 'No such task' using errcode = 'no_data_found';
  end if;

  if v_status in ('completed', 'verified', 'cancelled') then
    raise exception 'That one is already finished' using errcode = 'check_violation';
  end if;

  insert into todotwo.task_help_requests (task_id, asked_by_person_id, note)
  values (p_task_id, v_person, nullif(trim(p_note), ''))
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'Somebody has already asked about that one'
      using errcode = 'unique_violation';
  end if;

  return v_id;
end;
$$;

comment on function todotwo.ask_for_help(uuid, text) is
  'Asks everyone whether somebody will take one of your own tasks. Does not unassign it: until somebody takes it, it is still yours.';

revoke all on function todotwo.ask_for_help(uuid, text) from public, anon;
grant execute on function todotwo.ask_for_help(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Taking it on
-- ---------------------------------------------------------------------------

create or replace function todotwo.take_over_task(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person  uuid := todotwo.current_person_id();
  v_request record;
begin
  if v_person is null then
    raise exception 'You need to be signed in' using errcode = 'insufficient_privilege';
  end if;

  -- Locked so two people reading the same message cannot both take it.
  select * into v_request
    from todotwo.task_help_requests
   where id = p_request_id
     for update;

  if v_request.id is null then
    raise exception 'No such request' using errcode = 'no_data_found';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Somebody got there first' using errcode = 'check_violation';
  end if;

  if v_request.asked_by_person_id = v_person then
    raise exception 'That is your own task' using errcode = 'check_violation';
  end if;

  update todotwo.task_assignments
     set unassigned_at = now()
   where task_id = v_request.task_id
     and unassigned_at is null;

  insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id, role)
  values (v_request.task_id, v_person, v_person, 'assignee');

  update todotwo.tasks
     set status = 'assigned'
   where id = v_request.task_id
     and status in ('unassigned', 'draft', 'assigned', 'accepted');

  update todotwo.task_help_requests
     set status = 'taken',
         taken_by_person_id = v_person,
         resolved_at = now()
   where id = p_request_id;
end;
$$;

comment on function todotwo.take_over_task(uuid) is
  'Takes on a task somebody asked the group about. Locks the request first, so two people answering at once cannot both end up with it.';

revoke all on function todotwo.take_over_task(uuid) from public, anon;
grant execute on function todotwo.take_over_task(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Changing your mind
-- ---------------------------------------------------------------------------

create or replace function todotwo.withdraw_help_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
begin
  update todotwo.task_help_requests
     set status = 'withdrawn',
         resolved_at = now()
   where id = p_request_id
     and status = 'open'
     and (asked_by_person_id = v_person or todotwo.is_staff());

  if not found then
    raise exception 'That is not yours to withdraw, or it is no longer open'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke all on function todotwo.withdraw_help_request(uuid) from public, anon;
grant execute on function todotwo.withdraw_help_request(uuid) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.withdraw_help_request(uuid);
--   drop function if exists todotwo.take_over_task(uuid);
--   drop function if exists todotwo.ask_for_help(uuid, text);
--   drop table if exists todotwo.task_help_requests;
