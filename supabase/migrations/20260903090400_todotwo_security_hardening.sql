-- TodoTwo — security fixes from the deployment audit
--
-- Five findings, all mine, all fixed here.

-- ---------------------------------------------------------------------------
-- F1 — email_is_invited was an unauthenticated membership oracle
--
-- Granting it to `anon` alongside a publishable key that ships in the browser
-- bundle let anyone feed it a list of addresses and learn who lives on the
-- farm. The login screen's convenience is not worth that.
--
-- The grant is revoked. The check now happens server-side in a rate-limited
-- route handler, which is the only caller that needs it, and it runs as the
-- service role there rather than as the public.
-- ---------------------------------------------------------------------------

revoke execute on function todotwo.email_is_invited(text) from anon;

comment on function todotwo.email_is_invited(text) is
  'Server-side only. Never grant to anon: with a public key this becomes a membership oracle. Called from the rate-limited /api/todotwo/auth/check route.';

-- ---------------------------------------------------------------------------
-- F2 — pg_temp in a security-definer search_path
--
-- Every definer function carried `set search_path = todotwo, public, pg_temp`.
-- The bodies are all schema-qualified so no exploit was found, but a writable
-- schema in a definer's path is the CVE-2018-1058 shape and there is no reason
-- to keep it — nothing here uses a temporary table.
-- ---------------------------------------------------------------------------

alter function todotwo.current_person_id()                set search_path = todotwo, public;
alter function todotwo.has_role(todotwo.role_name)        set search_path = todotwo, public;
alter function todotwo.is_admin()                         set search_path = todotwo, public;
alter function todotwo.is_staff()                         set search_path = todotwo, public;
alter function todotwo.is_task_assignee(uuid)             set search_path = todotwo, public;
alter function todotwo.audit_trigger()                    set search_path = todotwo, public;
alter function todotwo.accept_task(uuid)                  set search_path = todotwo, public;
alter function todotwo.start_task(uuid)                   set search_path = todotwo, public;
alter function todotwo.complete_task(uuid, integer)       set search_path = todotwo, public;
alter function todotwo.uncomplete_task(uuid)              set search_path = todotwo, public;
alter function todotwo.toggle_step(uuid, uuid)            set search_path = todotwo, public;
alter function todotwo.email_is_invited(text)             set search_path = todotwo, public;
alter function todotwo.claim_person()                     set search_path = todotwo, public, auth;
alter function todotwo.apply_rota(uuid, date, date)       set search_path = todotwo, public;
alter function todotwo.assign_task(uuid, uuid)            set search_path = todotwo, public;

-- ---------------------------------------------------------------------------
-- F3 — work could be assigned to someone who has left
--
-- Neither assign_task nor apply_rota checked that the person is still active,
-- so a Workawayer who went home in March could be put on Tuesday's milking.
-- ---------------------------------------------------------------------------

create or replace function todotwo.assign_task(p_task_id uuid, p_person_id uuid default null)
returns void
language plpgsql
security definer
set search_path = todotwo, public
as $$
declare
  v_actor uuid := todotwo.current_person_id();
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may assign work' using errcode = 'insufficient_privilege';
  end if;

  if p_person_id is not null and not exists (
    select 1 from todotwo.people
    where id = p_person_id and is_active and deleted_at is null
  ) then
    raise exception 'That person is no longer active' using errcode = 'check_violation';
  end if;

  update todotwo.task_assignments
     set unassigned_at = now()
   where task_id = p_task_id and unassigned_at is null;

  if p_person_id is null then
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

create or replace function todotwo.apply_rota(
  p_series_id uuid,
  p_from date default current_date,
  p_to date default null
)
returns integer
language plpgsql
security definer
set search_path = todotwo, public
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

  -- Skip anyone who has left, rather than rostering them.
  select array_agg(r.person_id order by r.position) into v_people
  from todotwo.series_rota r
  join todotwo.people p on p.id = r.person_id
  where r.series_id = p_series_id
    and p.is_active
    and p.deleted_at is null;

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

-- ---------------------------------------------------------------------------
-- F4 — accept_task returned success on a no-op
--
-- Its three siblings raise when the transition is not allowed. This one quietly
-- returned the unchanged row, so a caller could not tell the difference between
-- "accepted" and "nothing happened".
-- ---------------------------------------------------------------------------

create or replace function todotwo.accept_task(p_task_id uuid)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public
as $$
declare
  v_task todotwo.tasks;
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  update todotwo.task_assignments
     set accepted_at = coalesce(accepted_at, now())
   where task_id = p_task_id
     and person_id = todotwo.current_person_id()
     and unassigned_at is null;

  update todotwo.tasks
     set status = 'accepted'
   where id = p_task_id
     and status in ('assigned', 'unassigned')
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task cannot be accepted from its current status'
      using errcode = 'check_violation';
  end if;

  return v_task;
end;
$$;

-- ---------------------------------------------------------------------------
-- F5 — the assignment table handed the whole roster to everyone
--
-- people_coordinator_select was careful about who may see the list of people;
-- task_assignments_select then exposed every person_id to any signed-in user,
-- undoing it. A Workawayer needs to see who else is on the work they are on —
-- not the entire farm's schedule.
-- ---------------------------------------------------------------------------

drop policy if exists task_assignments_select on todotwo.task_assignments;

create policy task_assignments_select on todotwo.task_assignments
  for select to authenticated
  using (
    todotwo.is_staff()
    or person_id = todotwo.current_person_id()
    or todotwo.is_task_assignee(task_id)
  );

-- ROLLBACK:
--   grant execute on function todotwo.email_is_invited(text) to anon;
--   drop policy if exists task_assignments_select on todotwo.task_assignments;
--   create policy task_assignments_select on todotwo.task_assignments
--     for select to authenticated using (todotwo.current_person_id() is not null);
--   -- The function bodies above must be restored from 20260902090100,
--   -- 20260903090200 and 20260903090300 if a full reversal is needed.
