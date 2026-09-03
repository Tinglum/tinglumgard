# TodoTwo — deployment readiness audit and runbook

Audit date: 2026-09-03
Branch audited: `todotwo/phase-0-foundation` (head `ca6f368b`)
Target: `https://tinglumgård.no/todotwo` (`https://xn--tinglumgrd-85a.no/todotwo`)
Production Supabase ref: `dofhlyvexecwlqmrzutd` — **not touched by this audit. Nothing in it was queried, linked or migrated.**

This is a written runbook. Nothing in it has been executed against production.

> **Caveat — the working tree changed while this audit was running.** Every finding below was established against committed state at `ca6f368b`. Partway through, uncommitted work appeared in the tree adding `app/api/cron/todotwo-notifications/route.ts`, `lib/todotwo/notifications/**`, `scripts/todotwo/notify.ts`, an announcements feature, and two further migrations (`20260904090000_todotwo_notifications.sql`, `20260904090100_todotwo_announcements.sql`). **None of that is audited here.** It partially answers blocker B1 — there is now a notification dispatch endpoint — but it also means §3's migration list is already out of date by two files, and the new migrations have had no security review. Re-run this audit against the committed head before deploying, and add the two new migrations to §3 and to the collated rollback script.

---

## 1. Readiness verdict

**No. Not safe to deploy as it stands.**

`npm run build` passes and the code is unusually disciplined for a bolt-on module. The isolation story is real: `todotwo` is its own schema, its own client, its own auth, its own CSS tokens, and the middleware branch returns before any storefront logic runs. That part is sound.

The blockers are not code quality. They are that the deployment described in the brief cannot actually be carried out with what exists in the repository today.

### Blockers

**B1 — The two cron jobs the brief asks for have no endpoints to call.**
`app/api/cron/` contains eleven directories. None of them is a `todotwo-*`. `grep -r` finds no notification table, no notification dispatch code, and no Resend integration anywhere under `lib/todotwo/` or `app/todotwo/`. Occurrence generation exists only as `scripts/todotwo/generate-occurrences.ts`, a local CLI.

So: **occurrence generation cannot run in production at all**, and **notification dispatch does not exist as a feature**. Section 5 below gives the workflow YAML as asked, but both workflows would `curl` a 404 today. Recurring routines would stop appearing once the last locally-generated horizon runs out.

**B2 — The CLI generator hard-refuses production, and so does every other TodoTwo script.**
`scripts/todotwo/{generate-occurrences,create-admin,seed,import-todoist}.ts` all carry `const PRODUCTION_REFS = new Set(['dofhlyvexecwlqmrzutd', 'dofhlyvexecwlqmrzutd'])` and `process.exit(1)`. That guard is correct and should stay. But it means there is currently **no supported way to create the first administrator account on production**. `claim_person()` links an auth user to a waiting `todotwo.people` row — and nobody can insert the first `people` row, because inserting one requires being an admin, and there is no admin. Chicken and egg. This must be resolved by a deliberate one-time SQL insert (step 3.7) before anyone can sign in.

**B3 — `npm run todotwo:migrate` against production would be a disaster.**
`todotwo:migrate` is `supabase db push`. `db push` applies *every* unrecorded file in `supabase/migrations/` to the linked project. That directory contains the storefront's history, including ad-hoc files, against a project that has never had a migration recorded because it was always managed by hand. Pushing it at production would attempt to re-run the entire storefront schema history against a live database holding Vipps payment records.

**Do not link the production project. Do not run `supabase db push` against it.** Section 3 applies the eleven TodoTwo files by hand through the SQL editor for exactly this reason.

**B4 — Co-locating TodoTwo with the live storefront project means minting `authenticated` JWTs in a project whose `public` schema has no working RLS.**
Per `docs/todotwo/ARCHITECTURE.md` §2.1 (and the standing rules), the storefront has no Supabase Auth and no working RLS: every existing query goes through the service-role client. `auth.uid()` is null for every request today, so no policy in `public` has ever been exercised.

TodoTwo introduces real Supabase Auth users to that project. Each Workawayer gets a genuine `authenticated` JWT. If PostgREST on the production project exposes `public` (it does by default) and `authenticated` holds the Supabase-default grants on those tables with RLS off or with policies that were never tested, then **every TodoTwo user can read `public.orders` and the Vipps payment rows directly from `https://dofhlyvexecwlqmrzutd.supabase.co/rest/v1/orders`**, bypassing the entire Next.js app.

I could not verify this either way, because verifying it means querying production, which I am forbidden to do. **This must be checked before anything else, and it is the single most important item in this document.** See §9, R1.

**The strong recommendation is to not co-locate at all: give TodoTwo its own production Supabase project.** It shares no table, no foreign key and no query with the storefront. `lib/todotwo/db.ts` binds `db: { schema: 'todotwo' }` precisely so the storefront is unreachable — a separate project makes that guarantee physical rather than configurational, removes B4 entirely, removes any chance of a stray `db push` reaching payment records, and costs nothing but a second project. The rest of this runbook works unchanged against a new project; only the ref changes.

### Non-blockers worth knowing before you decide

- `npm run build` succeeds, exit 0 (§9a).
- `npm run check:encoding` fails, and has failed since before TodoTwo existed (§9c). The Quality Guard `encoding-and-types` job is therefore red on `main`, which means **the typecheck step in that job has never run**. Fix that before relying on CI as a gate.
- Middleware bundle is 245 kB, which Netlify will accept but which now loads on every storefront request (§9b).
- Several security findings, one of which is an unauthenticated email-enumeration oracle exposed to `anon` (§9d, F1).

---

## 2. Environment variables

Read from `.env.local` for names only. **No value from that file is reproduced here, and none should be pasted into this document, a commit, a Slack message or a ticket.**

### Already set in Netlify today (storefront — do not touch)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ADMIN_PASSWORD`, `OPERATIONS_PASSWORD`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_MERCHANT_SERIAL_NUMBER`, `VIPPS_SUBSCRIPTION_KEY`, `VIPPS_ENV`, and optionally `EGG_OPS_IP_ALLOWLIST`.

