# TodoTwo — availability, time off & skills

Phase 4. Two features that share this document because both feed the Phase 5
assignment engine as hard constraints on who may be put on a task: approved
time off (this page) and, more loosely, skill requirements on tasks (schema
only for now — task-level skill requirements are not wired up in Phase 4 and
are a later phase's job).

## Time off

`todotwo.time_off_requests` — one row per request. `start_date`/`end_date` are
inclusive farm-local calendar days (`lib/todotwo/time.ts`); a single day off is
`start_date = end_date`. `kind` is one of `day_off`, `appointment`, `trip`,
`illness`, `partial_day`. `status` is `pending` → `approved` / `declined`.

A Workawayer inserts their own request directly (RLS policy
`time_off_requests_insert_own` only allows their own `person_id` and a
`pending` status with no decision fields set). Nobody — including staff — has
an UPDATE grant on the table. The only way a request changes status is
`todotwo.decide_time_off(p_request_id, p_decision, p_note)`, a
`security definer` function that re-checks `todotwo.is_staff()` itself before
writing, following the exact pattern `todotwo.assign_task()` uses in
`20260903090300_todotwo_rota.sql`. This is deliberate: RLS alone cannot express
"the pending → approved transition is staff-only, and only once" — see
docs/todotwo/RLS.md, "The pattern Phase 1 will need".

## The integration point for the assignment engine

**This is the part another agent, working in parallel on Phase 5, needs.**

`lib/todotwo/queries.ts` exports two read functions over approved time off.
Both read through the ordinary `todotwo`-schema RLS client
(`lib/todotwo/db.ts`) — nothing here uses the service-role client, per R2. The
assignment engine must call these as a signed-in staff user (coordinator or
admin), which is what lets it see every person's approved rows rather than
only its own.

```ts
import { getApprovedUnavailability, getUnavailabilityForDateRange } from '@/lib/todotwo/queries'

// One person, one window:
const rows = await getApprovedUnavailability(personId, { from: '2026-09-08', to: '2026-09-14' })
// => { id: string; start_date: FarmDate; end_date: FarmDate; kind: string }[]

// Every person at once, keyed by person_id — cheaper than calling the above
// once per person when generating a whole day or week:
const byPerson = await getUnavailabilityForDateRange({ from: '2026-09-08', to: '2026-09-14' })
// => Map<string, { id, start_date, end_date, kind }[]>
```

**Contract:** every row returned has `status = 'approved'` already filtered
server-side — callers never see `pending` or `declined` rows from these two
functions, so there is no need to check `status` again. A row overlaps the
requested `[from, to]` window if `start_date <= to && end_date >= from`
(inclusive on both ends, matching `rangesOverlap()` in
`lib/todotwo/domain/availability.ts`, exported for reuse if the engine wants
the same overlap check on its own data).

**How to use it as a hard constraint:** for a candidate `(person, date)` pair,
the person is unavailable if `date` falls within `[start_date, end_date]` of
any row returned for them — the exported `dateInRange()` helper in
`lib/todotwo/domain/availability.ts` does exactly that check. A `pending`
request has no effect on assignment; only `approved` counts, by construction of
the query.

These functions are additive and were placed at the end of `queries.ts`
(append-only, per this phase's constraints) — they do not touch or reorder
anything the Phase 5 agent added there.

## Skills

`todotwo.skills` — the catalogue. Reference data, seeded in
`20260905092000_todotwo_availability_skills.sql` with the farm's actual work
(animal handling — livestock, animal handling — poultry, dog handling, cooking,
food hygiene, tractor operation, chainsaw, power tools, driving), grouped by
`category`. Anyone signed in can read it; only staff can add, edit or retire an
entry (`skills_staff_write`).

`todotwo.person_skills` — one row per (person, skill). Two separate level
columns by design, per the brief: `claimed_level` is what the person says about
themselves, `admin_verified_level` is what staff have checked. They are never
conflated, and a Workawayer cannot write `admin_verified_level`,
`authorized_unsupervised`, `trainer_person_id` or `trained_at` on their own row
— those columns are reachable only through
`todotwo.set_skill_verification(...)`, which re-checks `todotwo.is_staff()`
inside the function body, not just at the RLS layer. A person claims or updates
their own level through `todotwo.claim_skill(p_skill_id, p_claimed_level,
p_notes)`, which reads their identity from `todotwo.current_person_id()` —
there is no argument to substitute someone else's `person_id`.

`expires_at` and `trained_at` exist on the table now (set via
`set_skill_verification`) so a later phase can flag lapsed training without a
schema change; nothing in Phase 4 reads or enforces expiry yet — that is
explicitly deferred, see the delivery report.

## What this phase deliberately did not build

- Skill requirements on tasks or templates (the brief mentions this; it needs
  the task/template schema, which belongs to the Phase 1/5 agents' files —
  out of scope here per the file-ownership constraints on this phase).
- Any UI or logic that reads `expires_at` to warn about lapsing skills.
- A nav link to `/todotwo/availability` or `/todotwo/skills` —
  `components/todotwo/shell/navigation.ts` was intentionally left untouched
  since another agent may be editing it concurrently. Add entries there
  pointing at `TODOTWO_BASE + '/availability'` and `TODOTWO_BASE + '/skills'`
  when convenient.
