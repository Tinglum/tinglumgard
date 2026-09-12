-- TodoTwo — asking people to square up their overdue work in the evening
--
-- The evening rounds fall due at 18:00. By half past, whoever had them either
-- did them or did not, and the app has no idea which: an overdue task looks
-- identical whether it was finished and never ticked, is about to be done, or
-- has genuinely been forgotten. The overdue count on Today grows all week and
-- stops meaning anything, which is worse than not counting at all.
--
-- So at 18:30 people are asked about their own overdue jobs, one at a time,
-- with the three answers that are actually true of an overdue task.
--
-- Two small changes are needed to support it, both extensions of what the
-- 23:00 unclaimed question already uses.

-- ---------------------------------------------------------------------------
-- 1. A fourth answer: "not yet, still doing it today"
-- ---------------------------------------------------------------------------
--
-- Purely a note to self, like 'someone_else': it changes nothing about the
-- task and only stops this person being asked the same thing again tonight.

alter table todotwo.task_nudge_responses
  drop constraint task_nudge_responses_response_check;

alter table todotwo.task_nudge_responses
  add constraint task_nudge_responses_response_check
  check (response in ('took_charge', 'someone_else', 'another_day', 'still_today'));

-- ---------------------------------------------------------------------------
-- 2. Letting somebody move their own task
-- ---------------------------------------------------------------------------
--
-- defer_task deliberately refused anything already held, so that nobody could
-- shunt somebody else's work into next week. That rule is right for the
-- unclaimed list and wrong here: an overdue task is held, and the person
-- holding it is exactly who should be allowed to say "tomorrow".
--
-- So the rule becomes: the work must be yours, or nobody's. Moving a task that
-- belongs to somebody else is still refused.

create or replace function todotwo.defer_task(p_task_id uuid, p_new_date date)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_task   todotwo.tasks;
  v_holder uuid;
begin
  if v_person is null then
    raise exception 'You need to be signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into v_task from todotwo.tasks where id = p_task_id and deleted_at is null;

  if v_task.id is null then
    raise exception 'No such task' using errcode = 'no_data_found';
  end if;

  if v_task.status in ('completed', 'verified', 'cancelled') then
    raise exception 'That one is already finished' using errcode = 'check_violation';
  end if;

  select person_id into v_holder
    from todotwo.task_assignments
   where task_id = p_task_id and unassigned_at is null and role = 'assignee'
   limit 1;

  -- Yours, or nobody's. Staff may move anything, as everywhere else.
  if v_holder is not null and v_holder <> v_person and not todotwo.is_staff() then
    raise exception 'Somebody has taken that one on — ask them to move it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_task.due_date is not null and p_new_date <= v_task.due_date then
    raise exception 'A task can only be pushed forwards' using errcode = 'check_violation';
  end if;

  update todotwo.tasks
     set due_date = p_new_date,
         due_at = null
   where id = p_task_id;
end;
$$;

comment on function todotwo.defer_task(uuid, date) is
  'Pushes a task to a later day. The task must be unclaimed, or yours, or you must be staff.';

revoke all on function todotwo.defer_task(uuid, date) from public, anon;
grant execute on function todotwo.defer_task(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Recording the new answer
-- ---------------------------------------------------------------------------

create or replace function todotwo.record_nudge_response(p_task_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_today  date := (now() at time zone 'Europe/Oslo')::date;
begin
  if v_person is null then
    raise exception 'You need to be signed in' using errcode = 'insufficient_privilege';
  end if;

  if p_response not in ('took_charge', 'someone_else', 'another_day', 'still_today') then
    raise exception 'Unknown answer: %', p_response using errcode = 'check_violation';
  end if;

  insert into todotwo.task_nudge_responses (task_id, person_id, for_date, response)
  values (p_task_id, v_person, v_today, p_response)
  on conflict (task_id, person_id, for_date)
    do update set response = excluded.response, created_at = now();

  if p_response = 'took_charge' then
    perform todotwo.claim_task(p_task_id);
  elsif p_response = 'another_day' then
    perform todotwo.defer_task(p_task_id, v_today + 1);
  end if;
  -- 'someone_else' and 'still_today' change nothing on purpose. Both are one
  -- person's note about themselves, not a statement about the work, and
  -- neither belongs in the feed.
end;
$$;

revoke all on function todotwo.record_nudge_response(uuid, text) from public, anon;
grant execute on function todotwo.record_nudge_response(uuid, text) to authenticated;

-- ROLLBACK:
--   (defer_task and record_nudge_response revert to the definitions in
--    20260918090000_todotwo_unclaimed_nudge.sql — re-run that file's functions)
--   delete from todotwo.task_nudge_responses where response = 'still_today';
--   alter table todotwo.task_nudge_responses
--     drop constraint task_nudge_responses_response_check;
--   alter table todotwo.task_nudge_responses
--     add constraint task_nudge_responses_response_check
--     check (response in ('took_charge', 'someone_else', 'another_day'));
