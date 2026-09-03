-- TodoTwo — onboarding ramp and task-handoff consent
--
-- A new person shadows for their first two days (day 0-1, no tasks), then
-- picks up at most two tasks total across days 2-3 combined via an explicit
-- handoff the current holder must accept, then is fully normal from day 5.
-- farm_start_date is nullable and null means "unaffected" — every existing
-- and backfilled person is simply outside the ramp window forever.

alter table todotwo.people add column farm_start_date date;

comment on column todotwo.people.farm_start_date is
  'First day on the farm, for the onboarding ramp (see todotwo-onboarding-ramp cron). Null means unaffected — no ramp logic applies.';

-- ---------------------------------------------------------------------------
-- task_handoff_requests
-- ---------------------------------------------------------------------------

create table todotwo.task_handoff_requests (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references todotwo.tasks (id) on delete cascade,
  from_person_id  uuid not null references todotwo.people (id) on delete cascade,
  to_person_id    uuid not null references todotwo.people (id) on delete cascade,
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'declined', 'expired')),
  requested_at    timestamptz not null default now(),
  decided_at      timestamptz
);

comment on table todotwo.task_handoff_requests is
  'A request to move one already-assigned occurrence from from_person_id to to_person_id. Only the current holder can accept or decline it; created only via todotwo.request_task_handoff().';

create index task_handoff_requests_from_idx
  on todotwo.task_handoff_requests (from_person_id, status);

create index task_handoff_requests_to_idx
  on todotwo.task_handoff_requests (to_person_id, status);

-- At most one pending request per task, so the cron's own idempotency check
-- ("does a pending request already exist for this task?") is also enforced by
-- the database, not just by application logic re-run daily.
create unique index task_handoff_requests_task_pending_unique
  on todotwo.task_handoff_requests (task_id)
  where status = 'pending';

alter table todotwo.task_handoff_requests enable row level security;

-- The decider: sees and updates their own pending rows. Updates only happen
-- through decide_task_handoff() below (no update policy is granted broadly
-- enough to bypass it — see grants), this policy is what lets that
-- security-definer function's internal update succeed under RLS-invoker
-- callers, and lets a from_person read their own queue directly.
create policy task_handoff_requests_from_select on todotwo.task_handoff_requests
  for select to authenticated
  using (from_person_id = todotwo.current_person_id());

create policy task_handoff_requests_from_update on todotwo.task_handoff_requests
  for update to authenticated
  using (from_person_id = todotwo.current_person_id())
  with check (from_person_id = todotwo.current_person_id());

-- The requester: read-only visibility into their own outgoing requests.
create policy task_handoff_requests_to_select on todotwo.task_handoff_requests
  for select to authenticated
  using (to_person_id = todotwo.current_person_id());

create policy task_handoff_requests_staff_select on todotwo.task_handoff_requests
  for select to authenticated
  using (todotwo.is_staff());

create policy task_handoff_requests_staff_update on todotwo.task_handoff_requests
  for update to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

-- No insert policy for authenticated at all: rows are created only by
-- request_task_handoff(), which is security definer and therefore writes
-- regardless of the caller's own grants.
grant select, update on todotwo.task_handoff_requests to authenticated;
revoke insert, delete on todotwo.task_handoff_requests from authenticated;
revoke all on todotwo.task_handoff_requests from anon;

create trigger task_handoff_requests_audit
  after insert or update or delete on todotwo.task_handoff_requests
  for each row execute function todotwo.audit_trigger();

