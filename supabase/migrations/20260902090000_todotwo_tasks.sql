-- TodoTwo Phase 1 — task management core
--
-- Shaped by the real Todoist export rather than a guess. Three assumptions from
-- the original Phase 1 spec did not survive contact with it:
--
--   * Nesting is not two levels. "Make fire" sits three deep under
--     Chickens + Ducks, so depth is unbounded and the UI decides how far to
--     render.
--   * Recurrence rules arrive in three languages (DATE_LANG is en and de in the
--     export, and Norwegian is wanted), so the raw text is preserved alongside
--     any parsed rule.
--   * Priority is Todoist's, where 1 is most urgent and 4 is the default. The
--     export uses the same numbering, so it maps straight across.

-- Trigram search for the task title. Additive and idempotent: it enables an
-- extension in Supabase's own `extensions` schema and creates no object outside
-- `todotwo`. Search across ~500 tasks with typos in three languages needs more
-- than a prefix match.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type todotwo.task_status as enum (
  'draft',
  'unassigned',
  'assigned',
  'accepted',
  'in_progress',
  'blocked',
  'completed',
  'awaiting_verification',
  'verified',
  'not_completed',
  'cancelled'
);

comment on type todotwo.task_status is
  'awaiting_verification and verified are reachable only from Phase 2 onwards; Phase 1 has no path to them.';

create type todotwo.project_kind as enum ('list', 'farm_project', 'weekly_feature');

create type todotwo.assignment_role as enum ('assignee', 'supervisor');

create type todotwo.dependency_kind as enum ('blocks');

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table todotwo.projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  slug            text not null unique,
  description     text,
  kind            todotwo.project_kind not null default 'list',
  color           text,
  icon            text,
  location_id     uuid references todotwo.locations (id) on delete set null,
  owner_person_id uuid references todotwo.people (id) on delete set null,
  start_date      date,
  due_date        date,
  is_archived     boolean not null default false,
  sort_order      numeric not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint projects_dates_ordered check (start_date is null or due_date is null or start_date <= due_date)
);

create index projects_sort_idx on todotwo.projects (sort_order, name) where deleted_at is null;

create trigger projects_touch_updated_at
  before update on todotwo.projects
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- sections — the columns of a board, e.g. "Breakfast at 10am"
-- ---------------------------------------------------------------------------

create table todotwo.sections (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references todotwo.projects (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  sort_order numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index sections_project_idx on todotwo.sections (project_id, sort_order) where deleted_at is null;

create trigger sections_touch_updated_at
  before update on todotwo.sections
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table todotwo.tasks (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid references todotwo.projects (id) on delete set null,
  section_id            uuid references todotwo.sections (id) on delete set null,
  parent_task_id        uuid references todotwo.tasks (id) on delete cascade,

  title                 text not null check (length(trim(title)) > 0),
  description           text,

  status                todotwo.task_status not null default 'unassigned',
  -- Todoist numbering: 1 most urgent, 4 the default.
  priority              smallint not null default 4 check (priority between 1 and 4),

  due_date              date,
  due_at                timestamptz,
  all_day               boolean not null default true,

  estimated_minutes     integer check (estimated_minutes > 0),
  actual_minutes        integer check (actual_minutes > 0),

  location_id           uuid references todotwo.locations (id) on delete set null,
  created_by_person_id  uuid references todotwo.people (id) on delete set null,

  completed_at          timestamptz,
  completed_by_person_id uuid references todotwo.people (id) on delete set null,
  cancelled_at          timestamptz,
  cancel_reason         text,

  -- Fractional ordering: dragging a row between two others rewrites one number,
  -- not the whole list.
  sort_order            numeric not null default 0,

  -- Reserved for Phase 2. Unused here, but present so recurrence needs no
  -- rewrite of this table.
  series_id             uuid,
  requires_verification boolean not null default false,

  -- The original recurrence text, in whatever language it was written
  -- ("every Monday at 10am", "jeden 1. Mo"). Kept verbatim so Phase 2 can parse
  -- it without a second import, and so a rule we cannot parse is never lost.
  recurrence_text       text,
  recurrence_lang       text check (recurrence_lang is null or recurrence_lang in ('en', 'no', 'de')),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint tasks_not_own_parent check (parent_task_id is null or parent_task_id <> id),
  constraint tasks_completed_consistency check (
    (status in ('completed', 'verified')) = (completed_at is not null)
  ),
  constraint tasks_cancelled_consistency check (
    (status = 'cancelled') = (cancelled_at is not null)
  ),
  constraint tasks_timed_is_not_all_day check (due_at is null or all_day = false)
);

-- The working set: everything not finished, ordered by the day it is due.
create index tasks_open_due_idx on todotwo.tasks (due_date)
  where deleted_at is null and status not in ('completed', 'verified', 'cancelled');

create index tasks_project_idx on todotwo.tasks (project_id, sort_order) where deleted_at is null;
create index tasks_section_idx on todotwo.tasks (section_id, sort_order) where deleted_at is null;
create index tasks_parent_idx on todotwo.tasks (parent_task_id) where deleted_at is null;
create index tasks_status_idx on todotwo.tasks (status) where deleted_at is null;
create index tasks_series_idx on todotwo.tasks (series_id) where series_id is not null;
create index tasks_title_trgm_idx on todotwo.tasks using gin (title extensions.gin_trgm_ops);

create trigger tasks_touch_updated_at
  before update on todotwo.tasks
  for each row execute function todotwo.touch_updated_at();

-- due_date is derived from due_at rather than trusted from the caller, so a
-- timed task can never disagree with the day it appears on. Derived in farm
-- local time: 22:30 UTC in summer is already tomorrow in Oslo.
create or replace function todotwo.tasks_derive_due_date()
returns trigger
language plpgsql
as $$
begin
  if new.due_at is not null then
    new.due_date := (new.due_at at time zone 'Europe/Oslo')::date;
    new.all_day := false;
  end if;
  return new;
end;
$$;

create trigger tasks_derive_due_date
  before insert or update of due_at on todotwo.tasks
  for each row execute function todotwo.tasks_derive_due_date();

-- A subtask belongs to its parent's project. Enforced here rather than trusted
-- to every caller.
create or replace function todotwo.tasks_inherit_project()
returns trigger
language plpgsql
as $$
declare
  v_parent_project uuid;
begin
  if new.parent_task_id is null then
    return new;
  end if;

  select project_id into v_parent_project
  from todotwo.tasks
  where id = new.parent_task_id;

  new.project_id := v_parent_project;
  return new;
end;
$$;

create trigger tasks_inherit_project
  before insert or update of parent_task_id on todotwo.tasks
  for each row execute function todotwo.tasks_inherit_project();

-- ---------------------------------------------------------------------------
-- labels
-- ---------------------------------------------------------------------------

create table todotwo.labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) > 0),
  color      text,
  sort_order numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger labels_touch_updated_at
  before update on todotwo.labels
  for each row execute function todotwo.touch_updated_at();

