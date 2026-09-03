-- TodoTwo — complete_task requires the feed-sufficiency answer, when asked
--
-- "do we have enough food for the next two days? should always be a question
-- for the evening animals." Read literally: when the task (or its series)
-- carries requires_feed_check, completing it now requires a
-- p_has_enough_food answer, logs it to todotwo.feed_checks in the same
-- transaction, and — on "no" — alerts every staff person via the notification
-- outbox. A task that does not require the check is entirely unaffected: the
-- new parameter defaults to null and is simply never consulted.
--
-- Postgres migrations here are additive/forward-only, so this reproduces the
-- existing complete_task body (20260906091500_todotwo_complete_task_step_cascade.sql)
-- plus the feed-check gate.

-- enqueue_notification() requires todotwo.is_staff() of its caller, and
-- complete_task() itself may be called by a non-staff assignee (any assigned
-- person can complete their own task). complete_task() is security definer
-- already; the nested call to enqueue_notification() runs as the same
-- definer-owner role, so is_staff() inside it evaluates against the
-- *definer's* privileges only if the function owner is staff-equivalent —
-- which it is not, in general. Postgres security definer functions execute
-- with the privileges of the function's owner, not of nested current_user
-- checks against auth.uid(); todotwo.is_staff() reads auth.uid() directly
-- (it is STABLE SQL, not dependent on the calling role), so it still
-- evaluates against whoever is actually signed in — the same person calling
-- complete_task(). That means a non-staff assignee completing their own
-- feed-check task with a "no" answer would fail enqueue_notification()'s own
-- is_staff() guard. To keep the alert working for every caller of
-- complete_task() (staff and non-staff assignees alike), enqueue the outbox
-- row directly here instead of going through enqueue_notification(), reusing
-- its exact dedupe-key and lookup logic under complete_task()'s own
-- security-definer privilege.
create or replace function todotwo.complete_task(
  p_task_id uuid,
  p_actual_minutes integer default null,
  p_has_enough_food boolean default null
)
returns todotwo.tasks
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_task todotwo.tasks;
  v_person uuid := todotwo.current_person_id();
  v_now timestamptz := now();
  v_requires_check boolean;
  v_title text;
  v_staff record;
  v_subject text;
  v_body text;
  v_key text;
begin
  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
  end if;

  select r.requires_feed_check, r.title
    into v_requires_check, v_title
  from todotwo.tasks_resolved r
  where r.id = p_task_id;

  if v_requires_check and p_has_enough_food is null then
    raise exception 'Answer the feed-sufficiency question before completing this task'
      using errcode = 'check_violation';
  end if;

  update todotwo.tasks
     set status = 'completed',
         completed_at = v_now,
         completed_by_person_id = v_person,
         actual_minutes = coalesce(p_actual_minutes, actual_minutes)
   where id = p_task_id
     and status not in ('completed', 'verified', 'cancelled')
  returning * into v_task;

  if v_task.id is null then
    raise exception 'Task is already finished' using errcode = 'check_violation';
  end if;

  insert into todotwo.task_step_completions (task_id, series_step_id, completed_at, completed_by_person_id)
  select v_task.id, s.id, v_now, v_person
  from todotwo.task_series_steps s
  where s.series_id = v_task.series_id
  on conflict (task_id, series_step_id) do nothing;

  if v_requires_check and p_has_enough_food is not null then
    insert into todotwo.feed_checks (task_id, person_id, has_enough_for_two_days)
    values (v_task.id, v_person, p_has_enough_food);

    if p_has_enough_food = false then
      v_subject := 'Feed running low — ' || coalesce(v_title, 'an evening animal task') ||
        ' reported insufficient feed for the next two days';
      v_body := 'Reported during task completion on ' ||
        to_char(v_now at time zone 'Europe/Oslo', 'YYYY-MM-DD HH24:MI') ||
        ' (Europe/Oslo). Please check feed stock and restock or arrange a run.';

      for v_staff in
        select p.id, p.email
        from todotwo.role_assignments ra
        join todotwo.people p on p.id = ra.person_id
        where ra.revoked_at is null
          and ra.role in ('super_admin', 'farm_admin', 'coordinator')
          and p.deleted_at is null
          and p.is_active
      loop
        if v_staff.email is null or position('@' in v_staff.email) < 2 then
          continue;
        end if;

        v_key := todotwo.notification_dedupe_key(
          'feed_check_insufficient', v_task.id, v_staff.id, 'email'
        );

        insert into todotwo.notification_outbox
          (person_id, channel, recipient_email, subject, body, topic, reference_id, dedupe_key)
        values
          (v_staff.id, 'email', v_staff.email, v_subject, v_body,
           'feed_check_insufficient', v_task.id, v_key)
        on conflict (dedupe_key) do nothing;
      end loop;
    end if;
  end if;

  return v_task;
end;
$$;

revoke all on function todotwo.complete_task(uuid, integer, boolean) from public, anon;
grant execute on function todotwo.complete_task(uuid, integer, boolean) to authenticated;

-- ROLLBACK:
--   -- Restores the pre-feed-check body from
--   -- 20260906091500_todotwo_complete_task_step_cascade.sql.
--   drop function if exists todotwo.complete_task(uuid, integer, boolean);
--   create or replace function todotwo.complete_task(p_task_id uuid, p_actual_minutes integer default null)
--   returns todotwo.tasks
--   language plpgsql
--   security definer
--   set search_path = todotwo, public, pg_temp
--   as $$
--   declare
--     v_task todotwo.tasks;
--     v_person uuid := todotwo.current_person_id();
--     v_now timestamptz := now();
--   begin
--     if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
--       raise exception 'Not assigned to this task' using errcode = 'insufficient_privilege';
--     end if;
--     update todotwo.tasks
--        set status = 'completed',
--            completed_at = v_now,
--            completed_by_person_id = v_person,
--            actual_minutes = coalesce(p_actual_minutes, actual_minutes)
--      where id = p_task_id
--        and status not in ('completed', 'verified', 'cancelled')
--     returning * into v_task;
--     if v_task.id is null then
--       raise exception 'Task is already finished' using errcode = 'check_violation';
--     end if;
--     insert into todotwo.task_step_completions (task_id, series_step_id, completed_at, completed_by_person_id)
--     select v_task.id, s.id, v_now, v_person
--     from todotwo.task_series_steps s
--     where s.series_id = v_task.series_id
--     on conflict (task_id, series_step_id) do nothing;
--     return v_task;
--   end;
--   $$;
--   revoke all on function todotwo.complete_task(uuid, integer) from public, anon;
--   grant execute on function todotwo.complete_task(uuid, integer) to authenticated;