### TodoTwo variables — what must be added

| Variable | Production | Deploy Preview | Branch deploy | In Netlify today | Notes |
|---|---|---|---|---|---|
| `TODOTWO_ENABLED` | `false` at first deploy, `true` to go live | `false` | `false` | **Missing** | The kill switch. Anything other than the exact string `true` disables. See §7. |
| `NEXT_PUBLIC_TODOTWO_SUPABASE_URL` | production TodoTwo project URL | dev project URL | dev project URL | **Missing** | `NEXT_PUBLIC_` — **inlined into the JS bundle and public**. |
| `NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY` | production publishable key | dev publishable key | dev publishable key | **Missing** | Also public. Publishable/anon keys are designed for this; RLS is what protects the data. |
| `TODOTWO_SUPABASE_SERVICE_ROLE_KEY` | production service-role JWT | **do not set** | **do not set** | **Missing** | Only needed once the cron routes of §5 exist. Setting it in a preview context puts a service-role key behind a public preview URL. Leave it unset until B1 is fixed. |
| `TODOTWO_DEV_PROJECT_REF` | **do not set** | `cxuukixtooxyipdecbcb` | `cxuukixtooxyipdecbcb` | **Missing** | Seed guard only. Never set in production. |
| `TODOTWO_SEED_ALLOWED` | **never set, in any context** | leave unset | leave unset | **Missing** | Local `.env.local` only. |

Also required, but reusing existing values:

| Variable | Note |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Already set. `lib/todotwo/host.ts::absoluteUrl()` falls back to it and rewrites the host to punycode. Confirm it is the apex, not a `*.netlify.app` URL, or magic-link callbacks will point at the wrong origin. |
| `CRON_SECRET` | Already set. The §5 workflows reuse it, matching every existing cron. |

### Netlify build settings

`netlify.toml` needs **no change**. `SECRETS_SCAN_OMIT_KEYS` does not need `NEXT_PUBLIC_TODOTWO_*` added, because Netlify's secrets scanner skips `NEXT_PUBLIC_`-prefixed variables by design. If a deploy nonetheless fails secrets-scanning on the TodoTwo anon key, add the two `NEXT_PUBLIC_TODOTWO_*` names to `SECRETS_SCAN_OMIT_KEYS` and nothing else — never add `TODOTWO_SUPABASE_SERVICE_ROLE_KEY` to that list.

### GitHub repository secrets (CI, per `quality-guard.yml`)

| Name | Kind | Status |
|---|---|---|
| `TODOTWO_SUPABASE_URL` | secret | **Missing** — RLS step currently emits a notice and passes |
| `TODOTWO_SUPABASE_ANON_KEY` | secret | **Missing** |
| `TODOTWO_SUPABASE_SERVICE_ROLE_KEY` | secret | **Missing** — dev project's key, never production's |
| `TODOTWO_DEV_PROJECT_REF` | variable | **Missing** |
| `CRON_SECRET` | secret | Present (existing crons use it) |
| `CRON_BASE_URL` | secret or variable | Check. Existing workflows default to `https://main--tinglum.netlify.app`. If that default is stale the §5 workflows inherit the staleness. |

---

## 3. Migrating the production Supabase project

> **Read first.** Do not run `npx supabase link --project-ref dofhlyvexecwlqmrzutd`. Do not run `npm run todotwo:migrate`. See blocker B3. Every step below is executed by hand in the Supabase SQL editor, one file at a time, by a human who is looking at the result before continuing.
>
> Take a fresh manual backup of the production project before step 3.1 and confirm PITR is on. If PITR is not available on the plan, do not proceed until a verified dump exists.

### Order

Filename order is also dependency order. Do not reorder, do not batch.

| # | File | What it does | Check before continuing |
|---|---|---|---|
| 3.1 | `20260831090000_todotwo_bootstrap.sql` | creates schema `todotwo`, grants `usage` to `authenticated`/`anon`/`service_role`, sets default privileges, creates `touch_updated_at()` | `select nspname from pg_namespace where nspname='todotwo';` returns one row. `\dn+ todotwo` shows the grants. **`public` is untouched** — verify with `select count(*) from information_schema.tables where table_schema='public';` before and after; the number must be identical. |
| 3.2 | `20260831090100_todotwo_core.sql` | enums; `people`, `people_private`, `role_assignments`, `locations`, `settings`, `audit_log`; `redact()`, `audit_trigger()` and five triggers | six tables exist in `todotwo`; `select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='todotwo';` is non-zero. |
| 3.3 | `20260831090200_todotwo_rls.sql` | `current_person_id()`, `has_role()`, `is_admin()`, `is_staff()`; RLS + policies on all six; grants; `anon` revoked | `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='todotwo' and relkind='r';` — **every row must read `t`**. If any is `f`, stop and roll back. |
| 3.4 | `20260901090000_todotwo_audit_log_readonly.sql` | revokes write privileges on `audit_log`, narrows the schema default to `select` | `select privilege_type from information_schema.role_table_grants where table_schema='todotwo' and table_name='audit_log' and grantee='authenticated';` returns `SELECT` and nothing else. |
| 3.5 | `20260902090000_todotwo_tasks.sql` | `projects`, `sections`, `tasks`, `labels`, `task_labels`, `task_assignments`, `task_dependencies`, `task_comments`, `saved_views` | tables exist. **They now exist with `select` granted and no policies yet — this is a live window in which any authenticated caller could read every task.** Run 3.6 immediately, in the same sitting. |
| 3.6 | `20260902090100_todotwo_tasks_rls.sql` | RLS + policies for the nine; `is_task_assignee()`; `accept_task()`, `start_task()`, `complete_task()`, `uncomplete_task()` | re-run the `relrowsecurity` query — all `t`. `select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='todotwo';` lists the four verbs. |
| 3.7 | *(no file — one-time bootstrap, see below)* | insert the first administrator | see below |
| 3.8 | `20260902090200_todotwo_task_series.sql` | `task_series`, `task_series_steps`, `task_exceptions`; makes `tasks.title` nullable; adds `occurrence_date`; `tasks_resolved` view | view exists and is `security_invoker`: `select reloptions from pg_class where relname='tasks_resolved';` contains `security_invoker=true`. |
| 3.9 | `20260903090000_todotwo_occurrence_conflict_target.sql` | swaps the partial unique index for a real unique constraint on `(series_id, occurrence_date)` | `select conname from pg_constraint where conname='tasks_series_occurrence_unique';` returns one row. |
| 3.10 | `20260903090100_todotwo_step_completions.sql` | `task_step_completions`, `toggle_step()` | table + function present, RLS on. |
| 3.11 | `20260903090200_todotwo_invites.sql` | `email_is_invited()` (**granted to `anon`** — see §9d F1), `claim_person()` | both functions present. Decide F1 before this ships. |
| 3.12 | `20260903090300_todotwo_rota.sql` | `series_rota`, `apply_rota()`, `assign_task()`, `person_workload` view | table + two functions + view present, RLS on `series_rota`. |

