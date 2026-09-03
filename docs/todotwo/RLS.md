# TodoTwo — row level security

Hiding a button is not security. Every TodoTwo request goes through a session-bound client, so the policies below are what actually runs.

## Helpers

All `stable security definer` with a pinned `search_path`, executable by `authenticated` only.

| Function | Returns |
|---|---|
| `todotwo.current_person_id()` | the caller's `people.id`, or null |
| `todotwo.has_role(role)` | whether the caller holds an unrevoked role |
| `todotwo.is_admin()` | `super_admin` or `farm_admin` |
| `todotwo.is_staff()` | admin or `coordinator` |

`security definer` is needed because resolving your own roles otherwise requires reading `role_assignments`, which is itself policed by a policy that needs your roles. Indexes on `people(auth_user_id)` and `role_assignments(person_id, role)` keep them cheap.

## Policy map

| Table | Admin | Coordinator | Workawayer | Anon |
|---|---|---|---|---|
| `people` | all | select active, non-deleted | select own row | — |
| `people_private` | all | — | — | — |
| `role_assignments` | all | select own | select own | — |
| `locations` | all | select non-deleted | select non-deleted | — |
| `settings` | all | — | — | — |
| `audit_log` | select | — | — | — |

There is no `using (true)` policy anywhere, and `anon` holds no grant on any table.

## Two decisions worth knowing

**Sensitive fields are a separate table, not a column list.** `people` deliberately holds nothing a coordinator may not see. Emergency contacts and private notes live in `people_private`, which only admins have any policy on. This is why the coordinator's row policy can be simple: there is no column to filter. It also gives Phase 12's export and erasure work a single target.

**The audit log is append-only, at two layers.** Inserts arrive solely through `todotwo.audit_trigger()`, which is `security definer` and therefore not subject to policy. No update or delete policy exists for anyone, including admins, **and** no role holds the INSERT, UPDATE or DELETE privilege. Sensitive keys are replaced with `[redacted]` by `todotwo.redact()` before anything is written; extend that list whenever a sensitive column is added.

The second layer was added after a test failure. The bootstrap migration's `alter default privileges ... grant select, insert, update, delete` fired for every table created afterwards, `audit_log` included, so an admin's UPDATE was permitted to run and was stopped only by RLS reducing it to zero rows. Correct outcome, one layer too thin. `20260901090000_todotwo_audit_log_readonly.sql` revokes those privileges and narrows the default.

**Consequence for later phases: grant write access explicitly.** New tables in `todotwo` now default to `select` for `authenticated`. A table that needs inserts or updates must say so in its own migration:

```sql
grant select, insert, update, delete on todotwo.tasks to authenticated;
```

If a write 403s with a permission error rather than an RLS empty result, this is why.

## The pattern Phase 1 will need

RLS is row-level. It cannot express "this role may update only these columns". When a role needs partial write access — a Workawayer completing a task but not reassigning it — do **not** widen the table's update policy. Instead:

1. Deny that role `update` on the base table.
2. Add a `security definer` function that performs the narrow change and checks the caller's relationship to the row itself.
3. Grant `execute` on the function to `authenticated`.

Phase 1 will use this for `todotwo.complete_task()`, `start_task()` and `accept_task()`. Every such function must pin `search_path` and re-verify the caller; a `security definer` function that trusts its arguments is a privilege-escalation hole.

## Testing

`npm run test:rls` signs in as real fixture users — admin, coordinator, two Workawayers — and asserts what each can and cannot do. It refuses to run against the production ref, and skips cleanly when the dev credentials are absent rather than passing silently.

Current coverage: anonymous access denied on every table; `people_private` denied to coordinators and to Workawayers including their own row; cross-person reads denied; self-granted roles rejected; settings invisible to non-admins; audit log unreadable by non-admins, unmodifiable by everyone, correctly attributed and correctly redacted; and `public.orders` unreachable from a `todotwo`-bound client.
