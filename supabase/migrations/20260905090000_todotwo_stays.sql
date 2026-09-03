-- TodoTwo Phase 3 — people, stays & accommodation (part 1: stays)
--
-- A person can be on the farm more than once. `stays` is one visit; `people`
-- stays the permanent record. Dates carry a certainty because a stay is
-- planned long before it is confirmed: "sometime mid-June" and "arrives
-- Tuesday 16 June" are different facts and the schema should not pretend
-- otherwise by flattening both into one date column.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type todotwo.date_certainty as enum (
  'preferred',
  'earliest',
  'latest',
  'provisional',
  'confirmed'
);

comment on type todotwo.date_certainty is
  'How solid a date is. preferred/earliest/latest describe a range someone is
   still negotiating; provisional is a single date not yet locked; confirmed is
   locked. Applied independently to arrival and departure — a stay can have a
   confirmed arrival and a provisional departure.';

create type todotwo.stay_status as enum (
  'upcoming',
  'current',
  'completed',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- stays — one visit by one person
-- ---------------------------------------------------------------------------

create table todotwo.stays (
  id                      uuid primary key default gen_random_uuid(),
  person_id               uuid not null references todotwo.people (id) on delete cascade,

  arrival_date            date not null,
  arrival_certainty       todotwo.date_certainty not null default 'provisional',
  departure_date          date,
  departure_certainty     todotwo.date_certainty,

  status                  todotwo.stay_status not null default 'upcoming',

  created_by_person_id    uuid references todotwo.people (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint stays_departure_certainty_requires_date
    check (departure_certainty is null or departure_date is not null),
  constraint stays_departure_after_arrival
    check (departure_date is null or departure_date >= arrival_date)
);

comment on table todotwo.stays is
  'One visit by one person. A person may have several over time. Departure is
   nullable: an open-ended stay has an arrival and no departure yet.';

create index stays_person_idx on todotwo.stays (person_id, arrival_date desc);
create index stays_status_idx on todotwo.stays (status);
create index stays_arrival_idx on todotwo.stays (arrival_date);
create index stays_departure_idx on todotwo.stays (departure_date);

create trigger stays_touch_updated_at
  before update on todotwo.stays
  for each row execute function todotwo.touch_updated_at();

create trigger stays_audit
  after insert or update or delete on todotwo.stays
  for each row execute function todotwo.audit_trigger();

-- ---------------------------------------------------------------------------
-- stays_private — admin-only notes about a stay
--
-- Same separation as people/people_private: nothing sensitive lives on the
-- row every signed-in user can read. A private note about a stay (a conduct
-- concern, a sensitive reason for an early departure) goes here instead.
-- ---------------------------------------------------------------------------

create table todotwo.stays_private (
  id            uuid primary key default gen_random_uuid(),
  stay_id       uuid not null unique references todotwo.stays (id) on delete cascade,
  private_notes text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table todotwo.stays_private is
  'Admin-only. Private notes about a stay. No non-admin role has any policy on
   this table, matching todotwo.people_private.';

create trigger stays_private_touch_updated_at
  before update on todotwo.stays_private
  for each row execute function todotwo.touch_updated_at();

create trigger stays_private_audit
  after insert or update or delete on todotwo.stays_private
  for each row execute function todotwo.audit_trigger();

-- ---------------------------------------------------------------------------
-- RLS
--
-- Staff (admin or coordinator) manage stays. Any signed-in user may see who is
-- a Workawayer and their stay status — needed for scheduling — so a plain
-- select policy exists for every authenticated person, same shape as
-- locations_select_authenticated. Nothing sensitive is on this table, so that
-- is safe.
-- ---------------------------------------------------------------------------

alter table todotwo.stays          enable row level security;
alter table todotwo.stays_private  enable row level security;

create policy stays_staff_all on todotwo.stays
  for all to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

create policy stays_select_authenticated on todotwo.stays
  for select to authenticated
  using (todotwo.current_person_id() is not null);

create policy stays_private_admin_all on todotwo.stays_private
  for all to authenticated
  using (todotwo.is_admin())
  with check (todotwo.is_admin());

grant select, insert, update, delete on todotwo.stays          to authenticated;
grant select, insert, update, delete on todotwo.stays_private  to authenticated;

revoke all on todotwo.stays          from anon;
revoke all on todotwo.stays_private  from anon;

-- ROLLBACK:
--   drop policy if exists stays_private_admin_all on todotwo.stays_private;
--   drop policy if exists stays_select_authenticated on todotwo.stays;
--   drop policy if exists stays_staff_all on todotwo.stays;
--   drop table if exists todotwo.stays_private cascade;
--   drop table if exists todotwo.stays cascade;
--   drop type if exists todotwo.stay_status;
--   drop type if exists todotwo.date_certainty;
