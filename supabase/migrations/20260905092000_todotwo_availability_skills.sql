-- TodoTwo Phase 4 — availability, time off & skills
--
-- Two things share a migration because they are related in exactly one way:
-- both feed the assignment engine (Phase 5) as hard constraints on who may be
-- put on a task. Otherwise they are independent — time off is a workflow with
-- a decision, skills are a catalogue with per-person claims.
--
-- Tables, enums and the skill catalogue seed go here. RLS, the security-definer
-- decision function and grants go in the next migration so a table never ships
-- without policy in the same commit that creates it, per docs/todotwo/MIGRATIONS.md
-- rule 7 — this file still enables RLS with no policies, which fails closed.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type todotwo.time_off_kind as enum (
  'day_off',
  'appointment',
  'trip',
  'illness',
  'partial_day'
);

create type todotwo.time_off_status as enum (
  'pending',
  'approved',
  'declined'
);

create type todotwo.skill_level as enum (
  'novice',
  'competent',
  'proficient',
  'expert'
);

-- ---------------------------------------------------------------------------
-- time_off_requests
--
-- One row per request. start_date/end_date are inclusive calendar days in farm
-- time (see lib/todotwo/time.ts) — a single day off is start_date = end_date.
-- partial_day requests still use whole days here; the time-of-day detail, if
-- ever needed, is free text in `notes` rather than a new column nobody asked
-- for yet.
-- ---------------------------------------------------------------------------

create table todotwo.time_off_requests (
  id                    uuid primary key default gen_random_uuid(),
  person_id             uuid not null references todotwo.people (id) on delete cascade,
  start_date            date not null,
  end_date              date not null,
  kind                  todotwo.time_off_kind not null default 'day_off',
  reason                text,
  status                todotwo.time_off_status not null default 'pending',
  requested_at          timestamptz not null default now(),
  decided_by_person_id  uuid references todotwo.people (id) on delete set null,
  decided_at            timestamptz,
  decision_note         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint time_off_requests_dates_ordered check (end_date >= start_date),
  constraint time_off_requests_decision_consistent check (
    (status = 'pending' and decided_by_person_id is null and decided_at is null)
    or (status <> 'pending' and decided_at is not null)
  )
);

comment on table todotwo.time_off_requests is
  'Time-off and availability requests. An approved row is a hard constraint the '
  'assignment engine must read — see getApprovedUnavailability() in '
  'lib/todotwo/queries.ts and docs/todotwo/AVAILABILITY.md.';

create index time_off_requests_person_idx
  on todotwo.time_off_requests (person_id, start_date);

create index time_off_requests_status_idx
  on todotwo.time_off_requests (status, start_date);

-- The query the assignment engine actually runs: approved rows overlapping a
-- window. This index makes that a range scan rather than a sequential one.
create index time_off_requests_approved_range_idx
  on todotwo.time_off_requests (start_date, end_date)
  where status = 'approved';

create trigger time_off_requests_touch_updated_at
  before update on todotwo.time_off_requests
  for each row execute function todotwo.touch_updated_at();

alter table todotwo.time_off_requests enable row level security;

-- ---------------------------------------------------------------------------
-- skills — the catalogue
--
-- Reference data, not personal data: it is the list of things a person on this
-- farm might know how to do, not who knows them. Safe to ship seeded, and not
-- gated by the synthetic-data-only rule (R5a) because it names no person.
-- ---------------------------------------------------------------------------