### 3.7 — Creating the first administrator (the step no script can do)

Every `scripts/todotwo/*` refuses `dofhlyvexecwlqmrzutd`, correctly. So the first person row is inserted by hand, once, in the SQL editor, and never again:

```sql
-- One-time. Every subsequent person is added through the TodoTwo UI by an admin.
begin;

insert into todotwo.people (full_name, email, is_active)
values ('Kenneth Tinglum', 'kenneth@tinglum.com', true)
returning id;

-- Use the id returned above.
insert into todotwo.role_assignments (person_id, role)
values ('<the id>', 'super_admin');

commit;
```

Do **not** create the `auth.users` row. `claim_person()` links it on first magic-link sign-in, matching on the verified email. Confirm the column names against `20260831090100_todotwo_core.sql` before running — this insert is written from the migration, not from a live schema I am allowed to read.

### Rollback — the collated reversal script

Assembled from the `-- ROLLBACK:` block at the foot of each of the eleven migrations, in **reverse** application order. Read it before running it: the last statement drops the schema and everything in it.

```sql
-- TodoTwo — full reversal. Destroys all TodoTwo data. Nothing outside the
-- todotwo schema is referenced. Run top to bottom.
begin;

-- 20260903090300 rota
drop view     if exists todotwo.person_workload;
drop function if exists todotwo.assign_task(uuid, uuid);
drop function if exists todotwo.apply_rota(uuid, date, date);
drop table    if exists todotwo.series_rota cascade;

-- 20260903090100 step completions
drop function if exists todotwo.toggle_step(uuid, uuid);
drop table    if exists todotwo.task_step_completions cascade;

-- 20260903090200 invites
drop function if exists todotwo.claim_person();
drop function if exists todotwo.email_is_invited(text);

-- 20260903090000 occurrence conflict target
alter table todotwo.tasks drop constraint if exists tasks_series_occurrence_unique;
create unique index if not exists tasks_series_occurrence_unique
  on todotwo.tasks (series_id, occurrence_date)
  where series_id is not null and deleted_at is null;

-- 20260902090200 task series
drop view  if exists todotwo.tasks_resolved;
drop table if exists todotwo.task_exceptions cascade;
drop table if exists todotwo.task_series_steps cascade;
drop index if exists todotwo.tasks_series_occurrence_unique;
alter table todotwo.tasks drop constraint if exists tasks_series_fk;
alter table todotwo.tasks drop constraint if exists tasks_title_or_series;
alter table todotwo.tasks drop column     if exists occurrence_date;
alter table todotwo.tasks alter column title set not null;
drop table if exists todotwo.task_series cascade;

-- 20260902090100 tasks RLS
drop function if exists todotwo.uncomplete_task(uuid);
drop function if exists todotwo.complete_task(uuid, integer);
drop function if exists todotwo.start_task(uuid);
drop function if exists todotwo.accept_task(uuid);
drop function if exists todotwo.is_task_assignee(uuid);
-- (its policies drop with their tables, below)

-- 20260902090000 tasks
drop table if exists todotwo.saved_views         cascade;
drop table if exists todotwo.task_comments       cascade;
drop table if exists todotwo.task_dependencies   cascade;
drop table if exists todotwo.task_assignments    cascade;
drop table if exists todotwo.task_labels         cascade;
drop table if exists todotwo.labels              cascade;
drop table if exists todotwo.tasks               cascade;
drop table if exists todotwo.sections            cascade;
drop table if exists todotwo.projects            cascade;

-- 20260901090000 audit log read-only  (reverses the default-privilege narrowing)
alter default privileges in schema todotwo
  grant select, insert, update, delete on tables to authenticated;

-- 20260831090200 core RLS
drop policy   if exists audit_log_admin_select            on todotwo.audit_log;
drop policy   if exists settings_admin_all                on todotwo.settings;
drop policy   if exists locations_select_authenticated    on todotwo.locations;
drop policy   if exists locations_admin_all               on todotwo.locations;
drop policy   if exists role_assignments_select_self      on todotwo.role_assignments;
drop policy   if exists role_assignments_admin_all        on todotwo.role_assignments;
drop policy   if exists people_private_admin_all          on todotwo.people_private;
drop policy   if exists people_coordinator_select         on todotwo.people;
drop policy   if exists people_select_self                on todotwo.people;
drop policy   if exists people_admin_all                  on todotwo.people;
drop function if exists todotwo.is_staff();
drop function if exists todotwo.is_admin();
drop function if exists todotwo.has_role(todotwo.role_name);
drop function if exists todotwo.current_person_id();

-- 20260831090100 core  (its rollback block; enums and tables go with the schema)
-- 20260831090000 bootstrap
drop function if exists todotwo.touch_updated_at();
drop schema   if exists todotwo cascade;

commit;
```

Notes on this script, because a rollback you have not thought about is not a rollback:

- **Partial rollback is far preferable to the whole thing.** If you fail at step 3.9, run only the sections above it. Stopping midway leaves a coherent state at every boundary except between 3.5 and 3.6.
- The `20260902090000_todotwo_tasks.sql` file's own rollback block was not readable in full during this audit; the table list above is reconstructed from `20260902090100_todotwo_tasks_rls.sql`'s `alter table ... enable row level security` list, which is authoritative for which tables that migration created. **Diff it against the file's own `-- ROLLBACK:` block before running.**
- `drop schema todotwo cascade` is safe with respect to the storefront: no object in `public` references anything in `todotwo`. Confirm before running with `select conname from pg_constraint where connamespace::regnamespace::text = 'public' and pg_get_constraintdef(oid) ilike '%todotwo%';` — must be empty.
- The reversal does **not** delete `auth.users` rows created by TodoTwo sign-ins. Those persist and must be deleted separately if the intent is a clean removal. **Deleting auth users on the production project is a manual, deliberate act — confirm with Kenneth first, and do not delete any user that predates TodoTwo.**

---

## 4. Supabase dashboard changes on production

None of these are in a migration; all are console settings, and all must be recorded somewhere they will survive a person leaving.

1. **Expose the schema.** Settings → API → *Exposed schemas* → add `todotwo`. Keep `public` and `graphql_public` as they are. Without this every TodoTwo query 404s at PostgREST.
   *Before doing this, read §9d F1 — exposing the schema is what makes `email_is_invited` reachable by `anon`.*

2. **Automatically expose new tables: confirm it is OFF.** The dev project was created with it off deliberately; production's setting is whatever it was set to years ago. If it is on, that is a pre-existing storefront exposure and changing it may break existing behaviour — **do not change it as part of this deploy**; raise it separately. TodoTwo grants every table explicitly and does not depend on it.

3. **Auth → URL Configuration → Site URL:** `https://xn--tinglumgrd-85a.no`

4. **Auth → URL Configuration → Redirect URLs**, add all of:
   ```
   https://xn--tinglumgrd-85a.no/todotwo/auth/callback
   https://tinglumgard.no/todotwo/auth/callback
   https://www.xn--tinglumgrd-85a.no/todotwo/auth/callback
   http://localhost:3003/todotwo/auth/callback
   ```
   Use the **punycode** form as the canonical entry. `lib/todotwo/host.ts::absoluteUrl()` rewrites Unicode hosts to `xn--tinglumgrd-85a.no` before a link leaves the app, so the punycode entry is the one that will actually be matched. The Unicode form `https://tinglumgård.no/...` is *not* listed above on purpose — Supabase's allowlist matching is a string comparison and mail clients mangle the Unicode form. Add whichever apex the site actually serves on (`tinglumgard.no` vs `xn--tinglumgrd-85a.no`) as the primary. Do not add a wildcard.

   Add the Netlify deploy-preview pattern **only** if you intend previews to authenticate against production, which you should not. Point previews at the dev project instead.

5. **Auth → Providers → Email:** confirm *Enable email provider* on, *Confirm email* on, and **turn *Allow new users to sign up* OFF**. `email_is_invited()` gates the UI, but the UI is not the boundary — anyone can call `signInWithOtp` directly with the public anon key. With sign-ups off, an uninvited address cannot create an `auth.users` row at all. This is the belt to `email_is_invited`'s braces, and given B4 it matters a great deal.

6. **SMTP — mandatory, not optional.** Supabase's built-in email sender is rate-limited to a handful of messages per hour and is explicitly not for production. Magic links *will* silently fail. Configure Auth → Emails → SMTP Settings with the existing Resend credentials:
   - Host `smtp.resend.com`, port `465` (implicit TLS) or `587` (STARTTLS)
   - Username `resend`, password = the existing `RESEND_API_KEY` value
   - Sender = an address on a domain already verified in Resend. Use the same domain as the existing `EMAIL_FROM`; a magic link from an unverified sender goes straight to spam and there is no bounce visible to the user.
   - Raise Auth → Rate Limits → *Email sent* from the default to something workable (e.g. 30/hour) once custom SMTP is in place.
   - Send a test magic link to yourself **before** enabling the flag.

7. **Auth → Emails → Templates:** the default magic-link template is English and Supabase-branded. TodoTwo's UI is English (admin-facing, per R12), so the default is tolerable, but the link text should say Tinglumgård. Check the rendered link resolves to the punycode host.

8. **Database → Extensions:** `gen_random_uuid()` is used throughout. It is built in from PG13, but confirm `pgcrypto` presence if the project is older.

---

## 5. Cron jobs

**These cannot be enabled yet.** As established in B1, neither `POST /api/cron/todotwo-generate-occurrences` nor `POST /api/cron/todotwo-notifications` exists, and there is no notification feature at all. The YAML below follows `eggs-forecast-sync-cron.yml` exactly and is ready to paste into `.github/workflows/` **once the route handlers exist** — per the brief, the files are not created here.

Three things the route handlers must do when they are written:

- Live at `app/api/cron/todotwo-generate-occurrences/route.ts` and `app/api/cron/todotwo-notifications/route.ts`, matching the `app/api/cron/todotwo-*` allowlist in R1.
- Verify `CRON_SECRET` from the `x-cron-secret` header **or** the `token` query parameter, the way the existing crons are called.
- Use `getPrivilegedClientForCronOnly()` from `lib/todotwo/db-privileged.ts` — there is no user session, so RLS cannot serve them — with a comment at the call site saying so, per R2. `generateOccurrences()` in `lib/todotwo/generate.ts` already takes any client and is shared with the CLI, so the handler is thin.

**Note the kill-switch gap:** `isTodoTwoPath()` matches `/todotwo` and `/api/todotwo` only. `/api/cron/todotwo-*` is **not** matched, so these endpoints run even with `TODOTWO_ENABLED=false`. Each handler must check `isTodoTwoEnabled()` itself and return early. Do not rely on middleware.

### `.github/workflows/todotwo-generate-occurrences-cron.yml`