-- ---------------------------------------------------------------------------
-- request_task_handoff
--
-- Reads the task's current holder as from_person_id, inserts a pending row,
-- and queues the notification addressed to that holder directly (bypassing
-- enqueue_notification's is_staff() check) because the intended caller of
-- this path is the onboarding-ramp cron running under the service role,
-- where auth.uid() is null and is_staff() would therefore always be false.
--
-- Authorization: staff, or a null auth.uid() (the privileged cron client,
-- which bypasses RLS/grants entirely and calls this only for its own
-- accounting — the check here is defense in depth, not the real gate).
-- Granted to authenticated too, for a possible future voluntary-offer path
-- initiated by a person themselves; harmless since it still requires staff.
-- ---------------------------------------------------------------------------

create or replace function todotwo.request_task_handoff(p_task_id uuid, p_to_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_from_person_id uuid;
  v_task_title      text;
  v_to_name         text;
  v_id              uuid;
  v_key             text;
begin
  if not (todotwo.is_staff() or auth.uid() is null) then
    raise exception 'Only staff may request a task handoff' using errcode = 'insufficient_privilege';
  end if;

  select a.person_id into v_from_person_id
  from todotwo.task_assignments a
  where a.task_id = p_task_id and a.unassigned_at is null
  order by a.assigned_at desc
  limit 1;

  if v_from_person_id is null then
    raise exception 'Task % has no current assignee to hand off from', p_task_id;
  end if;

  if v_from_person_id = p_to_person_id then
    raise exception 'Cannot hand a task off to its current assignee';
  end if;

  select coalesce(t.title, ts.title) into v_task_title
  from todotwo.tasks t
  left join todotwo.task_series ts on ts.id = t.series_id
  where t.id = p_task_id;

  select coalesce(p.preferred_name, p.full_name) into v_to_name
  from todotwo.people p
  where p.id = p_to_person_id;

  insert into todotwo.task_handoff_requests (task_id, from_person_id, to_person_id)
  values (p_task_id, v_from_person_id, p_to_person_id)
  on conflict (task_id) where status = 'pending' do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from todotwo.task_handoff_requests
    where task_id = p_task_id and status = 'pending';
    return v_id;
  end if;

  v_key := todotwo.notification_dedupe_key('task_handoff_request', v_id, v_from_person_id, 'email');

  insert into todotwo.notification_outbox
    (person_id, channel, recipient_email, subject, body, topic, reference_id, dedupe_key)
  select
    v_from_person_id,
    'email',
    p.email,
    coalesce(v_to_name, 'A teammate') || ' would like to do this task — is it OK to give it away?',
    coalesce(v_to_name, 'A teammate') || ' would like to take over "' || coalesce(v_task_title, 'a task') ||
      '". Sign in to TodoTwo to accept or decline.',
    'task_handoff_request',
    v_id,
    v_key
  from todotwo.people p
  where p.id = v_from_person_id
    and p.email is not null
    and position('@' in p.email) > 1
  on conflict (dedupe_key) do nothing;

  return v_id;
end;
$$;

revoke all on function todotwo.request_task_handoff(uuid, uuid) from public, anon;
grant execute on function todotwo.request_task_handoff(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- decide_task_handoff
--
-- Only the request's from_person_id (or staff) may decide it. On accept, the
-- assignment moves via the same logic as todotwo.assign_task (clear the
-- active assignment, insert the new one, task stays 'assigned') rather than
-- calling assign_task() itself, since assign_task() requires is_staff() and
-- the whole point of this path is that a non-staff holder can give a task
-- away with the new person's benefit, not their own staff privilege.
-- ---------------------------------------------------------------------------

create or replace function todotwo.decide_task_handoff(p_handoff_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_request todotwo.task_handoff_requests;
begin
  select * into v_request
  from todotwo.task_handoff_requests
  where id = p_handoff_id
  for update;

  if v_request.id is null then
    raise exception 'Handoff request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This handoff has already been decided';
  end if;

  if not (todotwo.is_staff() or v_request.from_person_id = todotwo.current_person_id()) then
    raise exception 'Not yours to decide' using errcode = 'insufficient_privilege';
  end if;

  if p_accept then
    update todotwo.task_assignments
       set unassigned_at = now()
     where task_id = v_request.task_id and unassigned_at is null;

    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    values (v_request.task_id, v_request.to_person_id, v_request.from_person_id);

    update todotwo.tasks
       set status = 'assigned'
     where id = v_request.task_id and status in ('unassigned', 'draft', 'assigned');

    update todotwo.task_handoff_requests
       set status = 'accepted', decided_at = now()
     where id = p_handoff_id;
  else
    update todotwo.task_handoff_requests
       set status = 'declined', decided_at = now()
     where id = p_handoff_id;
  end if;
end;
$$;

revoke all on function todotwo.decide_task_handoff(uuid, boolean) from public, anon;
grant execute on function todotwo.decide_task_handoff(uuid, boolean) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.decide_task_handoff(uuid, boolean);
--   drop function if exists todotwo.request_task_handoff(uuid, uuid);
--   drop table if exists todotwo.task_handoff_requests cascade;
--   alter table todotwo.people drop column if exists farm_start_date;