create table todotwo.skills (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,
  category     text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table todotwo.skills is
  'The skill catalogue. Reference data — seeded in this migration, not personal data.';

create unique index skills_slug_unique on todotwo.skills (slug) where deleted_at is null;
create index skills_category_idx on todotwo.skills (category, sort_order, name) where deleted_at is null;

create trigger skills_touch_updated_at
  before update on todotwo.skills
  for each row execute function todotwo.touch_updated_at();

alter table todotwo.skills enable row level security;

-- ---------------------------------------------------------------------------
-- person_skills — per-person claims and admin verification
--
-- claimed_level is set by the person themselves ("I can do this"). verified_level
-- is set only by staff, through todotwo.set_skill_verification() in the next
-- migration, never by a direct table update from a Workawayer — see RLS.md's
-- pattern for narrow writes. The two are deliberately separate columns: what
-- someone claims and what has been checked are different facts, and collapsing
-- them would let a claim read as a verification.
-- ---------------------------------------------------------------------------

create table todotwo.person_skills (
  id                        uuid primary key default gen_random_uuid(),
  person_id                 uuid not null references todotwo.people (id) on delete cascade,
  skill_id                  uuid not null references todotwo.skills (id) on delete cascade,
  claimed_level             todotwo.skill_level,
  admin_verified_level      todotwo.skill_level,
  trainer_person_id         uuid references todotwo.people (id) on delete set null,
  trained_at                date,
  expires_at                date,
  notes                     text,
  authorized_unsupervised   boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (person_id, skill_id)
);

comment on table todotwo.person_skills is
  'Per-person skill claims and admin verification. claimed_level is self-reported; '
  'admin_verified_level and authorized_unsupervised are staff-write-only, enforced by '
  'todotwo.set_skill_verification() rather than table policy — see RLS.md.';

create index person_skills_person_idx on todotwo.person_skills (person_id);
create index person_skills_skill_idx on todotwo.person_skills (skill_id);

create trigger person_skills_touch_updated_at
  before update on todotwo.person_skills
  for each row execute function todotwo.touch_updated_at();

alter table todotwo.person_skills enable row level security;

-- ---------------------------------------------------------------------------
-- Skill catalogue seed
--
-- Matches the farm's actual work per docs/todotwo/IMPORT-DRIFT.md and the
-- imported Todoist categories (animal handling across pigs/goats/chickens/
-- ducks/Liam, cooking, garden, and the machinery categories named in the brief).
-- Seed-safe: insert ... on conflict do nothing, keyed on the unique slug.
-- ---------------------------------------------------------------------------

insert into todotwo.skills (name, slug, description, category, sort_order)
values
  ('Animal handling — livestock', 'animal-handling-livestock',
   'Safe handling of pigs, goats and other livestock: feeding, moving, restraining for treatment.',
   'animals', 10),
  ('Animal handling — poultry', 'animal-handling-poultry',
   'Handling chickens and ducks: collecting eggs, closing up at night, catching an escapee.',
   'animals', 20),
  ('Dog handling', 'dog-handling',
   'Walking and caring for the farm dog unsupervised.',
   'animals', 30),
  ('Cooking for the house', 'cooking',
   'Preparing meals for the household and guests, including dietary substitutions.',
   'kitchen', 40),
  ('Food hygiene', 'food-hygiene',
   'Safe food storage, preparation and cleaning practice in a shared kitchen.',
   'kitchen', 50),
  ('Tractor operation', 'tractor-machinery',
   'Operating the farm tractor and its attachments.',
   'machinery', 60),
  ('Chainsaw operation', 'chainsaw',
   'Safe chainsaw use, including personal protective equipment.',
   'machinery', 70),
  ('Power tools', 'power-tools',
   'Safe use of drills, saws and other electric or battery power tools.',
   'machinery', 80),
  ('Driving — farm vehicles', 'driving',
   'Licensed and confident driving of the farm''s road vehicles.',
   'machinery', 90)
on conflict (slug) do nothing;

create trigger time_off_requests_audit
  after insert or update or delete on todotwo.time_off_requests
  for each row execute function todotwo.audit_trigger();

create trigger skills_audit
  after insert or update or delete on todotwo.skills
  for each row execute function todotwo.audit_trigger();

create trigger person_skills_audit
  after insert or update or delete on todotwo.person_skills
  for each row execute function todotwo.audit_trigger();

-- ROLLBACK:
--   drop trigger if exists person_skills_audit on todotwo.person_skills;
--   drop trigger if exists skills_audit on todotwo.skills;
--   drop trigger if exists time_off_requests_audit on todotwo.time_off_requests;
--   drop table if exists todotwo.person_skills cascade;
--   drop table if exists todotwo.skills cascade;
--   drop table if exists todotwo.time_off_requests cascade;
--   drop type if exists todotwo.skill_level;
--   drop type if exists todotwo.time_off_status;
--   drop type if exists todotwo.time_off_kind;
