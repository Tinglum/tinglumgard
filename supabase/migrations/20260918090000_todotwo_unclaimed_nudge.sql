-- TodoTwo — chasing the jobs nobody picked up
--
-- Up for grabs works right up until nobody grabs anything. The list sits there
-- all day, everyone assumes somebody else has it, and at eleven at night the
-- pigs still have not been sorted. Nothing in the app noticed, because nothing
-- was watching: an unclaimed task is indistinguishable from a task nobody has
-- got to yet.
--
-- So late in the evening the app asks. Not "will you do this" — that is the
-- question people dodge — but "who is taking charge of it", which is a smaller
-- thing to say yes to and the thing that actually needs deciding. Taking
-- charge means making sure it happens, not doing it single-handed.
--
-- Three answers, because two would force a lie. Somebody who knows a
-- housemate already has it in hand must be able to say so without claiming it
-- themselves, and a job that genuinely should wait must be able to move
-- without anybody pretending they will do it tonight.

create table todotwo.task_nudge_responses (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references todotwo.tasks (id) on delete cascade,
  person_id  uuid not null references todotwo.people (id) on delete cascade,
  -- The farm day being asked about, so tomorrow's asking starts clean.
  for_date   date not null,
  response   text not null
             check (response in ('took_charge', 'someone_else', 'another_day')),
  created_at timestamptz not null default now(),
  unique (task_id, person_id, for_date)
);

create index task_nudge_responses_day_idx
  on todotwo.task_nudge_responses (for_date, task_id);

alter table todotwo.task_nudge_responses enable row level security;

-- Everyone sees the answers. That is the entire point: the reason to ask the
-- group is so the group can see who spoke up.
create policy task_nudge_responses_select on todotwo.task_nudge_responses
  for select to authenticated
  using (todotwo.current_person_id() is not null);

grant select on todotwo.task_nudge_responses to authenticated;
revoke all on todotwo.task_nudge_responses from anon;

comment on table todotwo.task_nudge_responses is
  'What somebody answered when asked about an unclaimed task at the end of the day. Written only through record_nudge_response.';

-- ---------------------------------------------------------------------------
-- Moving an unclaimed job to another day
-- ---------------------------------------------------------------------------

create or replace function todotwo.defer_task(p_task_id uuid, p_new_date date)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_task   todotwo.tasks;
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

  -- Only unheld work. Once somebody has a task it is theirs to move, and
  -- reschedule_occurrence already covers that with the right permissions.
  -- Letting anyone push a held job into next week would be a way to quietly
  -- undo somebody else's plan.
  if exists (
    select 1 from todotwo.task_assignments
     where task_id = p_task_id and unassigned_at is null and role = 'assignee'
  ) then
    raise exception 'Somebody has taken that one on — ask them to move it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_task.due_date is not null and p_new_date <= v_task.due_date then
    raise exception 'A task can only be pushed forwards' using errcode = 'check_violation';
  end if;

  -- due_at is cleared rather than dragged along: a 07:00 tied to today means
  -- nothing on a date somebody picked by hand, and leaving it would let
  -- tasks_derive_due_date pull due_date back to the old day.
  update todotwo.tasks
     set due_date = p_new_date,
         due_at = null
   where id = p_task_id;
end;
$$;

comment on function todotwo.defer_task(uuid, date) is
  'Pushes an unclaimed task to a later day. Any signed-in member may do this; a task somebody already holds is theirs to move.';

