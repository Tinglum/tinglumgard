-- TodoTwo — guest "what's happening today" board
--
-- A kiosk/link surface for a visitor with no account at all: no session, no
-- cookie, no `current_person_id()`. Everything else in this schema either
-- requires `authenticated` or is revoked from `anon` outright (see
-- 20260831090200_todotwo_rls.sql's "There is no `using (true)` policy
-- anywhere, and `anon` gets nothing", and F1 in
-- 20260903090400_todotwo_security_hardening.sql, where granting an
-- anon-callable function with variable input turned it into a membership
-- oracle).
--
-- This function is different in the one way that makes it safe to expose:
-- it takes ZERO parameters. Its output is identical for every caller on a
-- given minute, so there is no probing surface — nobody can feed it a guess
-- and learn something back. F1's function varied by an email address the
-- caller supplied; this one varies by nothing.
--
-- What it deliberately does NOT return, ever:
--   * no task id, project id, person id, or any other foreign key a client
--     could use to look up or act on something else
--   * no email, phone, full name, or any people/people_private column —
--     only a first name (preferred_name, falling back to the first word of
--     full_name)
--   * anything before or after today (server's own `current_date` at
--     Europe/Oslo, computed inside the function — never a client-supplied
--     date, so a caller cannot walk the calendar)
--   * more than 200 rows, so it cannot be used to enumerate task history
--
-- Checked for a private/sensitive-task concept before writing this: there is
-- no `is_sensitive` or similar flag on todotwo.tasks (grep confirms it — see
-- 20260902090000_todotwo_tasks.sql). The only existing sensitivity split is
-- people/people_private, and this function reads neither: it joins people
-- only for a first name, nothing else.

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
    t.title,
    p.name as project_name,
    coalesce(
      nullif(trim(split_part(coalesce(person.preferred_name, person.full_name), ' ', 1)), ''),
      'Someone'
    ) as first_name,
    t.status,
    case when t.due_at is not null then to_char(t.due_at at time zone 'Europe/Oslo', 'HH24:MI') end as due_time
  from todotwo.tasks t
  left join todotwo.projects p on p.id = t.project_id and p.deleted_at is null
  left join todotwo.task_assignments a
    on a.task_id = t.id and a.unassigned_at is null and a.role = 'assignee'
  left join todotwo.people person on person.id = a.person_id and person.deleted_at is null
  where t.deleted_at is null
    -- Server's own clock, in farm-local time. Never a client-supplied date.
    and t.due_date = (now() at time zone 'Europe/Oslo')::date
    and t.status not in ('draft', 'cancelled')
  order by t.due_at nulls last, t.sort_order
  limit 200;
$$;

comment on function todotwo.public_today_board() is
  'Anon-callable by design: zero parameters, so its output cannot be varied by a caller and cannot become a membership oracle like F1. Returns only title/project/first-name/status/due-time for today''s (server clock, Europe/Oslo) non-draft non-cancelled tasks, capped at 200 rows. No task id, no person id, no email, no full name. Never grant a parameterised variant of this to anon without re-reading F1 in 20260903090400_todotwo_security_hardening.sql first.';

revoke all on function todotwo.public_today_board() from public;
grant execute on function todotwo.public_today_board() to anon, authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.public_today_board();
