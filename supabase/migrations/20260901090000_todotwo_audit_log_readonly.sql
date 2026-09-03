-- TodoTwo Phase 0 — make the audit log genuinely append-only
--
-- Found by tests/todotwo/rls/policies.test.ts: an admin's UPDATE against
-- todotwo.audit_log returned no error. No rows changed — there is no UPDATE
-- policy, so RLS reduced it to zero rows — but the statement was permitted to
-- run at all, which it should not have been.
--
-- Cause: the bootstrap migration set
--   alter default privileges in schema todotwo
--     grant select, insert, update, delete on tables to authenticated;
-- which fires for every table created afterwards, audit_log included. The
-- later `grant select on todotwo.audit_log to authenticated` added a privilege
-- but never removed the three the default already handed out.
--
-- RLS was the only thing standing between an admin and a rewritten audit
-- trail. That is one layer where there should be two: if a future migration
-- adds a permissive policy, or disables RLS while debugging, the grants alone
-- would allow the log to be edited.

revoke insert, update, delete, truncate on todotwo.audit_log from authenticated;
revoke insert, update, delete, truncate on todotwo.audit_log from anon;

-- The trigger writes through a security definer function owned by the
-- migration role, so inserts still work. Nothing else may write here.

comment on table todotwo.audit_log is
  'Append-only. Written solely by todotwo.audit_trigger(). No role holds INSERT, UPDATE or DELETE; admins hold SELECT only. Enforced by both grants and RLS.';

-- Stop the same default from over-granting future append-only tables. Tables
-- that need write access get it explicitly, which is the rule the rest of the
-- schema already follows.
alter default privileges in schema todotwo
  revoke insert, update, delete on tables from authenticated;

alter default privileges in schema todotwo
  grant select on tables to authenticated;

-- ROLLBACK:
--   alter default privileges in schema todotwo
--     grant select, insert, update, delete on tables to authenticated;
--   grant select on todotwo.audit_log to authenticated;
