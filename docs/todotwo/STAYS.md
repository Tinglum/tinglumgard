# TodoTwo — stays & accommodation

Phase 3. A person's permanent record (`todotwo.people`) is separate from any
particular visit. `todotwo.stays` is one visit; a returning Workawayer gets a
second row, not a second person.

## Tables

| Table | Purpose |
|---|---|
| `todotwo.stays` | One visit by one person: arrival/departure dates, each with its own `date_certainty`, and a `stay_status`. |
| `todotwo.stays_private` | Admin-only private notes about a stay, split out the same way `people_private` is split from `people`. |
| `todotwo.accommodations` | A bookable place to sleep — a room, cabin, dorm bed or camping spot — optionally located at a `todotwo.locations` row. |
| `todotwo.accommodation_assignments` | A stay's booking into an accommodation for a date range. |
| `todotwo.occupancy_resolved` | A `security_invoker` view joining assignments to their accommodation and person, filtered to current/upcoming stays. |

Migrations: `supabase/migrations/20260905090000_todotwo_stays.sql` and
`20260905090100_todotwo_accommodation.sql`.

## Date certainty

`todotwo.date_certainty` is `preferred | earliest | latest | provisional |
confirmed`, applied independently to a stay's arrival and departure. A stay
can have a confirmed arrival and a provisional departure at the same time —
this is why arrival and departure are separate date + certainty pairs rather
than one flat date column each. `departure_certainty` is only meaningful once
`departure_date` is set; a check constraint enforces that.

## Stay status

`todotwo.stay_status` is `upcoming | current | completed | cancelled`. Nothing
in the database advances this automatically — `lib/todotwo/domain/stays.ts`
exports `deriveStayStatus()`, a pure function a scheduled job or a UI action
can call to compute what the status *should* be from today's date, without it
silently overriding an explicit `cancelled`.

## Double booking is a database guarantee, not an application check

`todotwo.accommodation_assignments` carries a generated `during daterange`
column and

```sql
exclude using gist (
  accommodation_id with =,
  during with &&
)
```

Two overlapping assignments to the same accommodation cannot both exist —
the second insert is rejected by Postgres with a `23P01` exclusion violation,
even if two coordinators submit at the same instant. The UI
(`components/todotwo/accommodation/assign-bed-form.tsx`) does an advisory
client-side overlap check first, using `findConflictingAssignment()` from the
same domain module, purely so the common case shows a friendly message
before the round trip. If that check is ever wrong or skipped, the exclusion
constraint is still the thing that actually stops the double booking — the
form catches `23P01` specifically and shows the same message.

`btree_gist` is enabled once, in the accommodation migration, because the
GiST index needs it to compare the `uuid` and `daterange` columns together.

## RLS

Same shape as the rest of TodoTwo: staff (`todotwo.is_staff()` — admin or
coordinator) manage `stays` and `accommodations`/`accommodation_assignments`
outright. Any signed-in person may **read** current stay status and
occupancy — this is needed for scheduling (Phase 4/5 need to know who is
actually on the farm) and nothing on those rows is sensitive. Anything
sensitive about a stay goes in `stays_private`, which only admins have any
policy on, matching `people_private`.

`occupancy_resolved` is declared `security_invoker = true`, so it grants
nothing beyond what the caller's own RLS on the underlying tables already
allows — it is a convenience join, not a privilege escalation.

## What Kenneth can do

- Add a stay for someone already on the People page — either inline while
  adding the person (`AddPersonForm`'s "Add a stay" checkbox) or afterwards
  at `/todotwo/stays`.
- See who is on the farm right now and who is arriving in the next 30 days
  at `/todotwo/stays`.
- Assign a stay to a room, cabin or dorm bed for a date range at
  `/todotwo/accommodation`, and see current occupancy per accommodation.
- Try to double-book a bed and be told no — by the form if the overlap is
  obvious, and by the database regardless.

## Deferred

- Rooms/beds as separate sub-units of one accommodation (the brief mentions
  "units, rooms and beds"): `accommodations` today models one bookable unit
  at a time — a dorm's individual beds would be four `accommodations` rows,
  not one row with a capacity of four. `capacity` is stored but not yet
  enforced beyond one occupant at a time; multi-occupancy dorms are Phase 3's
  known simplification, not a bug — the migration comment says so.
- Workawayer-facing "my stay" view and arrival/departure editing by the
  Workawayer themselves — Phase 3 gives staff full read/write and everyone
  else read-only, matching the brief's "RLS extended to coordinator and
  workawayer roles" for *reading*; Workawayer self-service on their own stay
  is not in this phase's UI.
