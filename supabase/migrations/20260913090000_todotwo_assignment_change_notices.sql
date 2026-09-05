-- TodoTwo — tell people when their work changes
--
-- Until now, assignment was silent. A coordinator could hand you tomorrow's
-- milking, take it away again, or clear the whole week, and the only way to
-- find out was to open the app and look. Every other notification in the
-- system is about something that already went wrong — overdue, feed running
-- low, the evening digest — and nothing tells you about the change itself.
--
-- Implemented as a trigger on task_assignments rather than by editing each
-- caller. There are six paths that change an assignment today (assign_task,
-- apply_rota, claim_task, decide_task_handoff, clear_assignments_from, and
-- the onboarding ramp) and more will arrive; a trigger catches all of them,
-- including the ones nobody remembers to update.
--
-- Two things keep it from becoming noise:
--
--   * Only near-term work. A rota applied for next month would otherwise
--     buzz someone forty times about days they cannot act on yet. Changes to
--     work due within the next two days are the ones worth interrupting
--     someone for; the rest they will see in the app or the daily digest.
--   * Deduplicated per task, person and direction, so assigning and
--     reassigning the same task repeatedly does not send repeatedly.
--
-- enqueue_notification is not reused: it requires is_staff() of its caller,
-- and these fire for claim_task (any Workawayer taking free work) and for
-- cron paths where there is no session at all. The insert is done directly
-- here, under the trigger function's own definer rights, mirroring the same
-- approach complete_task already had to take for its feed alert.

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
  -- Which way did this go?
  if tg_op = 'INSERT' and new.unassigned_at is null then
    v_person_id := new.person_id;
    v_kind := 'assigned';
  elsif tg_op = 'UPDATE' and old.unassigned_at is null and new.unassigned_at is not null then
    v_person_id := new.person_id;
    v_kind := 'unassigned';
  else
    return coalesce(new, old);
  end if;

  -- Supervisors are not the people doing the work.
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

  -- Near-term only. Anything further out is not worth an interruption.
  if v_task.due_date is null
     or v_task.due_date > (current_date + 2)
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
    else to_char(v_task.due_date, 'FMDay')
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

  -- Per task, per person, per direction: churn on the same task collapses,
  -- but genuinely being given it back tomorrow still reaches you.
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

comment on function todotwo.notify_assignment_change() is
  'Queues a notice when work is given to or taken from someone, for anything due within two days. Fires for every path that touches task_assignments, including ones with no signed-in caller.';

drop trigger if exists task_assignments_notify_change on todotwo.task_assignments;

create trigger task_assignments_notify_change
  after insert or update of unassigned_at on todotwo.task_assignments
  for each row execute function todotwo.notify_assignment_change();

-- ROLLBACK:
--   drop trigger if exists task_assignments_notify_change on todotwo.task_assignments;
--   drop function if exists todotwo.notify_assignment_change();
