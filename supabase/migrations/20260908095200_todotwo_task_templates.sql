-- TodoTwo — reusable task template library
--
-- A template is a named, reusable bundle (title/description + ordered steps)
-- that staff can drop onto any day for any project, on demand. Distinct from
-- todotwo.clone_task (duplicates one existing occurrence) and from
-- todotwo.task_series (a date-driven recurrence rule): a template has no
-- recurrence of its own and is not tied to any prior occurrence.
--
-- NOTE ON SCOPE: at the time of writing, there is no existing manual
-- "create a task" entry point anywhere in TodoTwo — every task row today is
-- created either by series generation or by todotwo.clone_task(), both of
-- which require an existing task/series. todotwo.apply_task_template() is
-- therefore the FIRST manual, from-nothing task-creation path in the app.
-- Given that, its authorization is kept conservative (staff-only), rather
-- than deciding on a wider "anyone can create their own tasks" policy that
-- belongs to whichever feature actually introduces manual task creation.

-- ---------------------------------------------------------------------------
-- todotwo.task_templates
-- ---------------------------------------------------------------------------

create table todotwo.task_templates (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (length(trim(name)) > 0),
  description           text,
  default_project_id    uuid references todotwo.projects (id),
  created_by_person_id  uuid references todotwo.people (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

comment on table todotwo.task_templates is
  'A named, reusable task title/description + checklist, applied on demand '
  'via todotwo.apply_task_template(). Farm-wide, not per-creator: this is a '
  'shared staff tool, so the name is unique across the whole farm.';

-- Farm-wide uniqueness (case-insensitive), matching the shared-tool framing
-- above rather than scoping uniqueness to created_by_person_id.
create unique index task_templates_name_unique
  on todotwo.task_templates (lower(name))
  where deleted_at is null;

create trigger task_templates_touch_updated_at
  before update on todotwo.task_templates
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- todotwo.task_template_steps
-- ---------------------------------------------------------------------------

create table todotwo.task_template_steps (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references todotwo.task_templates (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  sort_order   numeric not null default 0
);

create index task_template_steps_template_id_idx
  on todotwo.task_template_steps (template_id);

-- ---------------------------------------------------------------------------
-- Traceability: which template (if any) a task was created from.
-- ---------------------------------------------------------------------------

alter table todotwo.tasks
  add column template_id uuid references todotwo.task_templates (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS — readable by every authenticated person, writable only by staff.
-- Same shape as todotwo.projects / todotwo.sections in
-- 20260902090100_todotwo_tasks_rls.sql.
-- ---------------------------------------------------------------------------

alter table todotwo.task_templates      enable row level security;
alter table todotwo.task_template_steps enable row level security;

alter table todotwo.task_templates      force row level security;
alter table todotwo.task_template_steps force row level security;

create policy task_templates_select on todotwo.task_templates
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

create policy task_templates_staff_insert on todotwo.task_templates
  for insert to authenticated
  with check (todotwo.is_staff());

create policy task_templates_staff_update on todotwo.task_templates
  for update to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_templates_staff_delete on todotwo.task_templates
  for delete to authenticated
  using (todotwo.is_staff());

create policy task_template_steps_select on todotwo.task_template_steps
  for select to authenticated
  using (todotwo.current_person_id() is not null);

create policy task_template_steps_staff_insert on todotwo.task_template_steps
  for insert to authenticated
  with check (todotwo.is_staff());

create policy task_template_steps_staff_update on todotwo.task_template_steps
  for update to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy task_template_steps_staff_delete on todotwo.task_template_steps
  for delete to authenticated
  using (todotwo.is_staff());

grant select, insert, update, delete on todotwo.task_templates      to authenticated;
grant select, insert, update, delete on todotwo.task_template_steps to authenticated;

revoke all on todotwo.task_templates      from anon;
revoke all on todotwo.task_template_steps from anon;

-- ---------------------------------------------------------------------------
-- todotwo.apply_task_template — creates one standalone task + its steps from
-- a template. Staff-only (see NOTE ON SCOPE above): this is the first manual
-- task-creation path in the app, so authorization is kept conservative
-- rather than widened on this feature's behalf.
--
-- Steps are copied as plain subtasks (child tasks) on the new task, mirroring
-- exactly how todotwo.clone_task() copies todotwo.task_series_steps into
-- child rows of todotwo.tasks — there is a single, existing per-occurrence
-- step-completion mechanism and this reuses it rather than inventing another.
-- ---------------------------------------------------------------------------

create or replace function todotwo.apply_task_template(
  p_template_id       uuid,
  p_project_id        uuid,
  p_section_id        uuid,
  p_due_date          date,
  p_assignee_person_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_template  todotwo.task_templates;
  v_new_id    uuid;
  v_step      record;
begin
  if not todotwo.is_staff() then
    raise exception 'Not allowed to apply a task template' using errcode = 'insufficient_privilege';
  end if;

  select * into v_template
  from todotwo.task_templates
  where id = p_template_id and deleted_at is null;

  if v_template.id is null then
    raise exception 'Template not found';
  end if;

  if p_project_id is null then
    raise exception 'A project is required';
  end if;

  insert into todotwo.tasks (
    project_id, section_id, title, description, status, due_date, template_id
  )
  values (
    p_project_id, p_section_id, v_template.name, v_template.description,
    case when p_assignee_person_id is not null then 'assigned' else 'unassigned' end,
    p_due_date, v_template.id
  )
  returning id into v_new_id;

  for v_step in
    select title, sort_order
    from todotwo.task_template_steps
    where template_id = p_template_id
    order by sort_order
  loop
    insert into todotwo.tasks (parent_task_id, title, status, sort_order, due_date)
    values (v_new_id, v_step.title, 'unassigned', v_step.sort_order, p_due_date);
  end loop;

  if p_assignee_person_id is not null then
    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    values (v_new_id, p_assignee_person_id, todotwo.current_person_id());
  end if;

  return v_new_id;
end;
$$;

revoke all on function todotwo.apply_task_template(uuid, uuid, uuid, date, uuid) from public, anon;
grant execute on function todotwo.apply_task_template(uuid, uuid, uuid, date, uuid) to authenticated;

-- ROLLBACK:
--   revoke all on function todotwo.apply_task_template(uuid, uuid, uuid, date, uuid) from authenticated;
--   drop function if exists todotwo.apply_task_template(uuid, uuid, uuid, date, uuid);
--   revoke all on todotwo.task_template_steps from authenticated;
--   revoke all on todotwo.task_templates from authenticated;
--   drop policy if exists task_template_steps_staff_delete on todotwo.task_template_steps;
--   drop policy if exists task_template_steps_staff_update on todotwo.task_template_steps;
--   drop policy if exists task_template_steps_staff_insert on todotwo.task_template_steps;
--   drop policy if exists task_template_steps_select on todotwo.task_template_steps;
--   drop policy if exists task_templates_staff_delete on todotwo.task_templates;
--   drop policy if exists task_templates_staff_update on todotwo.task_templates;
--   drop policy if exists task_templates_staff_insert on todotwo.task_templates;
--   drop policy if exists task_templates_select on todotwo.task_templates;
--   alter table todotwo.tasks drop column if exists template_id;
--   drop table if exists todotwo.task_template_steps;
--   drop table if exists todotwo.task_templates;
