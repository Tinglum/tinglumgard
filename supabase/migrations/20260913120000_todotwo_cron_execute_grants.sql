-- TodoTwo — let the scheduled jobs actually call the functions they use
--
-- assign_task and request_task_handoff are both `revoke all ... from public,
-- anon` followed by `grant execute ... to authenticated`. The scheduled jobs
-- connect as service_role, which is neither, so both calls come back
-- "permission denied for function" — and because the jobs log failures per
-- row rather than throwing, they have been failing quietly.
--
-- Two features were dead on this alone:
--
--   * the nightly assignment round, which could build a perfectly good plan
--     and then write none of it;
--   * the onboarding ramp, whose handover requests go through
--     request_task_handoff. It never worked even for people who had a
--     farm_start_date set, which until recently was nobody.
--
-- This is the same fault 20260904090300 fixed for the sign-in link
-- functions: revoking the PUBLIC default without re-granting to the one role
-- that actually calls it. Worth stating the general rule, since it has now
-- bitten three times — a security definer function called from cron needs an
-- explicit service_role grant, and revoking from public does not give you
-- one.
--
-- Granting EXECUTE to service_role is not a widening of what the outside
-- world can reach: service_role is the key held only by the server, never
-- shipped to a browser, and already bypasses RLS on every table. A function
-- it cannot call is not a security boundary, only a broken job.

grant execute on function todotwo.assign_task(uuid, uuid) to service_role;
grant execute on function todotwo.request_task_handoff(uuid, uuid, text) to service_role;

-- ROLLBACK:
--   revoke execute on function todotwo.assign_task(uuid, uuid) from service_role;
--   revoke execute on function todotwo.request_task_handoff(uuid, uuid, text) from service_role;
