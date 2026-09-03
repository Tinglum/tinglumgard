-- TodoTwo — generalize task handoff into a mutual "swap with me" flow
--
-- task_handoff_requests already models "move this task from from_person_id to
-- to_person_id, subject to one party's consent" — it just only ever ran from
-- the onboarding-ramp cron, where the current holder (from_person_id) decides
-- whether to give a task away to a ramping newcomer.
--
-- A voluntary human-triggered offer is the same table and the same shape,
-- but the party who must consent is reversed: the person giving the task
-- away obviously already wants to (they created the request), so it is the
-- RECIPIENT (to_person_id) who must accept or decline being handed a task.
--
-- Rather than a parallel table/RPC pair, we add a `direction` column so one
-- request row says which party is the decider, and branch both
-- request_task_handoff() and decide_task_handoff() on it. Existing rows and
-- the existing cron call site default to 'ramp_transfer' (from_person_id
-- decides), preserving current behaviour exactly; the new UI path passes
-- 'offer' (to_person_id decides).
--
-- This migration also closes a gap request_task_handoff() had until now: it
-- only ever checked `is_staff() or auth.uid() is null` (staff, or the
-- privileged cron client). That was fine while the only caller was the cron
-- job or staff acting on someone's behalf, but a voluntary offer is called
-- directly by an ordinary authenticated person, so the function must also
-- confirm the caller actually holds the task before letting them give it
-- away as themselves.

alter table todotwo.task_handoff_requests
  add column direction text not null default 'ramp_transfer'
    check (direction in ('offer', 'ramp_transfer'));

comment on column todotwo.task_handoff_requests.direction is
  'Who must decide this request. ramp_transfer (default, onboarding cron): the current holder (from_person_id) approves giving the task away. offer (voluntary, human-triggered): the recipient (to_person_id) accepts or declines being given the task.';

-- ---------------------------------------------------------------------------
-- RLS: the decider needs update rights, and which party that is now depends
-- on direction. The existing from_update policy is narrowed to the
-- ramp_transfer case; a new to_update policy covers the offer case. Select
-- policies are untouched — both parties could already read their own rows
-- regardless of direction, which is still correct.
-- ---------------------------------------------------------------------------

drop policy if exists task_handoff_requests_from_update on todotwo.task_handoff_requests;

create policy task_handoff_requests_from_update on todotwo.task_handoff_requests
  for update to authenticated
  using (direction = 'ramp_transfer' and from_person_id = todotwo.current_person_id())
  with check (direction = 'ramp_transfer' and from_person_id = todotwo.current_person_id());

create policy task_handoff_requests_to_update on todotwo.task_handoff_requests
  for update to authenticated
  using (direction = 'offer' and to_person_id = todotwo.current_person_id())
  with check (direction = 'offer' and to_person_id = todotwo.current_person_id());

-- ---------------------------------------------------------------------------
-- request_task_handoff — now direction-aware and caller-checked.
--
-- Authorization: staff, or a null auth.uid() (the privileged cron client,
-- as before), or the caller actually being the task's current holder
-- (from_person_id) — the new case, for a voluntary self-offer.
-- ---------------------------------------------------------------------------