```yaml
name: TodoTwo Generate Occurrences Cron

on:
  schedule:
    # 02:10 UTC daily. Comfortably after midnight in Europe/Oslo in both
    # CET and CEST, so a day's occurrences exist before anyone is awake.
    - cron: "10 2 * * *"
  workflow_dispatch:

jobs:
  generate-occurrences:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Trigger TodoTwo occurrence generation
        env:
          CRON_BASE_URL: ${{ secrets.CRON_BASE_URL || vars.CRON_BASE_URL || 'https://main--tinglum.netlify.app' }}
          CRON_SECRET: ${{ secrets.CRON_SECRET || vars.CRON_SECRET }}
        run: |
          set -euo pipefail

          if [ -z "${CRON_SECRET:-}" ]; then
            echo "::error::CRON_SECRET is required for TodoTwo occurrence generation."
            exit 1
          fi

          echo "Using CRON_BASE_URL=${CRON_BASE_URL}"

          URL="${CRON_BASE_URL%/}/api/cron/todotwo-generate-occurrences"
          RESPONSE_FILE=/tmp/todotwo-generate-occurrences-response.json

          HTTP_CODE=$(curl --silent --show-error \
            --request POST \
            -H "x-cron-secret: $CRON_SECRET" \
            --output "$RESPONSE_FILE" \
            --write-out "%{http_code}" \
            "${URL}?token=${CRON_SECRET}")

          echo "HTTP status: $HTTP_CODE"
          echo "Cron response:"
          cat "$RESPONSE_FILE"

          if [ "$HTTP_CODE" = "404" ]; then
            echo "::warning::TodoTwo is disabled (TODOTWO_ENABLED is not true). Nothing to generate."
            exit 0
          fi

          if [ "$HTTP_CODE" -ge 400 ]; then
            echo "::error::TodoTwo occurrence generation failed with HTTP $HTTP_CODE"
            exit 1
          fi
```

### `.github/workflows/todotwo-notifications-cron.yml`

```yaml
name: TodoTwo Notifications Cron

on:
  schedule:
    # Every 15 minutes. A reminder that arrives an hour late is not a reminder;
    # every minute would be wasteful for a farm with a handful of people.
    - cron: "*/15 * * * *"
  workflow_dispatch:

jobs:
  dispatch-notifications:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Trigger TodoTwo notification dispatch
        env:
          CRON_BASE_URL: ${{ secrets.CRON_BASE_URL || vars.CRON_BASE_URL || 'https://main--tinglum.netlify.app' }}
          CRON_SECRET: ${{ secrets.CRON_SECRET || vars.CRON_SECRET }}
        run: |
          set -euo pipefail

          if [ -z "${CRON_SECRET:-}" ]; then
            echo "::error::CRON_SECRET is required for TodoTwo notification dispatch."
            exit 1
          fi

          echo "Using CRON_BASE_URL=${CRON_BASE_URL}"

          URL="${CRON_BASE_URL%/}/api/cron/todotwo-notifications"
          RESPONSE_FILE=/tmp/todotwo-notifications-response.json

          HTTP_CODE=$(curl --silent --show-error \
            --request POST \
            -H "x-cron-secret: $CRON_SECRET" \
            --output "$RESPONSE_FILE" \
            --write-out "%{http_code}" \
            "${URL}?token=${CRON_SECRET}")

          echo "HTTP status: $HTTP_CODE"
          echo "Cron response:"
          cat "$RESPONSE_FILE"

          if [ "$HTTP_CODE" = "404" ]; then
            echo "::warning::TodoTwo is disabled (TODOTWO_ENABLED is not true). Nothing to dispatch."
            exit 0
          fi

          if [ "$HTTP_CODE" -ge 400 ]; then
            echo "::error::TodoTwo notification dispatch failed with HTTP $HTTP_CODE"
            exit 1
          fi
```

`CRON_BASE_URL` should be set to the apex (`https://xn--tinglumgrd-85a.no`) rather than inheriting the `main--tinglum.netlify.app` default, which every existing workflow falls back to and which nobody has verified recently.

---

## 6. Pre-flight and smoke test

### Pre-flight (before merging, and before flipping the flag)

- [ ] B4 resolved: either TodoTwo has its own production Supabase project, or you have positively verified that `public` on `dofhlyvexecwlqmrzutd` is not readable by a bare `authenticated` JWT (§9, R1).
- [ ] Fresh production database backup taken; PITR confirmed on.
- [ ] `npm run build` green locally.
- [ ] `npm run typecheck` green.
- [ ] `npm test` green (unit tests plus the isolation guards).
- [ ] `npm run test:rls` run against the **dev** project and green. The RLS suite is the only evidence these policies work; do not deploy without it having run.
- [ ] `git diff main...HEAD --stat` reviewed: confirm the only shared files touched are `middleware.ts`, `package.json`, `.github/workflows/quality-guard.yml`, `netlify.toml`. The isolation guard test enforces this; read its output rather than trusting it.
- [ ] The eleven migrations reviewed by a second person, top to bottom.
- [ ] The collated rollback script (§3) has been run once **against the dev project** and observed to leave a clean database. An untested rollback is a wish.
- [ ] SMTP configured on the target project and a test magic link received in a real inbox (§4.6).
- [ ] Sign-ups disabled (§4.5).
- [ ] Redirect URLs added, punycode form present (§4.4).
- [ ] All six TodoTwo Netlify variables set, per context, with `TODOTWO_ENABLED=false` in production (§2).
- [ ] `TODOTWO_SEED_ALLOWED` and `TODOTWO_DEV_PROJECT_REF` confirmed **absent** from the production context.
- [ ] Migrations applied to production in order (§3), with the between-step checks recorded.
- [ ] First admin row inserted (§3.7).
- [ ] Deploy with `TODOTWO_ENABLED=false`. Run the storefront half of the smoke test. Only then flip the flag.

### Post-deploy smoke test

**Storefront must be unaffected — run this first, with the flag still false, and again after flipping it.**

