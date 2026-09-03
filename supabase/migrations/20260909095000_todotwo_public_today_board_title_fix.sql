-- TodoTwo — fix the guest board reading null titles
--
-- 20260909091500_todotwo_public_today_board.sql read `t.title`/`t.project_id`
-- directly off todotwo.tasks. For a recurring occurrence, `title` and
-- `project_id` are usually null on the row itself — the actual instruction
-- lives on the series and is resolved by todotwo.tasks_resolved's coalesce()
-- (see 20260902090200_todotwo_task_series.sql: "a null title means 'inherit
-- from series'"). The guest board therefore showed a blank title for every
-- recurring task, which on this farm is nearly all of them.
--
-- Fix: select from tasks_resolved instead of tasks. tasks_resolved is
-- security_invoker, but that is irrelevant here since this function is
-- itself security definer and reads it with the definer's own privileges —
-- the view does no filtering beyond deleted_at, so nothing about the
-- function's safety properties (anon-callable, zero parameters, no ids,
-- 200-row cap) changes.

create or replace function todotwo.public_today_board()
returns table (
  title text,
  project_name text,
  first_name text,
  status todotwo.task_status,
  due_time text
)
language sql
stable
security definer
set search_path = todotwo, public
as $$
  select
    r.title,
    p.name as project_name,
    coalesce(
      nullif(trim(split_part(coalesce(person.preferred_name, person.full_name), ' ', 1)), ''),
      'Someone'
    ) as first_name,
    r.status,
    case when r.due_at is not null then to_char(r.due_at at time zone 'Europe/Oslo', 'HH24:MI') end as due_time
  from todotwo.tasks_resolved r
  left join todotwo.projects p on p.id = r.project_id and p.deleted_at is null
  left join todotwo.task_assignments a
    on a.task_id = r.id and a.unassigned_at is null and a.role = 'assignee'
  left join todotwo.people person on person.id = a.person_id and person.deleted_at is null
  where r.due_date = (now() at time zone 'Europe/Oslo')::date
    and r.status not in ('draft', 'cancelled')
  order by r.due_at nulls last, r.sort_order
  limit 200;
$$;

comment on function todotwo.public_today_board() is
  'Anon-callable by design: zero parameters, so its output cannot be varied by a caller and cannot become a membership oracle like F1. Reads todotwo.tasks_resolved so a recurring occurrence shows its series-inherited title, not a blank one. Returns only title/project/first-name/status/due-time for today''s (server clock, Europe/Oslo) non-draft non-cancelled tasks, capped at 200 rows. No task id, no person id, no email, no full name. Never grant a parameterised variant of this to anon without re-reading F1 in 20260903090400_todotwo_security_hardening.sql first.';

-- ROLLBACK:
--   create or replace function todotwo.public_today_board()
--   returns table (
--     title text,
--     project_name text,
--     first_name text,
--     status todotwo.task_status,
--     due_time text
--   )
--   language sql
--   stable
--   security definer
--   set search_path = todotwo, public
--   as $$
--     select
--       t.title,
--       p.name as project_name,
--       coalesce(
--         nullif(trim(split_part(coalesce(person.preferred_name, person.full_name), ' ', 1)), ''),
--         'Someone'
--       ) as first_name,
--       t.status,
--       case when t.due_at is not null then to_char(t.due_at at time zone 'Europe/Oslo', 'HH24:MI') end as due_time
--     from todotwo.tasks t
--     left join todotwo.projects p on p.id = t.project_id and p.deleted_at is null
--     left join todotwo.task_assignments a
--       on a.task_id = t.id and a.unassigned_at is null and a.role = 'assignee'
--     left join todotwo.people person on person.id = a.person_id and person.deleted_at is null
--     where t.deleted_at is null
--       and t.due_date = (now() at time zone 'Europe/Oslo')::date
--       and t.status not in ('draft', 'cancelled')
--     order by t.due_at nulls last, t.sort_order
--     limit 200;
--   $$;
