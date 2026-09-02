-- TodoTwo Phase 2 — recurring routines
--
-- The point of this migration, in one sentence: one text, many days, a
-- different person each day.
--
-- The farm's Todoist holds each routine seven times, once per weekday, each
-- copy with its own subtasks. That is why "Feed George and Teddy" specifies two
-- scoops on Monday and one on Wednesday, and why the Kitchen routine has two
-- Wednesdays and no Tuesday. Editing the instructions means editing seven
-- copies, so in practice they drift apart.
--
-- Here the instructions live once, on the series. Occurrences are generated per
-- date and carry only what actually varies by day: who is doing it, whether it
-- is done, notes, and any deliberate one-day override. Correct the series text
-- once and every future day shows the correction.

-- ---------------------------------------------------------------------------
-- task_series — the definition. Edited once.
-- ---------------------------------------------------------------------------

create table todotwo.task_series (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid references todotwo.projects (id) on delete set null,
  section_id            uuid references todotwo.sections (id) on delete set null,

  title                 text not null check (length(trim(title)) > 0),
  description           text,
  priority              smallint not null default 4 check (priority between 1 and 4),

  -- iCalendar RRULE, expanded in farm-local wall time so an 07:00 routine stays
  -- 07:00 across both daylight-saving transitions.
  rrule                 text not null,
  starts_on             date not null,
  ends_on               date,
  -- Local time of day, null for an all-day routine.
  time_of_day           time,

  estimated_minutes     integer check (estimated_minutes > 0),
  location_id           uuid references todotwo.locations (id) on delete set null,
  requires_verification boolean not null default false,

  -- How far ahead occurrences are materialised by the generator.
  horizon_days          integer not null default 28 check (horizon_days between 1 and 365),
  is_active             boolean not null default true,

  -- The original text this came from, in whatever language it was written
  -- ("every Monday at 10am", "jeden Mo"). Kept so an import can be re-examined.
  source_text           text,

  created_by_person_id  uuid references todotwo.people (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint task_series_dates_ordered check (ends_on is null or starts_on <= ends_on)
);

create index task_series_active_idx on todotwo.task_series (is_active)
  where deleted_at is null;
create index task_series_project_idx on todotwo.task_series (project_id)
  where deleted_at is null;

create trigger task_series_touch_updated_at
  before update on todotwo.task_series
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- task_series_steps — the checklist, held once alongside the instructions
-- ---------------------------------------------------------------------------

create table todotwo.task_series_steps (
  id          uuid primary key default gen_random_uuid(),
  series_id   uuid not null references todotwo.task_series (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  description text,
  sort_order  numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index task_series_steps_series_idx on todotwo.task_series_steps (series_id, sort_order)
  where deleted_at is null;

create trigger task_series_steps_touch_updated_at
  before update on todotwo.task_series_steps
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Occurrences
--
-- tasks.title becomes nullable for series occurrences. A null title means
-- "whatever the series says" — which is what makes a single edit propagate. A
-- non-null title on an occurrence is a deliberate this-day-only override.
-- ---------------------------------------------------------------------------

alter table todotwo.tasks alter column title drop not null;

alter table todotwo.tasks
  add constraint tasks_title_or_series
  check (title is not null or series_id is not null);

alter table todotwo.tasks
  add column occurrence_date date;

alter table todotwo.tasks
  add constraint tasks_series_fk
  foreign key (series_id) references todotwo.task_series (id) on delete cascade;

-- Generation is idempotent: one occurrence per series per day, so a generator
-- that runs twice, or overlaps itself, cannot double-book anyone.
create unique index tasks_series_occurrence_unique
  on todotwo.tasks (series_id, occurrence_date)
  where series_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- task_exceptions — skipping one day without breaking the series
-- ---------------------------------------------------------------------------

create table todotwo.task_exceptions (
  id               uuid primary key default gen_random_uuid(),
  series_id        uuid not null references todotwo.task_series (id) on delete cascade,
  occurrence_date  date not null,
  reason           text,
  created_by_person_id uuid references todotwo.people (id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (series_id, occurrence_date)
);

-- ---------------------------------------------------------------------------
-- Resolved view
--
-- What the application reads. Occurrence values win where set; otherwise the
-- series supplies them. Every screen uses this rather than joining by hand, so
-- inheritance cannot be forgotten in one place and not another.
-- ---------------------------------------------------------------------------

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
  t.updated_at
from todotwo.tasks t
left join todotwo.task_series s on s.id = t.series_id
where t.deleted_at is null
  and (s.id is null or s.deleted_at is null);

comment on view todotwo.tasks_resolved is
  'Occurrences with series inheritance applied. security_invoker, so the caller''s RLS on todotwo.tasks still governs every row.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table todotwo.task_series       enable row level security;
alter table todotwo.task_series_steps enable row level security;
alter table todotwo.task_exceptions   enable row level security;

create policy task_series_admin_all on todotwo.task_series
  for all to authenticated
  using (todotwo.is_admin()) with check (todotwo.is_admin());

create policy task_series_staff_write on todotwo.task_series
  for insert to authenticated with check (todotwo.is_staff());

create policy task_series_staff_update on todotwo.task_series
  for update to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_series_select on todotwo.task_series
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

create policy task_series_steps_staff_all on todotwo.task_series_steps
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_series_steps_select on todotwo.task_series_steps
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

create policy task_exceptions_staff_all on todotwo.task_exceptions
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_exceptions_select on todotwo.task_exceptions
  for select to authenticated
  using (todotwo.current_person_id() is not null);

grant select, insert, update, delete on todotwo.task_series       to authenticated;
grant select, insert, update, delete on todotwo.task_series_steps to authenticated;
grant select, insert, update, delete on todotwo.task_exceptions   to authenticated;
grant select                          on todotwo.tasks_resolved   to authenticated;

revoke all on todotwo.task_series       from anon;
revoke all on todotwo.task_series_steps from anon;
revoke all on todotwo.task_exceptions   from anon;
revoke all on todotwo.tasks_resolved    from anon;

create trigger task_series_audit
  after insert or update or delete on todotwo.task_series
  for each row execute function todotwo.audit_trigger();

create trigger task_series_steps_audit
  after insert or update or delete on todotwo.task_series_steps
  for each row execute function todotwo.audit_trigger();

-- ROLLBACK:
--   drop view if exists todotwo.tasks_resolved;
--   drop table if exists todotwo.task_exceptions cascade;
--   drop table if exists todotwo.task_series_steps cascade;
--   drop index if exists todotwo.tasks_series_occurrence_unique;
--   alter table todotwo.tasks drop constraint if exists tasks_series_fk;
--   alter table todotwo.tasks drop constraint if exists tasks_title_or_series;
--   alter table todotwo.tasks drop column if exists occurrence_date;
--   alter table todotwo.tasks alter column title set not null;
--   drop table if exists todotwo.task_series cascade;
