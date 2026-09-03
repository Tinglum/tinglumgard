-- TodoTwo Phase 3 — people, stays & accommodation (part 2: accommodation)
--
-- Accommodation units (a room, cabin bed, dorm bunk) and assignments of a
-- person's stay to one, for a date range. The double-booking guarantee is a
-- Postgres EXCLUDE constraint using GIST, not application logic: the database
-- physically refuses two overlapping assignments for the same accommodation.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type todotwo.accommodation_kind as enum (
  'room',
  'cabin',
  'dorm_bed',
  'camping_spot',
  'other'
);

-- ---------------------------------------------------------------------------
-- accommodations — the bookable unit
-- ---------------------------------------------------------------------------

create table todotwo.accommodations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  kind         todotwo.accommodation_kind not null default 'room',
  capacity     integer not null default 1 check (capacity > 0),
  location_id  uuid references todotwo.locations (id) on delete set null,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table todotwo.accommodations is
  'A bookable place to sleep: a room, a cabin, a dorm bed. Capacity is
   informational for now — the exclusion constraint below enforces one
   assignment at a time per accommodation regardless of capacity, which is
   correct for single-occupancy units and deliberately conservative for
   multi-bed dorms until Phase 3 needs per-bed rows instead of per-dorm rows.';

create index accommodations_location_idx on todotwo.accommodations (location_id);
create index accommodations_active_idx on todotwo.accommodations (is_active)
  where deleted_at is null;

create trigger accommodations_touch_updated_at
  before update on todotwo.accommodations
  for each row execute function todotwo.touch_updated_at();

create trigger accommodations_audit
  after insert or update or delete on todotwo.accommodations
  for each row execute function todotwo.audit_trigger();

-- ---------------------------------------------------------------------------
-- accommodation_assignments — a stay in a bed, for a date range
--
-- `during` is a generated daterange from the assignment's own dates, so the
-- EXCLUDE constraint has a single range column to compare. An open-ended
-- assignment (no departure yet) uses an unbounded upper range, which still
-- conflicts correctly with anything that starts before it.
-- ---------------------------------------------------------------------------

create table todotwo.accommodation_assignments (
  id                uuid primary key default gen_random_uuid(),
  accommodation_id  uuid not null references todotwo.accommodations (id) on delete cascade,
  stay_id           uuid not null references todotwo.stays (id) on delete cascade,
  person_id         uuid not null references todotwo.people (id) on delete cascade,
  start_date        date not null,
  end_date          date,
  during            daterange generated always as (
    daterange(start_date, end_date, '[]')
  ) stored,
  created_by_person_id uuid references todotwo.people (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint accommodation_assignments_end_after_start
    check (end_date is null or end_date >= start_date),

  -- The database, not the application, refuses a double-booked bed.
  exclude using gist (
    accommodation_id with =,
    during with &&
  )
);

comment on table todotwo.accommodation_assignments is
  'Who is in which accommodation, for a date range. The EXCLUDE constraint
   makes overlapping assignments to the same accommodation impossible to
   insert, independent of any application-level check.';

create index accommodation_assignments_stay_idx on todotwo.accommodation_assignments (stay_id);
create index accommodation_assignments_person_idx on todotwo.accommodation_assignments (person_id);
create index accommodation_assignments_accommodation_idx
  on todotwo.accommodation_assignments (accommodation_id, start_date);

create trigger accommodation_assignments_touch_updated_at
  before update on todotwo.accommodation_assignments
  for each row execute function todotwo.touch_updated_at();

create trigger accommodation_assignments_audit
  after insert or update or delete on todotwo.accommodation_assignments
  for each row execute function todotwo.audit_trigger();

-- ---------------------------------------------------------------------------
-- RLS — staff manage; any signed-in user may see occupancy (needed for
-- scheduling, same reasoning as stays). Nothing sensitive lives here.
-- ---------------------------------------------------------------------------

alter table todotwo.accommodations             enable row level security;
alter table todotwo.accommodation_assignments  enable row level security;

create policy accommodations_staff_all on todotwo.accommodations
  for all to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

create policy accommodations_select_authenticated on todotwo.accommodations
  for select to authenticated
  using (deleted_at is null and todotwo.current_person_id() is not null);

create policy accommodation_assignments_staff_all on todotwo.accommodation_assignments
  for all to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

create policy accommodation_assignments_select_authenticated on todotwo.accommodation_assignments
  for select to authenticated
  using (todotwo.current_person_id() is not null);

grant select, insert, update, delete on todotwo.accommodations            to authenticated;
grant select, insert, update, delete on todotwo.accommodation_assignments to authenticated;

revoke all on todotwo.accommodations            from anon;
revoke all on todotwo.accommodation_assignments from anon;

-- ---------------------------------------------------------------------------
-- occupancy_resolved — who is where, current and upcoming
--
-- One row per active (non-cancelled) assignment, joined to the person and
-- accommodation, with the stay's own status carried through so a query can
-- filter to "current" or "upcoming" without a second join.
-- ---------------------------------------------------------------------------

create view todotwo.occupancy_resolved
with (security_invoker = true)
as
select
  aa.id                    as assignment_id,
  aa.accommodation_id,
  ac.name                  as accommodation_name,
  ac.kind                  as accommodation_kind,
  ac.location_id,
  aa.stay_id,
  s.status                 as stay_status,
  aa.person_id,
  p.full_name,
  p.preferred_name,
  aa.start_date,
  aa.end_date,
  s.arrival_date,
  s.arrival_certainty,
  s.departure_date,
  s.departure_certainty
from todotwo.accommodation_assignments aa
join todotwo.accommodations ac on ac.id = aa.accommodation_id
join todotwo.stays s on s.id = aa.stay_id
join todotwo.people p on p.id = aa.person_id
where ac.deleted_at is null
  and p.deleted_at is null
  and s.status in ('upcoming', 'current');

comment on view todotwo.occupancy_resolved is
  'Current and upcoming accommodation occupancy. security_invoker so the
   caller''s own RLS on the underlying tables applies — this view grants
   nothing extra.';

grant select on todotwo.occupancy_resolved to authenticated;
revoke all on todotwo.occupancy_resolved from anon;

-- ROLLBACK:
--   drop view if exists todotwo.occupancy_resolved;
--   drop policy if exists accommodation_assignments_select_authenticated on todotwo.accommodation_assignments;
--   drop policy if exists accommodation_assignments_staff_all on todotwo.accommodation_assignments;
--   drop policy if exists accommodations_select_authenticated on todotwo.accommodations;
--   drop policy if exists accommodations_staff_all on todotwo.accommodations;
--   drop table if exists todotwo.accommodation_assignments cascade;
--   drop table if exists todotwo.accommodations cascade;
--   drop type if exists todotwo.accommodation_kind;
--   -- btree_gist is left in place: it is additive and may be relied on elsewhere.
