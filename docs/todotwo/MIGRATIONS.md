# TodoTwo — migrations

## The situation this inherits

Before Phase 0 there was no `supabase/config.toml`: the CLI was never linked and migrations were applied by hand, most likely pasted into the SQL editor. `supabase/migrations/` shows the result — timestamped files sitting beside loose ones:

```
20260707000000_rebate_codes_mangalitsa_preset_matching.sql   timestamped
20260815120000_create_nutrition_assessment.sql               timestamped
additional_migrations.sql                                    ad hoc
complete_migrations.sql                                      ad hoc
fix_missing_columns.sql                                      ad hoc
fix_missing_vipps_columns.sql                                ad hoc
fix_rls_policies.sql                                         ad hoc
box_configurations.sql                                       ad hoc
email_log.sql                                                ad hoc
verify_schema.sql                                            ad hoc
```

Plus `ALL_MIGRATIONS.sql`, `batch1..3_migrations.sql` and `combined_unapplied_migrations.sql` in `supabase/`.

**Nothing here has been renamed, reordered or deleted.** Rewriting a migration history that has already been applied to a live database holding Vipps payment records is how people lose Saturdays.

## Baselining the development project

`supabase db push` wants to apply every file in `supabase/migrations/` that the target has not recorded. Against the fresh `tinglumgard-dev` project that would attempt the whole storefront history, including the ad-hoc files, in filename order. Some will fail; some will succeed in the wrong order.

TodoTwo does not need the storefront schema. It lives in its own schema and references nothing in `public`. So the recommended baseline is:

1. Mark the pre-existing migrations as already applied on the dev project, without running them:

   ```bash
   npx supabase migration repair --status applied 20260707000000
   ```

   Repeat for each timestamped migration you want recorded. The untimestamped files are not valid migration names and the CLI ignores them.

2. Push only the TodoTwo migrations:

   ```bash
   npm run todotwo:migrate
   ```

3. Confirm:

   ```bash
   npm run todotwo:migrate:status
   ```

If you would rather have a faithful copy of production in dev, run `supabase db dump` against the live project and load it first. That is more work and TodoTwo does not require it — but it is the better option if a later phase ever needs to join against storefront data. It should not.

## Rules for TodoTwo migrations

1. **Name** them `YYYYMMDDHHMMSS_todotwo_<subject>.sql`. The guard test in `tests/todotwo/guards/isolation.test.ts` enforces the pattern.
2. **Forward only.** Never edit a file that has been applied anywhere. Write a new one.
3. **Rollback block.** Every file ends with a commented `-- ROLLBACK:` section containing the reversing statements. Enforced by test.
4. **Stay in the schema.** No `create`, `alter` or `drop` against anything outside `todotwo`, except the one-time grants in the bootstrap migration. Enforced by test.
5. **Idempotent where safe.** `create ... if not exists` for anything that might race.
6. **Grant explicitly.** "Automatically expose new tables" is off on the dev project, so a new table is invisible to PostgREST until the migration grants it. This is deliberate; do not switch the setting on.
7. **Enable RLS in the same migration** that creates the table, with policies. A table that ships without policies is readable by nobody, which is a safer failure than readable by everybody — but it is still a bug.

## Phase 0 migrations

| File | Contents |
|---|---|
| `20260831090000_todotwo_bootstrap.sql` | schema, grants, default privileges, `touch_updated_at()` |
| `20260831090100_todotwo_core.sql` | enums; `people`, `people_private`, `role_assignments`, `locations`, `settings`, `audit_log`; `redact()`; `audit_trigger()` and its five triggers |
| `20260831090200_todotwo_rls.sql` | `current_person_id()`, `has_role()`, `is_admin()`, `is_staff()`; RLS on all six tables; policies; explicit grants; `anon` revoked |

## Promoting to production

Not yet, and not automatically. When TodoTwo eventually runs against the live project it will need, in order: the `todotwo` schema exposed in that project's API settings, the same three migrations pushed, redirect URLs added, and its own environment variables in Netlify. Write that runbook in Phase 12, not before.