revoke all on function todotwo.defer_task(uuid, date) from public, anon;
grant execute on function todotwo.defer_task(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Answering the end-of-day question
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

  if p_response not in ('took_charge', 'someone_else', 'another_day') then
    raise exception 'Unknown answer: %', p_response using errcode = 'check_violation';
  end if;

  -- Recorded first and unconditionally, so that even an answer whose action
  -- then fails stops this person being asked the same question again tonight.
  insert into todotwo.task_nudge_responses (task_id, person_id, for_date, response)
  values (p_task_id, v_person, v_today, p_response)
  on conflict (task_id, person_id, for_date)
    do update set response = excluded.response, created_at = now();

  if p_response = 'took_charge' then
    perform todotwo.claim_task(p_task_id);
  elsif p_response = 'another_day' then
    perform todotwo.defer_task(p_task_id, v_today + 1);
  end if;
  -- 'someone_else' changes nothing about the task on purpose. It is one
  -- person saying "not me, and I believe it is handled", which is a statement
  -- about them, not about the work.
end;
$$;

comment on function todotwo.record_nudge_response(uuid, text) is
  'Answers the end-of-day question about an unclaimed task: take charge, believe somebody else has, or move it to another day.';

revoke all on function todotwo.record_nudge_response(uuid, text) from public, anon;
grant execute on function todotwo.record_nudge_response(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Showing it in the feed
-- ---------------------------------------------------------------------------
--
-- Read straight from the table rather than through audit_log. These rows are
-- already plain language — who, which task, what they said — and routing them
-- through the audit mapping would mean reconstructing that from JSON for no
-- gain.

create or replace function todotwo.activity_feed(p_limit integer default 100)
returns table (
  event_id text,
  occurred_at timestamptz,
  actor_name text,
  event_type text,
  title text,
  detail text,
  task_id uuid
)
language sql
security definer
stable
set search_path = todotwo, public, pg_temp
as $$
  with audit_events as (
    select
      'audit:' || a.id::text as event_id,
      a.occurred_at,
      coalesce(p.preferred_name, p.full_name, 'TodoTwo') as actor_name,
      a.entity_table || '.' || a.action::text as event_type,
      case
        when a.entity_table = 'tasks' and a.action = 'insert' then 'New task added'
        when a.entity_table = 'tasks' and a.action = 'update'
          and a.before->>'status' is distinct from a.after->>'status'
          then case
            when a.after->>'status' in ('completed', 'verified') then 'Task completed'
            when a.after->>'status' = 'cancelled' then 'Task cancelled'
            else 'Task status changed'
          end
        when a.entity_table = 'tasks' then 'Task changed'
        when a.entity_table = 'task_assignments' and a.action = 'insert' then 'Task assigned'
        when a.entity_table = 'task_assignments' then 'Task assignment changed'
        when a.entity_table = 'task_help_requests' and a.action = 'insert' then 'Help requested'
        when a.entity_table = 'task_help_requests' and a.after->>'status' = 'taken' then 'Help request taken'
        when a.entity_table = 'task_help_requests' then 'Help request changed'
        when a.entity_table = 'announcements' and a.action = 'insert' then 'New notice added'
        when a.entity_table = 'announcements' then 'Notice changed'
        when a.entity_table = 'task_series' and a.action = 'insert' then 'New routine added'
        when a.entity_table = 'task_series' then 'Routine changed'
        when a.entity_table = 'projects' and a.action = 'insert' then 'New project added'
        when a.entity_table = 'projects' then 'Project changed'
        when a.entity_table = 'time_off_requests' and a.action = 'insert' then 'Time off requested'
        when a.entity_table = 'time_off_requests' then 'Time off request changed'
        when a.entity_table = 'stays' and a.action = 'insert' then 'Stay added'
        when a.entity_table = 'stays' then 'Stay changed'
        when a.entity_table = 'people' and a.action = 'insert' then 'Person added'
        else 'Person changed'
      end as title,
      case
        when a.entity_table = 'tasks' then
          coalesce(a.after->>'title', a.before->>'title', 'Untitled task') ||
          case when coalesce(a.after->>'due_date', a.before->>'due_date') is not null
            then ' · ' || coalesce(a.after->>'due_date', a.before->>'due_date') else '' end
        when a.entity_table in ('task_assignments', 'task_help_requests') then
          coalesce((select t.title from todotwo.tasks t
                    where t.id = coalesce(a.after->>'task_id', a.before->>'task_id')::uuid), 'Task')
        when a.entity_table = 'announcements' then
          coalesce(a.after->>'title', a.before->>'title', 'Notice')
        when a.entity_table = 'task_series' then
          coalesce(a.after->>'title', a.before->>'title', 'Routine')
        when a.entity_table = 'projects' then
          coalesce(a.after->>'name', a.before->>'name', 'Project')
        when a.entity_table = 'people' then
          coalesce(a.after->>'preferred_name', a.after->>'full_name', a.before->>'preferred_name', a.before->>'full_name', 'Person')
        when a.entity_table = 'time_off_requests' then
          concat_ws(' – ', coalesce(a.after->>'starts_on', a.before->>'starts_on'), coalesce(a.after->>'ends_on', a.before->>'ends_on'))
        when a.entity_table = 'stays' then
          concat_ws(' – ', coalesce(a.after->>'starts_on', a.before->>'starts_on'), coalesce(a.after->>'ends_on', a.before->>'ends_on'))
        else null
      end as detail,
      case
        when a.entity_table = 'tasks' then a.entity_id
        when a.entity_table in ('task_assignments', 'task_help_requests')
          then coalesce(a.after->>'task_id', a.before->>'task_id')::uuid
        else null
      end as task_id
    from todotwo.audit_log a
    left join todotwo.people p on p.id = a.actor_person_id
    where a.entity_table in (
      'tasks', 'task_assignments', 'task_help_requests', 'announcements',
      'task_series', 'projects', 'time_off_requests', 'stays', 'people'
    )
      and todotwo.current_person_id() is not null
  ), nudge_events as (
    select
      'nudge:' || r.id::text,
      r.created_at,
      coalesce(p.preferred_name, p.full_name, 'Somebody') as actor_name,
      'nudge.' || r.response,
      case r.response
        when 'took_charge' then 'Took charge of an unclaimed job'
        when 'another_day' then 'Moved an unclaimed job to another day'
        else 'Said somebody else has it in hand'
      end,
      coalesce(t.title, 'Task') || ' · ' || r.for_date::text,
      r.task_id
    from todotwo.task_nudge_responses r
    left join todotwo.people p on p.id = r.person_id
    left join todotwo.tasks t on t.id = r.task_id
    where todotwo.current_person_id() is not null
      -- "Somebody else has it" is one person's private pass, not news.
      and r.response in ('took_charge', 'another_day')
  ), personal_notifications as (
    select
      'notification:' || n.id::text,
      n.created_at,
      'TodoTwo'::text,
      'notification.' || n.topic,
      n.subject,
      n.body,
      null::uuid
    from todotwo.notification_outbox n
    where n.person_id = todotwo.current_person_id()
  )
  select *
  from (
    select * from audit_events
    union all
    select * from nudge_events
    union all
    select * from personal_notifications
  ) feed
  order by occurred_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke all on function todotwo.activity_feed(integer) from public, anon;
grant execute on function todotwo.activity_feed(integer) to authenticated;

-- ROLLBACK:
--   (activity_feed reverts to the definition in
--    20260916090000_todotwo_activity_feed.sql — re-run that file's function)
--   drop function if exists todotwo.record_nudge_response(uuid, text);
--   drop function if exists todotwo.defer_task(uuid, date);
--   drop table if exists todotwo.task_nudge_responses;
