-- TodoTwo — restore service-role access to the sign-in link functions
--
-- 20260903090400 (security hardening) revoked default PUBLIC execute access
-- from every security-definer function to close a real hole: PostgreSQL grants
-- EXECUTE to PUBLIC automatically on function creation, and that migration's
-- `revoke ... from public` correctly removed it everywhere.
--
-- 20260903090200 made the same mistake in the opposite direction:
-- email_is_invited revoked from public and re-granted only to anon and
-- authenticated, and claim_link_request (20260904090200) revoked from
-- public, anon and authenticated and granted to nobody at all. Neither
-- migration granted execute to service_role — the one role that actually
-- calls both functions, from lib/todotwo/auth-admin.ts on the server.
--
-- The result: every sign-in link request has failed with a Postgres
-- permission error since these migrations landed, which
-- lib/todotwo/auth-admin.ts treats as "not allowed" by design (fail closed).
-- That fail-closed behaviour was doing its job; it just had nothing correct
-- underneath it to fall back to.

grant execute on function todotwo.email_is_invited(text) to service_role;
grant execute on function todotwo.claim_link_request(text, text, integer, integer) to service_role;

-- ROLLBACK:
--   revoke execute on function todotwo.claim_link_request(text, text, integer, integer) from service_role;
--   revoke execute on function todotwo.email_is_invited(text) from service_role;
