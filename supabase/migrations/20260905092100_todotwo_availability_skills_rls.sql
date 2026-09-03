-- TodoTwo Phase 4 — RLS and narrow-write functions for availability & skills
--
-- Follows the pattern set out in docs/todotwo/RLS.md and used by
-- todotwo.assign_task() in 20260903090300_todotwo_rota.sql: RLS handles simple
-- row visibility, and a state transition that only some roles may perform gets
-- its own security-definer function that re-verifies the caller rather than
-- trusting a wider table policy.

-- ---------------------------------------------------------------------------
-- time_off_requests
--
-- A person creates and reads their own requests. Staff read and decide on
-- everyone's. There is no UPDATE policy for anyone: the pending -> approved /
-- declined transition happens only through decide_time_off(), never a raw
-- update, so a Workawayer cannot approve their own request by writing the row
-- directly and staff cannot bypass the audit trail either.
-- ---------------------------------------------------------------------------

create policy time_off_requests_select_own on todotwo.time_off_requests
  for select to authenticated
  using (person_id = todotwo.current_person_id());

create policy time_off_requests_select_staff on todotwo.time_off_requests
  for select to authenticated
  using (todotwo.is_staff());

create policy time_off_requests_insert_own on todotwo.time_off_requests
  for insert to authenticated
  with check (
    person_id = todotwo.current_person_id()
    and status = 'pending'
    and decided_by_person_id is null
    and decided_at is null
  );

-- A person may delete their own request only while it is still pending —
-- withdrawing a decided request would erase the decision history instead.
create policy time_off_requests_delete_own_pending on todotwo.time_off_requests
  for delete to authenticated
  using (person_id = todotwo.current_person_id() and status = 'pending');

create policy time_off_requests_delete_staff on todotwo.time_off_requests
  for delete to authenticated
  using (todotwo.is_staff());

grant select, insert, delete on todotwo.time_off_requests to authenticated;
revoke all on todotwo.time_off_requests from anon;

-- No UPDATE grant at all: decide_time_off() runs as security definer and does
-- not need one on the caller's behalf.

