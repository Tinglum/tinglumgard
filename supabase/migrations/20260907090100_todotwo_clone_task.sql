-- TodoTwo — task duplicate/clone (MVP: single task, not series)
--
-- Clones one task occurrence — title, description, project/section, labels,
-- and its steps — into a brand new standalone task, defaulting to the same
-- due date and assignee unless overridden.
--
-- Steps are copied as plain subtasks (child tasks) on the clone regardless of
-- whether the source's steps came from a series template or were already
-- subtasks: todotwo.task_series_steps belongs to the *series*, not the
-- occurrence, and the clone is deliberately a standalone task (series_id is
-- not copied) — so there is no template for it to share steps with. Cloning
-- an entire series, so the clone stays a recurring routine of its own, is
-- left as a follow-up (see report).

create or replace function todotwo.clone_task(
  p_task_id      uuid,
  p_due_date     date default null,
  p_assignee_id  uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_source        todotwo.tasks;
  v_source_title  text;
  v_new_id        uuid;
  v_due_date      date;
  v_step          record;
begin
  select * into v_source from todotwo.tasks where id = p_task_id and deleted_at is null;
  if v_source.id is null then
    raise exception 'Task not found';
  end if;

  if not (todotwo.is_staff() or todotwo.is_task_assignee(p_task_id)) then
    raise exception 'Not allowed to duplicate this task' using errcode = 'insufficient_privilege';
  end if;

  -- Resolved title: an occurrence with no title of its own inherits from its
  -- series, and the clone must carry real text since it will not be attached
  -- to that series.
  select coalesce(v_source.title, ts.title) into v_source_title
  from todotwo.task_series ts
  where ts.id = v_source.series_id;
  v_source_title := coalesce(v_source_title, v_source.title);

  v_due_date := coalesce(p_due_date, v_source.due_date);

  insert into todotwo.tasks (
    project_id, section_id, title, description, status, priority,
    due_date, due_at, all_day, estimated_minutes, location_id, sort_order
  )
  values (
    v_source.project_id, v_source.section_id, v_source_title, v_source.description,
    case when p_assignee_id is not null then 'assigned' else 'unassigned' end,
    v_source.priority,
    v_due_date,
    case when v_due_date = v_source.due_date then v_source.due_at else null end,
    v_source.all_day, v_source.estimated_minutes, v_source.location_id, v_source.sort_order
  )
  returning id into v_new_id;

  -- Labels.
  insert into todotwo.task_labels (task_id, label_id)
  select v_new_id, label_id from todotwo.task_labels where task_id = p_task_id;

  -- Steps: series-template steps (if any), else the source's own subtasks —
  -- either way copied as plain subtasks on the clone.
  if v_source.series_id is not null then
    for v_step in
      select title, description, sort_order
      from todotwo.task_series_steps
      where series_id = v_source.series_id
      order by sort_order
    loop
      insert into todotwo.tasks (parent_task_id, title, description, status, sort_order, due_date)
      values (v_new_id, v_step.title, v_step.description, 'unassigned', v_step.sort_order, v_due_date);
    end loop;
  else
    for v_step in
      select title, description, sort_order, status
      from todotwo.tasks
      where parent_task_id = p_task_id and deleted_at is null
      order by sort_order
    loop
      insert into todotwo.tasks (parent_task_id, title, description, status, sort_order, due_date)
      values (v_new_id, v_step.title, v_step.description, 'unassigned', v_step.sort_order, v_due_date);
    end loop;
  end if;

  -- Assignee: explicit override, else the source's current holder.
  if p_assignee_id is not null then
    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    values (v_new_id, p_assignee_id, todotwo.current_person_id());
  else
    insert into todotwo.task_assignments (task_id, person_id, assigned_by_person_id)
    select v_new_id, ta.person_id, todotwo.current_person_id()
    from todotwo.task_assignments ta
    where ta.task_id = p_task_id and ta.unassigned_at is null;
  end if;

  return v_new_id;
end;
$$;

revoke all on function todotwo.clone_task(uuid, date, uuid) from public, anon;
grant execute on function todotwo.clone_task(uuid, date, uuid) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.clone_task(uuid, date, uuid);