| Check | Expected |
|---|---|
| `GET /` | Homepage renders, no console errors, images load |
| `GET /bestill` | Order flow loads; product/box configuration renders; add to cart works; **do not complete a real order** |
| `GET /min-side` | Login gate behaves as before; an existing customer sees their orders and payment status; the `jose` cookie session still resolves |
| `GET /drift/egg-ops` | Loads under the existing IP allowlist; if `EGG_OPS_IP_ALLOWLIST` is set, confirm an off-list IP still gets 403 — that logic sits *after* the TodoTwo branch in `middleware.ts` and must be unchanged |
| `https://eggops.tinglumgard.no/` and the punycode host | Still rewrites to `/egg` |
| `GET /milk` | Loads, allowlist behaviour unchanged |
| `GET /rugeegg`, `/kyllinger`, `/produkt` | Load |
| Vipps callback | Do not test synthetically. Watch the first real payment through and confirm `reconcile-payments-cron` is still green |
| `email-dispatch-cron` | Green on its next tick (it runs every minute) |
| Netlify function logs | No new errors, no middleware timeouts |
| p95 TTFB on `/` | Compare against the previous deploy. The middleware bundle grew — see §9b |

**TodoTwo, with `TODOTWO_ENABLED=false`:**

| Check | Expected |
|---|---|
| `GET /todotwo` | `404`, body `Not found`, `text/plain` |
| `GET /todotwo/login` | `404` |
| `GET /api/todotwo/auth/logout` | `404` JSON `{"error":"not_found"}` |

**TodoTwo, with `TODOTWO_ENABLED=true`:**

| Check | Expected |
|---|---|
| `GET /todotwo` | Redirects to `/todotwo/login` when signed out |
| `/todotwo/login` with an uninvited address | "This email address does not have access" — and **no email is sent** |
| `/todotwo/login` with the admin address | Magic link arrives within a minute, from the Resend sender, link points at `xn--tinglumgrd-85a.no` |
| Following the link | Lands on `/todotwo`, `claim_person()` has linked the row, shell shows the name and `super_admin` |
| Following the same link a second time | Redirects to login with "has been used or has expired" — not a crash |
| `/todotwo/people` | Admin sees the people list; adding a person works |
| `/todotwo/routines`, `/todotwo/upcoming`, a task detail page | Render; no unhandled error boundary |
| Sign out | Session gone; `/todotwo` bounces to login |
| Sign in as a Workawayer fixture | Cannot see `/todotwo/people` admin actions; **and, separately, confirm with a raw REST call that they cannot read `people_private`** — the UI hiding it proves nothing |
| Raw REST as that Workawayer's JWT against the storefront tables | `select * from public.orders` must fail. **This is the B4 test. If it returns rows, disable TodoTwo immediately.** |
| Re-run the whole storefront table above | Still unaffected |

---

## 7. Rollback — making TodoTwo vanish

### The fast path

Netlify → Site configuration → Environment variables → set `TODOTWO_ENABLED` to `false` in the production context → **trigger a redeploy**.

Note the redeploy. Netlify environment variables are read at build time for anything inlined and at runtime for the rest; `isTodoTwoEnabled()` reads `process.env.TODOTWO_ENABLED` inside the edge middleware, which on Netlify is bundled at build time. **Assume a redeploy is required and budget two to four minutes**, not "instantly". If you need instant, roll back to the previous deploy in the Netlify Deploys tab — that is genuinely immediate and is the better first move in an incident.

### What the kill switch does

Verified by reading `middleware.ts` and `lib/todotwo/middleware.ts`:

- `middleware.ts` calls `isTodoTwoPath(pathname)` **first**, before reading the host, before the eggops and milk logic, and returns immediately. So TodoTwo cannot alter storefront behaviour, and vice versa. This is correctly ordered.
- `handleTodoTwoMiddleware` checks `isTodoTwoEnabled()`, which requires `process.env.TODOTWO_ENABLED === 'true'` exactly. `TRUE`, `1`, `yes` and an unset variable all mean disabled — a safe default.
- Disabled: an API path under `/api/todotwo` gets `404 {"error":"not_found"}`; anything else under `/todotwo` gets a plain-text `404`. No redirect, no hint the module exists.
- The matcher `'/((?!_next/static|_next/image|favicon.ico).*)'` covers every `/todotwo` and `/api/todotwo` path.

### What it does **not** cover — read this before relying on it

1. **The Supabase project stays wide open.** The flag is a Next.js route gate. It does nothing to the database. `https://<ref>.supabase.co/rest/v1/...` and `/auth/v1/otp` remain reachable by anyone holding the anon key, and any already-issued session keeps working. A user who is signed in when you flip the flag still has a valid JWT and can still read and write `todotwo` tables directly. **To actually cut off access you must revoke at Supabase**: disable the email provider, or revoke the grants, or drop the schema.
2. **The anon key and project URL are already public.** `NEXT_PUBLIC_TODOTWO_SUPABASE_URL` and `..._ANON_KEY` are inlined into seven files under `.next/static/chunks/app/todotwo/`, and `_next/static` is **excluded from the middleware matcher**. So those chunks — and the credentials in them — are fetchable by anyone with the flag off. That is by design for publishable keys, but it means "TodoTwo vanishes" is only true of the HTML.
3. **`/api/cron/todotwo-*` is not covered.** `isTodoTwoPath()` does not match it. When the §5 routes exist they must check the flag themselves.
4. **Nothing is deleted.** Data, `auth.users` rows, audit log, all persist. Flipping the flag back on restores everything exactly as it was — which is the point, but it is not removal.
5. **The middleware bundle stays 245 kB** whether the flag is on or off; the import is static (§9b).
6. **Build output still contains TodoTwo.** The pages are built, deployed and served by the same functions. The flag reduces cost by nothing.

For genuine removal: flag off → redeploy → disable the Supabase email provider → run the §3 reversal script → revert the branch.

---

## 8. Known risks and what could go wrong

Ordered by how much they would ruin a Saturday.

1. **`supabase db push` against production.** `npm run todotwo:migrate` is one command and `supabase/config.toml` sits in the repo looking authoritative. If anyone links production and runs it, the CLI will try to replay the storefront's entire migration folder — including `fix_missing_columns.sql`-style ad-hoc files — against a database holding Vipps payment records. There is no guard preventing this: the production-ref guard lives in the four TypeScript scripts, **not** in `todotwo:migrate`. **Add a ref check to that npm script before anyone goes near production.** Today it is a loaded gun on the table.