create table todotwo.task_labels (
  task_id  uuid not null references todotwo.tasks (id) on delete cascade,
  label_id uuid not null references todotwo.labels (id) on delete cascade,
  primary key (task_id, label_id)
);

create index task_labels_label_idx on todotwo.task_labels (label_id);

-- ---------------------------------------------------------------------------
-- task_assignments — several people on one task is normal on a farm
-- ---------------------------------------------------------------------------

create table todotwo.task_assignments (
  id                   uuid primary key default gen_random_uuid(),
  task_id              uuid not null references todotwo.tasks (id) on delete cascade,
  person_id            uuid not null references todotwo.people (id) on delete cascade,
  role                 todotwo.assignment_role not null default 'assignee',
  assigned_by_person_id uuid references todotwo.people (id) on delete set null,
  assigned_at          timestamptz not null default now(),
  accepted_at          timestamptz,
  unassigned_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index task_assignments_active_unique
  on todotwo.task_assignments (task_id, person_id, role)
  where unassigned_at is null;

create index task_assignments_person_idx
  on todotwo.task_assignments (person_id)
  where unassigned_at is null;

create trigger task_assignments_touch_updated_at
  before update on todotwo.task_assignments
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- task_dependencies
-- ---------------------------------------------------------------------------

create table todotwo.task_dependencies (
  task_id            uuid not null references todotwo.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references todotwo.tasks (id) on delete cascade,
  kind               todotwo.dependency_kind not null default 'blocks',
  created_at         timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id)
);

create index task_dependencies_reverse_idx on todotwo.task_dependencies (depends_on_task_id);

-- Cycles make a dependency graph unschedulable, and the check is cheap.
create or replace function todotwo.task_dependencies_reject_cycle()
returns trigger
language plpgsql
as $$
declare
  v_cycle boolean;
begin
  with recursive reachable(id) as (
    select new.task_id
    union
    select d.task_id
    from todotwo.task_dependencies d
    join reachable r on d.depends_on_task_id = r.id
  )
  select exists (select 1 from reachable where id = new.depends_on_task_id)
  into v_cycle;

  if v_cycle then
    raise exception 'Dependency would create a cycle: % depends on %',
      new.task_id, new.depends_on_task_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger task_dependencies_reject_cycle
  before insert or update on todotwo.task_dependencies
  for each row execute function todotwo.task_dependencies_reject_cycle();

-- ---------------------------------------------------------------------------
-- task_comments
-- ---------------------------------------------------------------------------

create table todotwo.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references todotwo.tasks (id) on delete cascade,
  person_id  uuid references todotwo.people (id) on delete set null,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index task_comments_task_idx on todotwo.task_comments (task_id, created_at desc)
  where deleted_at is null;

create trigger task_comments_touch_updated_at
  before update on todotwo.task_comments
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- saved_views
-- ---------------------------------------------------------------------------

create table todotwo.saved_views (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references todotwo.people (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  filter     jsonb not null,
  sort_order numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index saved_views_person_name_unique on todotwo.saved_views (person_id, lower(name));

create trigger saved_views_touch_updated_at
  before update on todotwo.saved_views
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create trigger projects_audit
  after insert or update or delete on todotwo.projects
  for each row execute function todotwo.audit_trigger();

create trigger tasks_audit
  after insert or update or delete on todotwo.tasks
  for each row execute function todotwo.audit_trigger();

create trigger task_assignments_audit
  after insert or update or delete on todotwo.task_assignments
  for each row execute function todotwo.audit_trigger();

create trigger task_comments_audit
  after insert or update or delete on todotwo.task_comments
  for each row execute function todotwo.audit_trigger();

-- ROLLBACK:
--   drop table if exists todotwo.saved_views cascade;
--   drop table if exists todotwo.task_comments cascade;
--   drop table if exists todotwo.task_dependencies cascade;
--   drop table if exists todotwo.task_assignments cascade;
--   drop table if exists todotwo.task_labels cascade;
--   drop table if exists todotwo.labels cascade;
--   drop table if exists todotwo.tasks cascade;
--   drop table if exists todotwo.sections cascade;
--   drop table if exists todotwo.projects cascade;
--   drop function if exists todotwo.task_dependencies_reject_cycle();
--   drop function if exists todotwo.tasks_inherit_project();
--   drop function if exists todotwo.tasks_derive_due_date();
--   drop type if exists todotwo.dependency_kind;
--   drop type if exists todotwo.assignment_role;
--   drop type if exists todotwo.project_kind;
--   drop type if exists todotwo.task_status;
