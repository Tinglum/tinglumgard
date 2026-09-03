# TodoTwo — setup

## The development project

| | |
|---|---|
| Project | `tinglumgard-dev` |
| Ref | `cxuukixtooxyipdecbcb` |
| URL | `https://cxuukixtooxyipdecbcb.supabase.co` |
| Region | `eu-central-1` (Frankfurt), same as live |
| Organization | Tinglumgard Dev (`tnmprndrrlfjfsfstday`) |

> **This project lives in a Supabase account that also hosts Zara.** The Tinglum Gård account had used both of its free projects, and the free-project cap is per account. It is acceptable **only** while the database holds nothing but synthetic data, and it **moves out before Phase 10**. See rule R5a in the plan.

Three creation-time settings were chosen deliberately. Do not reverse them:

- **Data API enabled** — `supabase-js` needs it.
- **Automatically expose new tables: off** — nothing reaches PostgREST without an explicit `grant`. If a new table 404s, add the grant to the migration.
- **Automatic RLS: on** — event trigger forcing RLS on new `public` tables. It does not cover `todotwo`; our migrations enable RLS there explicitly.

## Environment variables

In `.env.local` (gitignored via `.env*.local`):

```
TODOTWO_ENABLED=true
TODOTWO_SEED_ALLOWED=true
TODOTWO_DEV_PROJECT_REF=cxuukixtooxyipdecbcb
NEXT_PUBLIC_TODOTWO_SUPABASE_URL=https://cxuukixtooxyipdecbcb.supabase.co
NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY=sb_publishable_…
TODOTWO_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi…

# Web Push. Optional — omitting both leaves the "Enable notifications" toggle
# disabled and the cron dispatcher skips push silently, same as an unconfigured
# Mailgun. Generate a pair with `npx web-push generate-vapid-keys`. Never put a
# real production keypair in a committed file; each environment (dev, prod)
# should have its own.
NEXT_PUBLIC_TODOTWO_VAPID_PUBLIC_KEY=BKY0…
TODOTWO_VAPID_PRIVATE_KEY=ZDe2…
```

The anon slot holds the **new publishable key**; the service-role slot holds the **legacy `service_role` JWT**, matching the naming the rest of the repository uses. They are independent credentials used by different clients, so mixing the two key systems is not a conflict.

> When adding any env file, check the name actually matches a gitignore pattern. `.env*.local` requires the name to *end* in `.local`, so `.env.local.bak` would be committed.

On Netlify, set the same variables per context. `TODOTWO_ENABLED` is the kill switch: set it to anything other than `true` and `/todotwo` returns 404 while the rest of the site is untouched.

## One-time Supabase configuration

1. **Expose the schema.** Supabase → Settings → API → *Exposed schemas* → add `todotwo`. Without this, PostgREST will not serve the schema and every query 404s.
2. **Redirect URLs.** Authentication → URL Configuration → add:
   - `http://localhost:3003/todotwo/auth/callback`
   - `https://xn--tinglumgrd-85a.no/todotwo/auth/callback`
   - `https://tinglumgard.no/todotwo/auth/callback`

   Use the punycode form; some mail clients mangle the Unicode one.
3. **Disable public sign-ups** if you want belt and braces. The login screen already sets `shouldCreateUser: false`, so a stranger cannot create an account from `/todotwo/login`.

## Applying migrations

The CLI is now linked (`supabase/config.toml`, `project_id = "tinglumgard-dev"`). Linking prompts for the database password, which only Kenneth has:

```bash
npx supabase link --project-ref cxuukixtooxyipdecbcb
```

Then:

```bash
npm run todotwo:migrate:status
```

```bash
npm run todotwo:migrate
```

`todotwo:migrate` runs `supabase db push`. Read `MIGRATIONS.md` before the first push — the pre-existing migration folder needs a baseline decision.

## Creating the first account

TodoTwo accounts are administrator-created. No passwords are involved anywhere.

```bash
npm run todotwo:create-admin -- kenneth@tinglum.com "Kenneth Tinglum" super_admin
```

Then sign in at `/todotwo/login`. The script refuses to run against the production project.

## Seeding

```bash
npm run todotwo:seed
```

Aborts unless `TODOTWO_SEED_ALLOWED=true` and the connected project ref matches `TODOTWO_DEV_PROJECT_REF`, and refuses the production ref outright. It only writes to the `todotwo` schema. Everything it inserts is invented — see rule R5a.

## Commands

```bash
npm run dev
```
```bash
npm run typecheck
```
```bash
npm test
```
```bash
npm run test:rls
```
```bash
npm run test:e2e
```

`npm test` is offline: unit tests plus the structural guards. `test:rls` needs the dev project and skips cleanly without it. `test:e2e` starts the dev server itself unless `TODOTWO_E2E_BASE_URL` is set.

## CI

`.github/workflows/quality-guard.yml` gained a `todotwo` job running typecheck-adjacent unit tests and the guards. For the RLS step, add repository secrets `TODOTWO_SUPABASE_URL`, `TODOTWO_SUPABASE_ANON_KEY`, `TODOTWO_SUPABASE_SERVICE_ROLE_KEY` and variable `TODOTWO_DEV_PROJECT_REF`. Without them the step reports a notice and passes rather than pretending to have run.