2. **B4, the `authenticated` role in a project with inert RLS.** Covered above. Worst case: a Workawayer, or anyone who obtains a session, reads every customer order and Vipps payment record with a single `curl`. The exposure is created by this deploy, not by the storefront, because until now nothing ever minted an `authenticated` JWT for that project.

3. **No occurrence generation in production.** Routines are the module's reason to exist. Without a cron and with the CLI refusing production, the task list runs dry after the last horizon and quietly shows nothing. Failure mode is silent, which is the bad kind.

4. **SMTP.** If the built-in sender is left in place, the second and third person to try signing in that hour get no email, no error, and no way to tell the difference from a broken link.

5. **A stale `CRON_BASE_URL`.** Every existing workflow defaults to `https://main--tinglum.netlify.app`. If that deploy alias has moved, existing crons are already hitting the wrong host and nobody has noticed — worth checking regardless of TodoTwo.

6. **The window between 3.5 and 3.6.** Nine tables exist with the schema's default `select` grant and no policies. The migration's own comment says never to leave them separated in time. Applying by hand through a web SQL editor makes "separated in time" much easier than it would be in a scripted push. Do them back to back or wrap both in one transaction.

7. **`tasks_series_occurrence_unique` now includes soft-deleted rows.** Documented as deliberate in `20260903090000`. The consequence: soft-delete one occurrence and that date can never be regenerated for that series. If someone deletes a day by accident, the fix is a hard delete, and the UI probably does not offer one.

8. **CI is not a gate.** `encoding-and-types` is red on `main` and has been for a long time (§9c), so the typecheck step in that job has never executed. A green-looking TodoTwo job next to a permanently red neighbour trains everyone to ignore both.

9. **The dev project shares an account with Zara** (standing rule R5a) and holds only synthetic data on that basis. Nothing in this deploy changes it, but if the plan is to promote dev data to production, stop — the seed data is invented and must not reach a real farm's task list.

10. **Middleware cold starts.** §9b.

11. **The first-admin insert is unrepeatable and undocumented anywhere but here.** Get the column names wrong and you can lock the module so nobody can sign in. Rehearse it on dev.

---

## 9. Audit findings

### 9a. Does `npm run build` succeed?

**Yes.** Run on this branch, exit code 0. Notable output:

```
λ /todotwo                          3.99 kB   171 kB
λ /todotwo/auth/callback            1.71 kB   154 kB
λ /todotwo/login                    4.78 kB   165 kB
λ /todotwo/people                   4.56 kB   164 kB
λ /todotwo/routines                 4.52 kB   164 kB
λ /todotwo/tasks/[id]               5.23 kB   173 kB
λ /todotwo/upcoming                 3.99 kB   171 kB
λ /api/todotwo/auth/logout          0 B       0 B

ƒ Middleware                        245 kB
```

All TodoTwo pages are `λ` (server-rendered), correct for `force-dynamic`. No new warnings attributable to TodoTwo. Storefront route sizes are unchanged.

### 9b. Middleware bundle size

**245 kB reported by Next; 1,233,839 bytes raw at `.next/server/middleware.js`.**

Netlify runs Next middleware as an Edge Function on Deno, where the limit is 20 MB compressed. **245 kB is not close to the limit and the deploy will not fail.** So: not a blocker.

It is still a real regression worth naming. Before TodoTwo, `middleware.ts` imported only `next/server` and was a few kB. It now statically imports `@supabase/ssr` via `lib/todotwo/middleware.ts`, and the matcher is `'/((?!_next/static|_next/image|favicon.ico).*)'` — **every** storefront request. Consequences:

- Cold-start parse and init cost is paid on storefront requests that will never touch TodoTwo, and paid even with `TODOTWO_ENABLED=false`, because the import is static and tree-shaking cannot remove it behind a runtime flag.
- Netlify's edge nodes are numerous and cold starts are correspondingly frequent on a low-traffic site. A few extra milliseconds of TTFB on `/` and `/bestill` is the likely cost. Measure it against the previous deploy rather than assuming.
- The fix, if it matters: make the `@supabase/ssr` import dynamic inside `handleTodoTwoMiddleware`, after the `isTodoTwoEnabled()` and path checks. Out of scope for this audit, but cheap.

### 9c. `check:encoding` on `main`

**Confirmed failing, and confirmed pre-existing.**

`node scripts/check-encoding.mjs` exits 1. Excluding local `.claude/worktrees/` noise, the offenders are exactly three lines in two files:

```
components/ChickenOrderCard.tsx:559
components/ChickenOrderCard.tsx:562
components/orders/PigOrderUnifiedCard.tsx:370
```

All three match the guard's ASCII-fallback pattern `\b(pa min side|…)\b` — the Norwegian "på Min side" written as "pa Min side". `git show main:…` confirms the identical text at the identical line numbers on `main`, so this predates the branch. **No TodoTwo file is flagged.** `docs/todotwo/ARCHITECTURE.md` §2.5 already records this.

Consequence, which the architecture note does not spell out: the `encoding-and-types` job fails at its *first* step, so **`npm run check:email-flows` and `npm run typecheck` have never run in CI on `main`**. Fixing the three strings is a two-minute change that restores a whole job. It is outside TodoTwo's allowlist, so it belongs in a separate commit — but it should be that commit's own small PR, soon.

### 9d. Security review of the migrations

I read all eleven `supabase/migrations/*todotwo*.sql`. The overall standard is high: no `using (true)` anywhere, `anon` revoked from every table, `security_invoker=true` on both views, RLS enabled on every table in the same migration that creates it, and the security-definer verbs all re-check the caller rather than trusting arguments. The append-only audit log fix in `20260901090000` is a genuinely good catch — grants *and* policy, two layers.

Findings, worst first.

**F1 — `email_is_invited(text)` is an unauthenticated membership oracle. Real, and I would not ship it as-is.**

`20260903090200_todotwo_invites.sql`:

