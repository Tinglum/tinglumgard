# Phase 0 — manual verification

Automated tests cover everything that can be checked without a mailbox. These are the rest.

## Before you start

```bash
npx supabase link --project-ref cxuukixtooxyipdecbcb
```
```bash
npm run todotwo:migrate
```
```bash
npm run todotwo:seed
```
```bash
npm run todotwo:create-admin -- kenneth@tinglum.com "Kenneth Tinglum" super_admin
```
```bash
npm run dev
```

Read `MIGRATIONS.md` before the first push — the pre-existing migration folder needs a baseline decision. And confirm `todotwo` is listed under Supabase → Settings → API → Exposed schemas, or every query will 404.

## Sign-in

- [ ] `/todotwo` redirects to `/todotwo/login`.
- [ ] The form has an email field and no password field.
- [ ] Submitting empty shows "Skriv inn e-postadressen din".
- [ ] Submitting your address shows the "Sjekk e-posten din" panel.
- [ ] The email arrives and its link points at `/todotwo/auth/callback`.
- [ ] Following it lands on `/todotwo` showing your name, `Systemansvarlig`, and today's farm date.
- [ ] Following the same link a second time returns to login with a readable error, not a stack trace.
- [ ] An address with no `people` row is refused with "har ikke tilgang", and leaves you signed out rather than half-signed-in.
- [ ] "Logg ut" returns you to the login screen, and `/todotwo` no longer opens.

## The kill switch

Set `TODOTWO_ENABLED=false`, restart, then:

- [ ] `/todotwo` returns 404.
- [ ] `/api/todotwo/auth/logout` returns a JSON 404.
- [ ] The front page renders normally.
- [ ] `/bestill` renders and a product can be added to the basket.
- [ ] `/min-side` behaves as before.
- [ ] `/drift/egg-ops` and `/milk` behave as before.

Set it back to `true` and confirm TodoTwo returns.

## Session coexistence

- [ ] Sign in to TodoTwo, then confirm an existing Vipps session on the storefront still works.
- [ ] Sign out of TodoTwo and confirm the Vipps session survived.

The two use different cookies; this is checking that in practice, not in theory.

## Mobile

At 375px wide, on a real phone if possible:

- [ ] No horizontal scrolling on the login screen or the overview.
- [ ] The email field does not trigger iOS zoom on focus — its font-size is 16px for exactly this reason.
- [ ] Tap targets are comfortable in gloves.
- [ ] The bottom bar does not sit under the home indicator.

## Accessibility

- [ ] Tab through the login form: focus is always visible.
- [ ] The form is operable by keyboard alone.
- [ ] The error message is announced — it carries `role="alert"`.

## Data isolation

In the Supabase SQL editor on the **dev** project:

- [ ] `select count(*) from todotwo.people;` returns your row.
- [ ] `select count(*) from todotwo.locations;` returns 13.
- [ ] `select * from todotwo.audit_log order by occurred_at desc limit 5;` shows your account creation, attributed.

Then:

```bash
npm run test:rls
```

- [ ] Passes.
- [ ] Point `NEXT_PUBLIC_TODOTWO_SUPABASE_URL` at the production project and confirm it **refuses to run**. Put it back afterwards.

## Sign-off

Phase 0 is done when every box is ticked and `npm run typecheck`, `npm test` and `npm run test:e2e` are green. Then, and only then, start Phase 1.