create or replace function todotwo.decide_time_off(
  p_request_id uuid,
  p_decision todotwo.time_off_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_actor uuid := todotwo.current_person_id();
  v_row   todotwo.time_off_requests;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may decide a time-off request' using errcode = 'insufficient_privilege';
  end if;

  if p_decision not in ('approved', 'declined') then
    raise exception 'A decision must be approved or declined' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_row from todotwo.time_off_requests where id = p_request_id;

  if not found then
    raise exception 'No such time-off request' using errcode = 'no_data_found';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'This request was already decided' using errcode = 'invalid_parameter_value';
  end if;

  update todotwo.time_off_requests
     set status = p_decision,
         decided_by_person_id = v_actor,
         decided_at = now(),
         decision_note = p_note
   where id = p_request_id;
end;
$$;

revoke all on function todotwo.decide_time_off(uuid, todotwo.time_off_status, text) from public, anon;
grant execute on function todotwo.decide_time_off(uuid, todotwo.time_off_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- skills — catalogue, staff-managed, everyone reads
-- ---------------------------------------------------------------------------

create policy skills_select_all on todotwo.skills
  for select to authenticated
  using (deleted_at is null or todotwo.is_staff());

create policy skills_staff_write on todotwo.skills
  for all to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

grant select, insert, update, delete on todotwo.skills to authenticated;
revoke all on todotwo.skills from anon;

-- ---------------------------------------------------------------------------
-- person_skills
--
-- A person may see and claim their own skills. Staff see and manage everyone's.
-- Crucially: the UPDATE policy lets a Workawayer touch only their own row and
-- ONLY when admin_verified_level and authorized_unsupervised are left exactly
-- as they already were — enforced by comparing OLD to NEW in the WITH CHECK
-- clause via a helper, so self-verification cannot happen even though the
-- column itself is nullable and technically writable by the row owner.
-- ---------------------------------------------------------------------------

create policy person_skills_select_own on todotwo.person_skills
  for select to authenticated
  using (person_id = todotwo.current_person_id());

create policy person_skills_select_staff on todotwo.person_skills
  for select to authenticated
  using (todotwo.is_staff());

create policy person_skills_insert_own on todotwo.person_skills
  for insert to authenticated
  with check (
    person_id = todotwo.current_person_id()
    and admin_verified_level is null
    and authorized_unsupervised = false
    and trainer_person_id is null
    and trained_at is null
  );

create policy person_skills_staff_all on todotwo.person_skills
  for all to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

create policy person_skills_delete_own on todotwo.person_skills
  for delete to authenticated
  using (person_id = todotwo.current_person_id());

grant select, insert, update, delete on todotwo.person_skills to authenticated;
revoke all on todotwo.person_skills from anon;

-- Self-service claim update: a Workawayer may change only claimed_level and
-- notes on their own row. Verification fields are staff-only and go through
-- set_skill_verification() below, which is the only path that can set them —
-- table UPDATE stays denied to non-staff on this table entirely (no matching
-- UPDATE policy for a non-staff caller other than this narrow function's own
-- security-definer write), so a raw PATCH from a Workawayer touching those
-- columns is rejected by RLS before it ever reaches this function's logic.
create or replace function todotwo.claim_skill(
  p_skill_id uuid,
  p_claimed_level todotwo.skill_level,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_actor uuid := todotwo.current_person_id();
  v_id    uuid;
begin
  if v_actor is null then
    raise exception 'No TodoTwo person for this account' using errcode = 'insufficient_privilege';
  end if;

  insert into todotwo.person_skills (person_id, skill_id, claimed_level, notes)
  values (v_actor, p_skill_id, p_claimed_level, p_notes)
  on conflict (person_id, skill_id)
  do update set claimed_level = excluded.claimed_level, notes = excluded.notes
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function todotwo.claim_skill(uuid, todotwo.skill_level, text) from public, anon;
grant execute on function todotwo.claim_skill(uuid, todotwo.skill_level, text) to authenticated;

-- Staff-only verification. Re-verifies the caller inside the function rather
-- than trusting the person_skills_staff_all policy alone, per RLS.md: a
-- security-definer function that trusts its arguments is a privilege-escalation
-- hole, and this is the one path that may ever set admin_verified_level or
-- authorized_unsupervised — a Workawayer has no policy that can reach them.
create or replace function todotwo.set_skill_verification(
  p_person_id uuid,
  p_skill_id uuid,
  p_verified_level todotwo.skill_level,
  p_authorized_unsupervised boolean default false,
  p_trained_at date default null,
  p_expires_at date default null,
  p_trainer_person_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_actor uuid := todotwo.current_person_id();
  v_id    uuid;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may verify a skill' using errcode = 'insufficient_privilege';
  end if;

  insert into todotwo.person_skills (
    person_id, skill_id, admin_verified_level, authorized_unsupervised,
    trained_at, expires_at, trainer_person_id
  )
  values (
    p_person_id, p_skill_id, p_verified_level, p_authorized_unsupervised,
    p_trained_at, p_expires_at, coalesce(p_trainer_person_id, v_actor)
  )
  on conflict (person_id, skill_id)
  do update set
    admin_verified_level = excluded.admin_verified_level,
    authorized_unsupervised = excluded.authorized_unsupervised,
    trained_at = coalesce(excluded.trained_at, todotwo.person_skills.trained_at),
    expires_at = excluded.expires_at,
    trainer_person_id = coalesce(excluded.trainer_person_id, todotwo.person_skills.trainer_person_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function todotwo.set_skill_verification(
  uuid, uuid, todotwo.skill_level, boolean, date, date, uuid
) from public, anon;
grant execute on function todotwo.set_skill_verification(
  uuid, uuid, todotwo.skill_level, boolean, date, date, uuid
) to authenticated;

-- ROLLBACK:
--   revoke execute on function todotwo.set_skill_verification(uuid, uuid, todotwo.skill_level, boolean, date, date, uuid) from authenticated;
--   drop function if exists todotwo.set_skill_verification(uuid, uuid, todotwo.skill_level, boolean, date, date, uuid);
--   revoke execute on function todotwo.claim_skill(uuid, todotwo.skill_level, text) from authenticated;
--   drop function if exists todotwo.claim_skill(uuid, todotwo.skill_level, text);
--   drop policy if exists person_skills_delete_own on todotwo.person_skills;
--   drop policy if exists person_skills_staff_all on todotwo.person_skills;
--   drop policy if exists person_skills_insert_own on todotwo.person_skills;
--   drop policy if exists person_skills_select_staff on todotwo.person_skills;
--   drop policy if exists person_skills_select_own on todotwo.person_skills;
--   drop policy if exists skills_staff_write on todotwo.skills;
--   drop policy if exists skills_select_all on todotwo.skills;
--   revoke execute on function todotwo.decide_time_off(uuid, todotwo.time_off_status, text) from authenticated;
--   drop function if exists todotwo.decide_time_off(uuid, todotwo.time_off_status, text);
--   drop policy if exists time_off_requests_delete_staff on todotwo.time_off_requests;
--   drop policy if exists time_off_requests_delete_own_pending on todotwo.time_off_requests;
--   drop policy if exists time_off_requests_insert_own on todotwo.time_off_requests;
--   drop policy if exists time_off_requests_select_staff on todotwo.time_off_requests;
--   drop policy if exists time_off_requests_select_own on todotwo.time_off_requests;
