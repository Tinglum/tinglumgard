-- Run against the deployed schema. All fixture writes are rolled back.
begin;
do $$ declare v_member text; begin
  select p.auth_user_id::text into v_member from todotwo.people p
    where p.deleted_at is null and p.auth_user_id is not null
      and exists(select 1 from todotwo.role_assignments r where r.person_id=p.id and r.role='workawayer' and r.revoked_at is null)
    limit 1;
  perform set_config('request.jwt.claim.sub',v_member,true);
  perform set_config('test.other_member', (
    select p.auth_user_id::text from todotwo.people p where p.deleted_at is null and p.auth_user_id is not null and p.auth_user_id::text<>v_member
      and exists(select 1 from todotwo.role_assignments r where r.person_id=p.id and r.role='workawayer' and r.revoked_at is null) limit 1
  ), true);
end $$;
set local role authenticated;
do $$
declare v_id uuid; v_other text;
begin
  assert todotwo.current_person_id() is not null, 'Need a member fixture';
  assert not todotwo.is_staff(), 'Must test as an ordinary member';
  v_id := todotwo.save_farm_project('Planning verification',null,'2026-11-11','2026-11-15','approximate');
  assert (select planned_week='2026-11-09' and due_date_certainty='approximate' and status='unassigned' from todotwo.tasks_resolved where id=v_id), 'Project plan not saved';
  perform todotwo.save_farm_project('Planning verification',null,null,null,'definite',v_id);
  assert (select planned_week is null and due_date is null from todotwo.tasks_resolved where id=v_id), 'Could not move to later';
  begin
    perform todotwo.save_farm_project('Invalid',null,null,null,'uncertain');
    raise exception 'Invalid certainty was accepted';
  exception when raise_exception then
    if sqlerrm='Invalid certainty was accepted' then raise; end if;
  end;
  assert not exists(select 1 from todotwo.tasks_resolved t join todotwo.sections s on s.id=t.section_id where s.name='Recipes'), 'Recipes leaked into tasks';
  assert exists(select 1 from todotwo.tasks t join todotwo.sections s on s.id=t.section_id where s.name='Recipes' and t.deleted_at is null), 'Members cannot read recipes';
  v_other := current_setting('test.other_member');
  assert v_other is not null, 'Need a second member fixture';
  perform set_config('request.jwt.claim.sub',v_other,true);
  begin
    perform todotwo.save_farm_project('Unauthorized change',null,null,null,'definite',v_id);
    raise exception 'Another member could edit an unowned project';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
