# TodoTwo — architecture

Written during Phase 0, 31 August 2026, from inspection of this repository rather than assumption.

## 1. What this repository is

| | |
|---|---|
| Framework | Next.js **13.5.11**, App Router, React 18.2, TypeScript 5.2 (`target: es5`) |
| Hosting | Netlify, `@netlify/plugin-nextjs` 5.15.8 |
| Styling | Tailwind 3.3.3, 49 shadcn/Radix primitives in `components/ui` |
| Database | Supabase, `@supabase/supabase-js` ^2.58.0 |
| Scheduling | GitHub Actions cron → `POST /api/cron/*` guarded by `CRON_SECRET`. No worker process |
| Routes | 277 Route Handlers under `app/api` |

`app/` holds the storefront (`bestill`, `produkt`, `min-side`, `kutt`, `oppdelingsplan`), operations modules (`egg`, `milk`, `drift/egg-ops`, `kyllinger`, `rugeegg`), and content pages. TodoTwo adds `app/todotwo` and `app/api/todotwo` and touches nothing else.

## 2. Findings that shaped the design

### 2.1 There is no Supabase Auth, and RLS is inert

Authentication is a hand-rolled `jose` JWT in a cookie (`lib/auth/session.ts`). Identity comes from Vipps (`vippsSub`) or a shared password (`ADMIN_PASSWORD`, `OPERATIONS_PASSWORD`). Roles are claims inside that JWT (`lib/auth/roles.ts`), with per-module gates in `lib/auth/egg-ops-access.ts` and `milk-ops-access.ts`.

Consequently **`auth.uid()` is null for every existing request**, and every query in the repository runs through the service-role client in `lib/supabase/server.ts`, which bypasses Row Level Security entirely. Any RLS policy written today would never be exercised.

TodoTwo therefore uses **Supabase Auth** with magic links, and its own session. The two coexist: different cookies, different clients, no shared state. Workawayers need per-person identities that the existing scheme cannot express at all.

### 2.2 Server Actions are not available

Next 13.5 gates them behind `experimental.serverActions`. The repository uses Route Handlers throughout. TodoTwo does the same.

### 2.3 The shadcn primitives are unstyled

`components/ui/*` reference `bg-primary`, `text-primary-foreground`, `bg-background`, `ring-ring` and similar. Neither `tailwind.config.ts` (whose `colors` block is an empty comment) nor `app/globals.css` defines them. Those classes currently produce no CSS.

Defining the tokens globally would restyle every shadcn component across the live storefront in one commit — exactly what Phase 0 must not do. So TodoTwo carries its own tokens, scoped to `.todotwo-root` in `app/todotwo/todotwo.css`, and its own primitives in `components/todotwo/ui/`. The storefront is untouched.

This is a real inconsistency in the repository worth fixing one day. It is not Phase 0's job.

### 2.4 The Supabase CLI was not linked

No `supabase/config.toml` existed; migrations were applied by hand, which is why `supabase/migrations/` contains both timestamped files and loose ones like `fix_missing_columns.sql` and `complete_migrations.sql`. Phase 0 runs `supabase init` and establishes discipline going forward without rewriting history. See `MIGRATIONS.md`.

### 2.5 `check:encoding` already fails on main

`components/ChickenOrderCard.tsx` and `components/orders/PigOrderUnifiedCard.tsx` contain mojibake on `main`, so the Quality Guard workflow was red before TodoTwo existed. No TodoTwo file is flagged. Left alone deliberately.

### 2.6 The domain is internationalised

tinglumgård.no is `xn--tinglumgrd-85a.no`. `middleware.ts` already handles both spellings for the eggops subdomain. `lib/todotwo/host.ts` does the same for every TodoTwo link, comparison and callback.

## 3. How TodoTwo is put together

```
app/todotwo/                  pages; layout provides the scoped token root
  (app)/                      everything behind authentication
  login/                      magic-link sign-in, outside the auth group
  auth/callback/              one-time code exchange
app/api/todotwo/              route handlers
components/todotwo/           shell and TodoTwo's own primitives
lib/todotwo/                  config, routes, host, time, db clients, auth
supabase/migrations/*_todotwo_*.sql
tests/todotwo/                unit, guards, rls, e2e
scripts/todotwo/              seed, account creation
```

### Database access

| Module | Key | Schema | Where it may be used |
|---|---|---|---|
| `lib/todotwo/db.ts` | publishable (session-bound) | `todotwo` | anywhere in a request |
| `lib/todotwo/db-browser.ts` | publishable | `todotwo` | client components |
| `lib/todotwo/db-privileged.ts` | service role | `todotwo` | cron and scripts **only** |

Every client is pinned to the `todotwo` schema, so `public.orders` and the rest of the storefront are not addressable — that is asserted in `tests/todotwo/rls/policies.test.ts`. The service-role rule is asserted structurally in `tests/todotwo/guards/isolation.test.ts`, which fails the build on any reference outside the one permitted file.

### Middleware

`middleware.ts` gained one branch at the top of `middleware()`, before any existing logic:

```ts
if (isTodoTwoPath(request.nextUrl.pathname)) {
  return handleTodoTwoMiddleware(request)
}
```

It returns immediately, so eggops host rewriting, milk paths and the IP allowlist are unreachable from a TodoTwo request and unchanged for everything else. `handleTodoTwoMiddleware` enforces `TODOTWO_ENABLED` and refreshes the Supabase session.

### Time

`FARM_TZ = 'Europe/Oslo'` in `lib/todotwo/time.ts`. Instants are `timestamptz`; calendar days are `date`. Recurrence in Phase 2 expands in local wall time before converting, so a 07:00 routine stays 07:00 across both DST transitions. Tested at the March and October boundaries for 2026 and 2027.

## 4. Reused, and not

**Reused:** Tailwind, `cn()` from `lib/utils`, `lucide-react`, `class-variance-authority`, `@radix-ui/react-slot` and `react-alert-dialog`, the GitHub Actions cron pattern, Resend (from Phase 6), the punycode approach in `middleware.ts`.

**Not reused, with reason:** `components/ui/*` (unstyled, §2.3); `lib/auth/*` (no per-person identity, §2.1); `lib/supabase/server.ts` (service role, bypasses RLS); `components/Header.tsx` and `Footer.tsx` (marketing chrome on an operational tool).
