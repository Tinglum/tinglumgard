-- TodoTwo — letting the nightly round assign, and telling people about it
--
-- Two small changes that the automatic assignment needs.

-- ---------------------------------------------------------------------------
-- 1. assign_task from a cron
--
-- It guards with `if not todotwo.is_staff()`. is_staff() reads auth.uid(),
-- which is null when the job runs from GitHub Actions through the service
-- role, so every automatic assignment would be refused with "Only staff may
-- assign work" — the security-definer check is not something the service role
-- bypasses.
--
-- The allowance is `auth.uid() is null`, exactly as request_task_handoff
-- already does for the onboarding ramp. Worth being precise about what that
-- does and does not open: the anon role also has no auth.uid(), so the
-- protection against a random visitor rests on the grants, where anon holds
-- no EXECUTE on this function — that revoke is re-stated below rather than
-- left implicit, because it is now load-bearing.
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
  -- Staff, or a job with no session at all (the nightly round, the ramp).
  if not (todotwo.is_staff() or auth.uid() is null) then
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
-- 2. The notice window matches the horizon
--
-- notify_assignment_change() only queued a notice for work due within two
-- days, chosen so a rota applied for next month would not buzz someone forty
-- times. The automatic round assigns four days ahead, which means the fourth
-- day — the whole point of it — would land silently.
--
-- Four days for both, so the rule is simply "you are told about work inside
-- the window the farm plans in".
-- ---------------------------------------------------------------------------

create or replace function todotwo.notify_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person_id  uuid;
  v_kind       text;
  v_task       record;
  v_email      text;
  v_when       text;
  v_subject    text;
  v_body       text;
  v_key        text;
begin
  if tg_op = 'INSERT' and new.unassigned_at is null then
    v_person_id := new.person_id;
    v_kind := 'assigned';
  elsif tg_op = 'UPDATE' and old.unassigned_at is null and new.unassigned_at is not null then
    v_person_id := new.person_id;
    v_kind := 'unassigned';
  else
    return coalesce(new, old);
  end if;

  if coalesce(new.role, 'assignee') <> 'assignee' then
    return coalesce(new, old);
  end if;

  select t.id, t.due_date, coalesce(t.title, s.title) as title
    into v_task
    from todotwo.tasks t
    left join todotwo.task_series s on s.id = t.series_id
   where t.id = new.task_id
     and t.deleted_at is null;

  if v_task.id is null then
    return coalesce(new, old);
  end if;

  -- Four days: the same horizon the nightly round assigns for.
  if v_task.due_date is null
     or v_task.due_date > (current_date + 4)
     or v_task.due_date < current_date then
    return coalesce(new, old);
  end if;

  select email into v_email
    from todotwo.people
   where id = v_person_id and deleted_at is null and is_active;

  if v_email is null or position('@' in v_email) < 2 then
    return coalesce(new, old);
  end if;

  v_when := case
    when v_task.due_date = current_date then 'today'
    when v_task.due_date = current_date + 1 then 'tomorrow'
    else 'on ' || to_char(v_task.due_date, 'FMDay')
  end;

  if v_kind = 'assigned' then
    v_subject := coalesce(v_task.title, 'A task') || ' is yours ' || v_when;
    v_body := 'You have been given "' || coalesce(v_task.title, 'a task') ||
              '" for ' || v_when || ' (' || to_char(v_task.due_date, 'YYYY-MM-DD') || ').';
  else
    v_subject := coalesce(v_task.title, 'A task') || ' is no longer yours';
    v_body := '"' || coalesce(v_task.title, 'A task') || '" on ' ||
              to_char(v_task.due_date, 'YYYY-MM-DD') || ' has been taken off your list.';
  end if;

  v_key := 'assignment-' || v_kind || ':' || new.task_id::text || ':' || v_person_id::text;

  insert into todotwo.notification_outbox
    (person_id, channel, recipient_email, subject, body, topic, reference_id, dedupe_key)
  values
    (v_person_id, 'email', v_email, v_subject, v_body,
     'assignment-' || v_kind, new.task_id, v_key)
  on conflict (dedupe_key) do nothing;

  return coalesce(new, old);
end;
$$;

-- ROLLBACK:
--   -- restore the two-day window and the staff-only assign_task from
--   -- 20260913090000 and 20260903090300 respectively.
