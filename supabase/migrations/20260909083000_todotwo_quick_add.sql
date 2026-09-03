-- TodoTwo — quick add (voice / free-text) task creation
--
-- todotwo.create_task() is a genuine, minimal, generic manual task-creation
-- entry point: title required, everything else optional. It is the SECOND
-- manual task-creation path in the app after todotwo.apply_task_template()
-- (20260908095200_todotwo_task_templates.sql).
--
-- AUTHORIZATION DECISION: staff-only, same as apply_task_template.
--
-- Quick-add lets a person type or speak a sentence and have an AI layer turn
-- it into a real, unreviewed task — including, potentially, a task assigned
-- to someone other than the creator. apply_task_template's own note explains
-- why manual task creation was kept staff-only: "nothing else establishes who
-- else should get one." That reasoning applies here just as directly, and
-- quick-add specifically adds an AI-guessed assignee into the mix, which is a
-- second reason for caution, not a reason to relax the first. Letting any
-- Workawayer create arbitrary, farm-wide tasks (assigned to anyone) from a
-- sentence Claude parsed is a bigger product decision than this feature
-- should make unilaterally, so create_task carries exactly the same
-- todotwo.is_staff() gate as apply_task_template and assign_task. A
-- lesser-privileged "quick add a task assigned only to yourself" variant was
-- considered but rejected for this pass: it would still let any Workawayer
-- inject arbitrary, unreviewed tasks into shared projects/sections farm-wide
-- (only the assignee would be constrained), which is still a policy call
-- beyond what this feature should decide alone. Revisit as its own decision
-- if self-assigned quick-add turns out to be wanted.

create or replace function todotwo.create_task(
  p_title               text,
  p_description         text default null,
  p_project_id          uuid default null,
  p_section_id          uuid default null,
  p_due_date            date default null,
  p_assignee_person_id  uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_new_id uuid;
begin
  if not todotwo.is_staff() then
    raise exception 'Not allowed to create a task' using errcode = 'insufficient_privilege';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'A title is required';
  end if;

  insert into todotwo.tasks (
    project_id, section_id, title, description, status, due_date
  )
  values (
    p_project_id, p_section_id, trim(p_title), p_description,
    (case when p_assignee_person_id is not null then 'assigned' else 'unassigned' end)::todotwo.task_status,
    p_due_date
  )
  returning id into v_new_id;

  if p_assignee_person_id is not null then
    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    values (v_new_id, p_assignee_person_id, todotwo.current_person_id());
  end if;

  return v_new_id;
end;
$$;

revoke all on function todotwo.create_task(text, text, uuid, uuid, date, uuid) from public, anon;
grant execute on function todotwo.create_task(text, text, uuid, uuid, date, uuid) to authenticated;

-- ROLLBACK:
--   revoke all on function todotwo.create_task(text, text, uuid, uuid, date, uuid) from authenticated;
--   drop function if exists todotwo.create_task(text, text, uuid, uuid, date, uuid);
