-- TodoTwo — extending what an administrator can reach
--
-- Two deliberate exceptions to admin power are being changed, both at the
-- farm owner's explicit request. Recording the reasoning here because a
-- future reader will otherwise assume these were oversights and "fix" them
-- back.

-- ---------------------------------------------------------------------------
-- 1. The audit log becomes deletable by administrators
--
-- 20260901090000 made this table append-only on purpose, with the argument
-- that RLS alone was one layer where there should be two, and it revoked the
-- write grants as well as withholding the policies.
--
-- That argument still holds, and it is worth stating plainly what is being
-- given up: an administrator can now remove the record of their own actions,
-- including the record of the removal. The log stops being evidence of what
-- happened and becomes a list of things nobody minded keeping. It remains
-- useful for "what changed last Tuesday" and is no longer useful for "who
-- did this and tried to hide it".
--
-- The owner asked for full reach everywhere and this is their farm to run.
-- INSERT and UPDATE stay closed: an admin who can rewrite history rather than
-- merely erase it could forge a record of someone else acting, which nobody
-- asked for and which would be far worse.
-- ---------------------------------------------------------------------------

grant delete on todotwo.audit_log to authenticated;

create policy audit_log_admin_delete on todotwo.audit_log
  for delete to authenticated
  using (todotwo.is_admin());

comment on table todotwo.audit_log is
  'Written solely by todotwo.audit_trigger(). Admins hold SELECT and DELETE; nobody holds INSERT or UPDATE, so entries can be removed but never forged or altered.';

-- ---------------------------------------------------------------------------
-- 2. Administrators may delete a private note without reading it
--
-- task_private_notes is the one place staff deliberately cannot see: a
-- person's own scratchpad on a task, described to them as private. The owner
-- wants cleanup to be possible — a departed Workawayer's data, say — without
-- turning it into surveillance.
--
-- A plain DELETE policy would not achieve that. PostgREST can return the
-- deleted rows (`Prefer: return=representation`), so "delete" would quietly
-- become "read". Hence a function that deletes and returns nothing but a
-- count, and no DELETE policy on the table itself.
-- ---------------------------------------------------------------------------

create or replace function todotwo.admin_delete_private_notes(p_person_id uuid)
returns integer
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if not todotwo.is_admin() then
    raise exception 'Only an administrator may do that'
      using errcode = 'insufficient_privilege';
  end if;

  delete from todotwo.task_private_notes
   where person_id = p_person_id;

  get diagnostics v_deleted = row_count;

  -- Deliberately a count and never the rows. The whole point is that this
  -- removes notes without showing them to anybody.
  return v_deleted;
end;
$$;

comment on function todotwo.admin_delete_private_notes(uuid) is
  'Removes one person''s private task notes without disclosing their contents. Returns how many went. Admin only; there is no read path for anyone but the author.';

revoke all on function todotwo.admin_delete_private_notes(uuid) from public, anon;
grant execute on function todotwo.admin_delete_private_notes(uuid) to authenticated;

-- ROLLBACK:
--   drop function if exists todotwo.admin_delete_private_notes(uuid);
--   drop policy if exists audit_log_admin_delete on todotwo.audit_log;
--   revoke delete on todotwo.audit_log from authenticated;
--   comment on table todotwo.audit_log is
--     'Append-only. Written solely by todotwo.audit_trigger(). No role holds INSERT, UPDATE or DELETE; admins hold SELECT only. Enforced by both grants and RLS.';
