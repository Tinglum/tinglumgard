alter table todotwo.tasks
  add column planned_week date,
  add column due_date_certainty text not null default 'definite'
    check (due_date_certainty in ('definite', 'approximate')),
  add constraint tasks_planned_week_monday check (planned_week is null or extract(isodow from planned_week) = 1);

-- Append fields without changing existing view columns, grants or RLS behavior.
create or replace view todotwo.tasks_resolved with (security_invoker = true) as
select t.id, t.series_id, t.occurrence_date,
  coalesce(t.project_id,s.project_id) project_id, coalesce(t.section_id,s.section_id) section_id,
  t.parent_task_id, coalesce(t.title,s.title) title, coalesce(t.description,s.description) description,
  (t.title is not null and t.series_id is not null) is_overridden, t.status,
  coalesce(t.priority,s.priority) priority, t.due_date,t.due_at,t.all_day,
  coalesce(t.estimated_minutes,s.estimated_minutes) estimated_minutes,t.actual_minutes,
  coalesce(t.location_id,s.location_id) location_id,
  coalesce(t.requires_verification,s.requires_verification) requires_verification,
  t.completed_at,t.completed_by_person_id,t.sort_order,t.created_at,t.updated_at,
  (t.requires_feed_check or coalesce(s.requires_feed_check,false)) requires_feed_check,
  coalesce(t.required_skill_id,s.required_skill_id) required_skill_id,
  t.planned_week,t.due_date_certainty,t.created_by_person_id
from todotwo.tasks t left join todotwo.task_series s on s.id=t.series_id
where t.deleted_at is null and (s.id is null or s.deleted_at is null)
  and not exists (select 1 from todotwo.sections r where r.id=coalesce(t.section_id,s.section_id) and r.name='Recipes');

-- A narrow member entry point: only one-off, top-level farm projects.
-- Definer is intentional: members cannot write arbitrary tasks through RLS.
create function todotwo.save_farm_project(
  p_title text, p_description text default null, p_planned_week date default null,
  p_due_date date default null, p_due_date_certainty text default 'definite', p_task_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := todotwo.current_person_id();
  v_project uuid;
  v_task uuid;
begin
  if v_person is null then raise exception 'Sign in to add a project' using errcode='42501'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 500 or length(coalesce(p_description,''))>10000 then
    raise exception 'Enter a project name (up to 500 characters) and a shorter description';
  end if;
  if p_due_date_certainty is null or p_due_date_certainty not in ('definite','approximate') then raise exception 'Choose definite or approximate'; end if;
  select id into v_project from todotwo.projects where slug='tinglum-farm-tasks' and deleted_at is null;
  if v_project is null then raise exception 'Farm project list is unavailable'; end if;
  if p_task_id is null then
    insert into todotwo.tasks(project_id,title,description,planned_week,due_date,due_date_certainty,created_by_person_id)
    values(v_project,trim(p_title),p_description,date_trunc('week',p_planned_week::timestamp)::date,p_due_date,p_due_date_certainty,v_person)
    returning id into v_task;
  else
    select t.id into v_task from todotwo.tasks t
    where t.id=p_task_id and t.project_id=v_project and t.series_id is null and t.parent_task_id is null and t.deleted_at is null
      and not exists(select 1 from todotwo.sections s where s.id=t.section_id and s.name='Recipes')
      and (todotwo.is_staff() or t.created_by_person_id=v_person or exists(
        select 1 from todotwo.task_assignments a where a.task_id=t.id and a.person_id=v_person and a.role='assignee' and a.unassigned_at is null))
    for update;
    if v_task is null then raise exception 'You can edit only your own projects or projects you hold' using errcode='42501'; end if;
    update todotwo.tasks set title=trim(p_title), description=p_description,
      planned_week=date_trunc('week',p_planned_week::timestamp)::date, due_date=p_due_date,
      due_at=null,all_day=true,due_date_certainty=p_due_date_certainty where id=v_task;
  end if;
  return v_task;
end;
$$;
revoke all on function todotwo.save_farm_project(text,text,date,date,text,uuid) from public,anon;
grant execute on function todotwo.save_farm_project(text,text,date,date,text,uuid) to authenticated;
notify pgrst, 'reload schema';

-- ROLLBACK: non-destructive application rollback
-- drop function todotwo.save_farm_project(text,text,date,date,text,uuid);
-- Keep the additive planning columns/view fields to preserve members' saved
-- dates; the previous application ignores them. Recipes remain readable from
-- their original tasks/sections rows. Restore their inclusion in work lists,
-- if needed, by recreating the view above without the final NOT EXISTS clause.
