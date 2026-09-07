-- TodoTwo — safe, farm-wide activity feed
--
-- The audit log contains complete before/after rows and remains admin-only.
-- This function turns a small allow-list of operational changes into plain
-- language, so every signed-in person can see what changed without gaining
-- access to private records or another person's delivery address.

create trigger task_help_requests_audit
  after insert or update or delete on todotwo.task_help_requests
  for each row execute function todotwo.audit_trigger();

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
    select * from personal_notifications
  ) feed
  order by occurred_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke all on function todotwo.activity_feed(integer) from public, anon;
grant execute on function todotwo.activity_feed(integer) to authenticated;

comment on function todotwo.activity_feed(integer) is
  'A redacted activity and personal notification feed for every signed-in TodoTwo user. Raw audit rows and other peoples notification delivery data remain inaccessible.';

-- ROLLBACK:
--   drop function if exists todotwo.activity_feed(integer);
--   drop trigger if exists task_help_requests_audit on todotwo.task_help_requests;