```sql
grant execute on function todotwo.email_is_invited(text) to anon, authenticated;
```

Combined with `grant usage on schema todotwo to ... anon` in the bootstrap and a publicly-inlined anon key, **anyone on the internet can POST to `/rest/v1/rpc/email_is_invited` and learn, for any email address they choose, whether that person is an active member of the farm.** The function's own comment argues it "reveals nothing beyond yes/no" — but yes/no about an arbitrary address the caller supplies is precisely a membership oracle, not a confirmation of something they already knew. Fed a list, it enumerates the household.

There is no rate limit on it, no captcha, and it is a `stable sql` function so it is cheap to hammer.

Mitigations, in order of preference: (a) drop the pre-check entirely and rely on Supabase sign-ups being disabled plus an always-identical "if that address has access, a link is on its way" message — this is the standard pattern and it loses nothing; (b) keep the function but revoke `anon` and gate it behind a Next.js route handler that rate-limits by IP; (c) at minimum, cap Supabase's anonymous RPC rate limit and accept the residual leak. For a five-person farm the disclosure is modest. It is still a disclosure that did not need to exist.

**F2 — `set search_path = todotwo, public, pg_temp` on every `security definer` function. A hardening gap, not an open door.**

Eleven security-definer functions pin their search path this way. Including `pg_temp` in the search path of a definer function is the classic CVE-2018-1058 shape: any `authenticated` caller can create objects in their own temp schema, and an unqualified reference inside the function may resolve to the attacker's object, executing as the function's (privileged) owner.

I checked: every table and function reference inside these bodies **is** schema-qualified (`todotwo.people`, `todotwo.is_staff()`, `auth.users`). So I did not find an exploitable path. What remains reachable is operator and cast resolution, which is not schema-qualifiable and which is exactly the vector the CVE describes.

The fix is one word per function: `set search_path = todotwo, public, pg_catalog`, or `set search_path = ''` with everything qualified. `pg_temp` should never appear in a definer function's search path. Cheap to fix in a new migration; worth doing before real users exist.

**F3 — `apply_rota`, `assign_task` and `toggle_step` insert into `task_assignments` with no check that `person_id` refers to a real, active person.**

`assign_task(p_task_id, p_person_id)` verifies the *caller* is staff, then inserts whatever `p_person_id` it was handed. The FK guarantees the row exists; nothing guarantees `deleted_at is null` or `is_active`. Staff-only, so this is a data-integrity bug rather than a privilege escalation — but it means a coordinator can assign tomorrow's milking to a Workawayer who left in March, and the UI will show it.

**F4 — `accept_task()` returns success when it did nothing.**

```sql
if v_task.id is null then
  select * into v_task from todotwo.tasks where id = p_task_id;
end if;
return v_task;
```

`start_task`, `complete_task` and `uncomplete_task` all raise on a no-op. `accept_task` deliberately swallows it and returns the unchanged row. So a user tapping "accept" on a task in the wrong status gets a green tick and no state change. Minor, but it is the kind of thing that erodes trust in the tool.

**F5 — every authenticated person can read the whole task board, including who is assigned to what.**

`tasks_select`, `task_assignments_select`, `labels_select`, `task_step_completions_select` and `series_rota_select` all use `using (todotwo.current_person_id() is not null)`. The `tasks_rls` migration argues this openly and convincingly ("farm work is not secret"), and I agree for tasks. Note the second-order effect: `task_assignments` joined to `people` gives any Workawayer the full roster and everyone's workload. `people_coordinator_select` is careful to require the coordinator role, and then `task_assignments_select` hands the same linkage to everyone anyway. If that is intended, fine — but it is not what the policy map in `RLS.md` implies.

Also note `person_workload` is granted to `authenticated` with `security_invoker=true`, so it inherits the same openness: everyone can see everyone's completion counts. Probably desirable on a farm. Worth a conscious decision rather than an inherited one.

**F6 — an `authenticated` user with no `people` row gets nothing. Verified, and this is good.**

I traced the stranger case deliberately: someone who obtains a Supabase session on the project without an administrator having added them. `current_person_id()` returns null, so every `select` policy that requires it is false; `people_select_self` matches no row; `is_admin()`/`is_staff()` are false. They can read nothing in `todotwo`. The callback handler additionally calls `signOut()` and bounces them. That is the right design and it holds — **within `todotwo`**. It says nothing about what that same JWT can reach in `public`, which is B4.

**F7 — `alter default privileges` is role-scoped, and nobody has written that down.**

Both the bootstrap grant and the `20260901090000` narrowing apply only to objects created by the role that ran them. Applied by hand in the SQL editor, that is the `postgres` role. If a future migration is ever applied by a different role, tables will land with different privileges than the docs claim. `MIGRATIONS.md` rule 6 tells people to grant explicitly, which mostly saves them — but the assumption should be stated. **Apply all eleven files on production as the same role, in one sitting.**

**Nothing else I found rises to a risk.** The audit trigger's `redact()`, the `security_invoker` views, the `safeReturnTo` open-redirect guard in the callback handler, the `claim_person()` "only an unlinked row matching your own verified email" condition, and the single-use magic-link `ran.current` guard are all correct.

---

## 10. Summary

| Item | State |
|---|---|
| `npm run build` | Passes |
| `npm run check:encoding` | Fails, pre-existing, two storefront files, not TodoTwo |
| Middleware bundle | 245 kB — accepted by Netlify, but now on every storefront request |
| Migrations | Eleven files, high quality, three findings (F1–F3) worth a follow-up migration |
| Storefront isolation | Genuinely good — schema-bound client, first-branch middleware, scoped CSS |
| Kill switch | Works for HTTP routes; does not touch Supabase, static chunks or future cron routes |
| Occurrence generation in production | **Does not exist** |
| Notification dispatch | **Does not exist** |
| First-admin path on production | **Does not exist** — manual SQL, §3.7 |
| Co-location with live payment data | **Unverified and the largest risk** |

**Verdict: do not deploy yet.** Resolve B1–B4, decide F1, and land a follow-up migration for F2. Then this is a good module and the runbook above will see it through.
