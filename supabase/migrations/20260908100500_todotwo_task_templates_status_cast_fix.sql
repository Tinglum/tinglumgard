-- TodoTwo — fix todotwo.apply_task_template(): status literals need an
-- explicit cast to todotwo.task_status; assigning a bare text literal to that
-- column errors with "column \"status\" is of type task_status but
-- expression is of type text" once actually exercised.

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
    (case when p_assignee_person_id is not null then 'assigned' else 'unassigned' end)::todotwo.task_status,
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
    values (v_new_id, v_step.title, 'unassigned'::todotwo.task_status, v_step.sort_order, p_due_date);
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
--   Restores the previous (broken) body is not useful; rolling back this fix
--   means dropping the function entirely, same as
--   20260908095200_todotwo_task_templates.sql's own rollback.
--   drop function if exists todotwo.apply_task_template(uuid, uuid, uuid, date, uuid);
