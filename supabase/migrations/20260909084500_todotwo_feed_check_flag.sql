-- TodoTwo — feed-sufficiency flag on evening animal routines
--
-- The feature is narrow and literal: "do we have enough food for the next two
-- days? should always be a question for the evening animals." That is a
-- per-routine flag, not a general inventory system (a bigger future phase, if
-- one is ever scoped) — so this adds one boolean rather than any stock model.
--
-- No existing signal identifies "an evening animal task" cleanly enough to key
-- off of. The Todoist import's "Daily Animals" project holds morning, noon and
-- evening feedings together (see tests/todotwo/unit/assignment.test.ts, which
-- builds a "Daily Animals" week with more than one time slot), so the project
-- alone would over-match. task_series.time_of_day is closer but is a fuzzy
-- "is this hour evening" heuristic staff would have no way to see or correct.
-- A boolean staff can toggle per-routine is unambiguous and auditable, and it
-- follows the exact inheritance mechanism already used for
-- requires_verification: a column on both task_series and tasks, resolved by
-- coalesce() in tasks_resolved so an occurrence override always wins and a
-- plain occurrence falls back to its series.

alter table todotwo.task_series
  add column requires_feed_check boolean not null default false;

alter table todotwo.tasks
  add column requires_feed_check boolean not null default false;

comment on column todotwo.task_series.requires_feed_check is
  'Staff-set flag for evening animal-feeding routines: completing an occurrence must answer "enough food for the next two days?" before it can be marked done. Inherited by occurrences via tasks_resolved.';
comment on column todotwo.tasks.requires_feed_check is
  'Per-occurrence override of task_series.requires_feed_check. Null-like default (false) means "defer to the series" only insofar as tasks_resolved coalesces the series value in when this stays false and the occurrence has a series; a one-off task can also set this directly.';

-- Reproduces tasks_resolved from 20260902090200_todotwo_task_series.sql plus
-- the new column, via create or replace (Postgres allows adding a trailing
-- column to a view this way without dropping it, which matters because other
-- concurrently-working migrations may also touch this view).
create or replace view todotwo.tasks_resolved
with (security_invoker = true)
as
select
  t.id,
  t.series_id,
  t.occurrence_date,
  coalesce(t.project_id, s.project_id)            as project_id,
  coalesce(t.section_id, s.section_id)            as section_id,
  t.parent_task_id,
  coalesce(t.title, s.title)                      as title,
  coalesce(t.description, s.description)          as description,
  (t.title is not null and t.series_id is not null) as is_overridden,
  t.status,
  coalesce(t.priority, s.priority)                as priority,
  t.due_date,
  t.due_at,
  t.all_day,
  coalesce(t.estimated_minutes, s.estimated_minutes) as estimated_minutes,
  t.actual_minutes,
  coalesce(t.location_id, s.location_id)          as location_id,
  coalesce(t.requires_verification, s.requires_verification) as requires_verification,
  t.completed_at,
  t.completed_by_person_id,
  t.sort_order,
  t.created_at,
  t.updated_at,
  (t.requires_feed_check or coalesce(s.requires_feed_check, false)) as requires_feed_check
from todotwo.tasks t
left join todotwo.task_series s on s.id = t.series_id
where t.deleted_at is null
  and (s.id is null or s.deleted_at is null);

comment on view todotwo.tasks_resolved is
  'Occurrences with series inheritance applied. security_invoker, so the caller''s RLS on todotwo.tasks still governs every row.';

-- ROLLBACK:
--   create or replace view todotwo.tasks_resolved
--   with (security_invoker = true)
--   as
--   select
--     t.id,
--     t.series_id,
--     t.occurrence_date,
--     coalesce(t.project_id, s.project_id)            as project_id,
--     coalesce(t.section_id, s.section_id)            as section_id,
--     t.parent_task_id,
--     coalesce(t.title, s.title)                      as title,
--     coalesce(t.description, s.description)          as description,
--     (t.title is not null and t.series_id is not null) as is_overridden,
--     t.status,
--     coalesce(t.priority, s.priority)                as priority,
--     t.due_date,
--     t.due_at,
--     t.all_day,
--     coalesce(t.estimated_minutes, s.estimated_minutes) as estimated_minutes,
--     t.actual_minutes,
--     coalesce(t.location_id, s.location_id)          as location_id,
--     coalesce(t.requires_verification, s.requires_verification) as requires_verification,
--     t.completed_at,
--     t.completed_by_person_id,
--     t.sort_order,
--     t.created_at,
--     t.updated_at
--   from todotwo.tasks t
--   left join todotwo.task_series s on s.id = t.series_id
--   where t.deleted_at is null
--     and (s.id is null or s.deleted_at is null);
--   alter table todotwo.tasks drop column if exists requires_feed_check;
--   alter table todotwo.task_series drop column if exists requires_feed_check;
