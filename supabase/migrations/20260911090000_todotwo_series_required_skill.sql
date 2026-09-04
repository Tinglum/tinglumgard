-- TodoTwo — an optional skill requirement on a routine
--
-- todotwo.person_skills has recorded claimed vs admin_verified_level and
-- authorized_unsupervised since 20260905092000, and nothing has ever consulted
-- it. The consequence is concrete: unsupervised goat milking can land on
-- someone who has never done it, because the assignment engine has no way to
-- know the task needs a skill at all.
--
-- The missing half is on the task side, so this adds it: a nullable skill
-- reference on a routine, inherited by its occurrences. Nullable and defaulting
-- to null on purpose — the overwhelming majority of farm work requires nothing
-- in particular, and a not-null column would force staff to answer a question
-- that usually has no answer.
--
-- The inheritance follows requires_feed_check (20260909084500) exactly: a
-- column on both task_series and tasks, resolved in tasks_resolved. The
-- difference is the resolver — requires_feed_check is a boolean and uses `or`,
-- this is a reference and uses coalesce(), so a per-occurrence value overrides
-- the series rather than adding to it. There is no way to say "this one
-- occurrence needs nothing" when the series needs something; that is a real
-- limitation, and the honest fix if it is ever wanted is a separate
-- "skill_requirement_waived" flag, not a sentinel UUID.
--
-- on delete set null rather than restrict: retiring a skill from the catalogue
-- should not be blocked by a routine that once referenced it, and a routine
-- that silently stops requiring a deleted skill is the safer failure — the
-- alternative is a requirement pointing at a skill nobody can be verified in,
-- which would make the task permanently unassignable.

alter table todotwo.task_series
  add column required_skill_id uuid references todotwo.skills (id) on delete set null;

alter table todotwo.tasks
  add column required_skill_id uuid references todotwo.skills (id) on delete set null;

comment on column todotwo.task_series.required_skill_id is
  'Optional skill a person must be authorized_unsupervised in before the assignment engine '
  'will put them on an occurrence of this routine. Null (the default) means no requirement. '
  'Inherited by occurrences via tasks_resolved.';
comment on column todotwo.tasks.required_skill_id is
  'Per-occurrence override of task_series.required_skill_id, coalesced in tasks_resolved so a '
  'value here wins over the series. A one-off task with no series can also set this directly.';

create index task_series_required_skill_idx
  on todotwo.task_series (required_skill_id)
  where required_skill_id is not null;

create index tasks_required_skill_idx
  on todotwo.tasks (required_skill_id)
  where required_skill_id is not null;

-- Reproduces tasks_resolved as of 20260909084500 plus the new column APPENDED.
-- The hard-won lesson recorded in that migration holds here too: create or
-- replace view can only add a trailing column, never insert one mid-list, or
-- Postgres rejects the whole statement. required_skill_id therefore goes last,
-- after requires_feed_check, even though it would read better next to
-- requires_verification.
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
  (t.requires_feed_check or coalesce(s.requires_feed_check, false)) as requires_feed_check,
  coalesce(t.required_skill_id, s.required_skill_id) as required_skill_id
from todotwo.tasks t
left join todotwo.task_series s on s.id = t.series_id
where t.deleted_at is null
  and (s.id is null or s.deleted_at is null);

comment on view todotwo.tasks_resolved is
  'Occurrences with series inheritance applied. security_invoker, so the caller''s RLS on todotwo.tasks still governs every row.';

-- No new grants or policies. task_series and tasks already carry
-- task_series_staff_update / the tasks staff policies from
-- 20260902090200_todotwo_task_series.sql, and a column added to an existing
-- table inherits the table's policies; adding a column-level grant here would
-- only narrow what staff can already do. tasks_resolved keeps its existing
-- `grant select ... to authenticated`.

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
--     t.updated_at,
--     (t.requires_feed_check or coalesce(s.requires_feed_check, false)) as requires_feed_check
--   from todotwo.tasks t
--   left join todotwo.task_series s on s.id = t.series_id
--   where t.deleted_at is null
--     and (s.id is null or s.deleted_at is null);
--   drop index if exists todotwo.tasks_required_skill_idx;
--   drop index if exists todotwo.task_series_required_skill_idx;
--   alter table todotwo.tasks drop column if exists required_skill_id;
--   alter table todotwo.task_series drop column if exists required_skill_id;