create or replace function todotwo.request_task_handoff(
  p_task_id uuid,
  p_to_person_id uuid,
  p_direction text default 'ramp_transfer'
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_from_person_id uuid;
  v_task_title      text;
  v_to_name         text;
  v_from_name       text;
  v_id              uuid;
  v_key             text;
begin
  if p_direction not in ('offer', 'ramp_transfer') then
    raise exception 'Invalid handoff direction: %', p_direction using errcode = 'invalid_parameter_value';
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

  if not (
    todotwo.is_staff()
    or auth.uid() is null
    or v_from_person_id = todotwo.current_person_id()
  ) then
    raise exception 'Only the task''s current assignee, or staff, may request a handoff'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(t.title, ts.title) into v_task_title
  from todotwo.tasks t
  left join todotwo.task_series ts on ts.id = t.series_id
  where t.id = p_task_id;

  select coalesce(p.preferred_name, p.full_name) into v_to_name
  from todotwo.people p
  where p.id = p_to_person_id;

  select coalesce(p.preferred_name, p.full_name) into v_from_name
  from todotwo.people p
  where p.id = v_from_person_id;

  insert into todotwo.task_handoff_requests (task_id, from_person_id, to_person_id, direction)
  values (p_task_id, v_from_person_id, p_to_person_id, p_direction)
  on conflict (task_id) where status = 'pending' do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from todotwo.task_handoff_requests
    where task_id = p_task_id and status = 'pending';
    return v_id;
  end if;

  if p_direction = 'offer' then
    -- The recipient decides: notify them that a teammate wants to hand them
    -- the task, bypassing enqueue_notification's is_staff() check for the
    -- same reason as the ramp_transfer branch below.
    v_key := todotwo.notification_dedupe_key('task_handoff_request', v_id, p_to_person_id, 'email');

    insert into todotwo.notification_outbox
      (person_id, channel, recipient_email, subject, body, topic, reference_id, dedupe_key)
    select
      p_to_person_id,
      'email',
      p.email,
      coalesce(v_from_name, 'A teammate') || ' is offering you a task',
      coalesce(v_from_name, 'A teammate') || ' would like you to take over "' || coalesce(v_task_title, 'a task') ||
        '". Sign in to TodoTwo to accept or decline.',
      'task_handoff_request',
      v_id,
      v_key
    from todotwo.people p
    where p.id = p_to_person_id
      and p.email is not null
      and position('@' in p.email) > 1
    on conflict (dedupe_key) do nothing;
  else
    -- The current holder decides: unchanged from the original ramp-transfer
    -- behaviour.
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
  end if;

  return v_id;
end;
$$;

revoke all on function todotwo.request_task_handoff(uuid, uuid, text) from public, anon;
grant execute on function todotwo.request_task_handoff(uuid, uuid, text) to authenticated;

-- The two-argument overload the cron and any existing callers were compiled
-- against no longer exists once create-or-replace changes the signature, so
-- drop it explicitly rather than leaving a stale duplicate around.
drop function if exists todotwo.request_task_handoff(uuid, uuid);

-- ---------------------------------------------------------------------------
-- decide_task_handoff — branches the "who may decide" check on direction.
-- Reassignment logic on accept is unchanged and applies to both directions.
-- ---------------------------------------------------------------------------

create or replace function todotwo.decide_task_handoff(p_handoff_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_request todotwo.task_handoff_requests;
  v_allowed boolean;
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

  if v_request.direction = 'offer' then
    v_allowed := todotwo.is_staff() or v_request.to_person_id = todotwo.current_person_id();
  else
    v_allowed := todotwo.is_staff() or v_request.from_person_id = todotwo.current_person_id();
  end if;

  if not v_allowed then
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
--   drop function if exists todotwo.request_task_handoff(uuid, uuid, text);
--   create or replace function todotwo.request_task_handoff(p_task_id uuid, p_to_person_id uuid)
--   returns uuid
--   language plpgsql
--   security definer
--   set search_path = todotwo, public, pg_temp
--   as $rollback$
--   declare
--     v_from_person_id uuid;
--     v_task_title      text;
--     v_to_name         text;
--     v_id              uuid;
--     v_key             text;
--   begin
--     if not (todotwo.is_staff() or auth.uid() is null) then
--       raise exception 'Only staff may request a task handoff' using errcode = 'insufficient_privilege';
--     end if;
--     select a.person_id into v_from_person_id
--     from todotwo.task_assignments a
--     where a.task_id = p_task_id and a.unassigned_at is null
--     order by a.assigned_at desc
--     limit 1;
--     if v_from_person_id is null then
--       raise exception 'Task % has no current assignee to hand off from', p_task_id;
--     end if;
--     if v_from_person_id = p_to_person_id then
--       raise exception 'Cannot hand a task off to its current assignee';
--     end if;
--     select coalesce(t.title, ts.title) into v_task_title
--     from todotwo.tasks t
--     left join todotwo.task_series ts on ts.id = t.series_id
--     where t.id = p_task_id;
--     select coalesce(p.preferred_name, p.full_name) into v_to_name
--     from todotwo.people p
--     where p.id = p_to_person_id;
--     insert into todotwo.task_handoff_requests (task_id, from_person_id, to_person_id)
--     values (p_task_id, v_from_person_id, p_to_person_id)
--     on conflict (task_id) where status = 'pending' do nothing
--     returning id into v_id;
--     if v_id is null then
--       select id into v_id
--       from todotwo.task_handoff_requests
--       where task_id = p_task_id and status = 'pending';
--       return v_id;
--     end if;
--     v_key := todotwo.notification_dedupe_key('task_handoff_request', v_id, v_from_person_id, 'email');
--     insert into todotwo.notification_outbox
--       (person_id, channel, recipient_email, subject, body, topic, reference_id, dedupe_key)
--     select
--       v_from_person_id,
--       'email',
--       p.email,
--       coalesce(v_to_name, 'A teammate') || ' would like to do this task — is it OK to give it away?',
--       coalesce(v_to_name, 'A teammate') || ' would like to take over "' || coalesce(v_task_title, 'a task') ||
--         '". Sign in to TodoTwo to accept or decline.',
--       'task_handoff_request',
--       v_id,
--       v_key
--     from todotwo.people p
--     where p.id = v_from_person_id
--       and p.email is not null
--       and position('@' in p.email) > 1
--     on conflict (dedupe_key) do nothing;
--     return v_id;
--   end;
--   $rollback$;
--   revoke all on function todotwo.request_task_handoff(uuid, uuid) from public, anon;
--   grant execute on function todotwo.request_task_handoff(uuid, uuid) to authenticated;
--   create or replace function todotwo.decide_task_handoff(p_handoff_id uuid, p_accept boolean)
--   returns void
--   language plpgsql
--   security definer
--   set search_path = todotwo, public, pg_temp
--   as $rollback2$
--   declare
--     v_request todotwo.task_handoff_requests;
--   begin
--     select * into v_request
--     from todotwo.task_handoff_requests
--     where id = p_handoff_id
--     for update;
--     if v_request.id is null then
--       raise exception 'Handoff request not found';
--     end if;
--     if v_request.status <> 'pending' then
--       raise exception 'This handoff has already been decided';
--     end if;
--     if not (todotwo.is_staff() or v_request.from_person_id = todotwo.current_person_id()) then
--       raise exception 'Not yours to decide' using errcode = 'insufficient_privilege';
--     end if;
--     if p_accept then
--       update todotwo.task_assignments
--          set unassigned_at = now()
--        where task_id = v_request.task_id and unassigned_at is null;
--       insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
--       values (v_request.task_id, v_request.to_person_id, v_request.from_person_id);
--       update todotwo.tasks
--          set status = 'assigned'
--        where id = v_request.task_id and status in ('unassigned', 'draft', 'assigned');
--       update todotwo.task_handoff_requests
--          set status = 'accepted', decided_at = now()
--        where id = p_handoff_id;
--     else
--       update todotwo.task_handoff_requests
--          set status = 'declined', decided_at = now()
--        where id = p_handoff_id;
--     end if;
--   end;
--   $rollback2$;
--   revoke all on function todotwo.decide_task_handoff(uuid, boolean) from public, anon;
--   grant execute on function todotwo.decide_task_handoff(uuid, boolean) to authenticated;
--   drop policy if exists task_handoff_requests_to_update on todotwo.task_handoff_requests;
--   drop policy if exists task_handoff_requests_from_update on todotwo.task_handoff_requests;
--   create policy task_handoff_requests_from_update on todotwo.task_handoff_requests
--     for update to authenticated
--     using (from_person_id = todotwo.current_person_id())
--     with check (from_person_id = todotwo.current_person_id());
--   alter table todotwo.task_handoff_requests drop column if exists direction;
