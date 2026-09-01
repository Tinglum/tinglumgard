-- TodoTwo Phase 0 — core tables
--
-- Only what every later phase needs: people, their roles, farm locations,
-- settings, and an append-only audit log. Phase 1 adds tasks; nothing else
-- belongs here.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type todotwo.role_name as enum (
  'super_admin',
  'farm_admin',
  'coordinator',
  'workawayer',
  'applicant'
);

create type todotwo.location_kind as enum (
  'building',
  'enclosure',
  'field',
  'forest',
  'water',
  'other'
);

create type todotwo.audit_action as enum ('insert', 'update', 'delete');

-- ---------------------------------------------------------------------------
-- people — the permanent person record
--
-- One row per human, for life. Applications and stays attach to it in later
-- phases, so a returning Workawayer keeps their history. A person may exist
-- with no account at all: applicants and former Workawayers have no auth user.
-- ---------------------------------------------------------------------------

create table todotwo.people (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  full_name     text not null check (length(trim(full_name)) > 0),
  preferred_name text,
  email         text,
  phone         text,
  photo_url     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

comment on table todotwo.people is
  'Permanent person record. Sensitive fields live in todotwo.people_private.';

create unique index people_email_unique
  on todotwo.people (lower(email))
  where deleted_at is null and email is not null;

create index people_auth_user_id_idx on todotwo.people (auth_user_id)
  where deleted_at is null;

create index people_active_idx on todotwo.people (is_active)
  where deleted_at is null;

create trigger people_touch_updated_at
  before update on todotwo.people
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- people_private — everything a Workawayer must never see about anyone
--
-- Split into its own table so RLS can deny it wholesale rather than relying on
-- column lists in queries, and so GDPR export and erasure in Phase 12 have a
-- single target. Nothing here is ever selected by a Workawayer-facing query.
-- ---------------------------------------------------------------------------

create table todotwo.people_private (
  id                          uuid primary key default gen_random_uuid(),
  person_id                   uuid not null unique references todotwo.people (id) on delete cascade,
  emergency_contact_name      text,
  emergency_contact_phone     text,
  emergency_contact_relation  text,
  private_notes               text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table todotwo.people_private is
  'Admin-only. Emergency contacts and private notes. No non-admin role has any policy on this table.';

create trigger people_private_touch_updated_at
  before update on todotwo.people_private
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- role_assignments — who may do what
--
-- Revoked rather than deleted, so the audit trail survives.
-- ---------------------------------------------------------------------------

create table todotwo.role_assignments (
  id                uuid primary key default gen_random_uuid(),
  person_id         uuid not null references todotwo.people (id) on delete cascade,
  role              todotwo.role_name not null,
  granted_by_person_id uuid references todotwo.people (id) on delete set null,
  granted_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  revoked_by_person_id uuid references todotwo.people (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index role_assignments_active_unique
  on todotwo.role_assignments (person_id, role)
  where revoked_at is null;

create index role_assignments_person_idx
  on todotwo.role_assignments (person_id, role)
  where revoked_at is null;

create trigger role_assignments_touch_updated_at
  before update on todotwo.role_assignments
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- locations — the farm itself
--
-- Coordinates are nullable now so a graphical map can be added in Phase 8
-- without a schema change.
-- ---------------------------------------------------------------------------

create table todotwo.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  slug         text not null unique,
  kind         todotwo.location_kind not null default 'other',
  parent_id    uuid references todotwo.locations (id) on delete set null,
  description  text,
  access_notes text,
  latitude     numeric(9, 6) check (latitude between -90 and 90),
  longitude    numeric(9, 6) check (longitude between -180 and 180),
  photo_url    text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint locations_not_own_parent check (parent_id is null or parent_id <> id)
);

create index locations_parent_idx on todotwo.locations (parent_id);
create index locations_sort_idx on todotwo.locations (sort_order, name);

create trigger locations_touch_updated_at
  before update on todotwo.locations
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- settings — admin-configurable values
--
-- Never secrets. Secrets are environment variables, server-side only.
-- ---------------------------------------------------------------------------

create table todotwo.settings (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique check (length(trim(key)) > 0),
  value               jsonb not null,
  description         text,
  updated_by_person_id uuid references todotwo.people (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table todotwo.settings is
  'Admin-configurable values. Never store secrets here; secrets are environment variables.';

create trigger settings_touch_updated_at
  before update on todotwo.settings
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log — append only
-- ---------------------------------------------------------------------------

create table todotwo.audit_log (
  id                  bigint generated always as identity primary key,
  occurred_at         timestamptz not null default now(),
  actor_person_id     uuid references todotwo.people (id) on delete set null,
  actor_auth_user_id  uuid,
  entity_schema       text not null,
  entity_table        text not null,
  entity_id           uuid,
  action              todotwo.audit_action not null,
  before              jsonb,
  after               jsonb
);

create index audit_log_entity_idx on todotwo.audit_log (entity_table, entity_id, occurred_at desc);
create index audit_log_actor_idx on todotwo.audit_log (actor_person_id, occurred_at desc);
create index audit_log_occurred_idx on todotwo.audit_log (occurred_at desc);

-- ---------------------------------------------------------------------------
-- Audit machinery
-- ---------------------------------------------------------------------------

-- Sensitive keys never reach the audit log in cleartext. Extend this list
-- whenever a sensitive column is added anywhere in the schema.
create or replace function todotwo.redact(payload jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_object_agg(
        key,
        case
          when key in (
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relation',
            'private_notes'
          ) and value is not null and value <> 'null'::jsonb
          then to_jsonb('[redacted]'::text)
          else value
        end
      )
      from jsonb_each(payload)
    ),
    '{}'::jsonb
  );
$$;

create or replace function todotwo.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_actor_auth   uuid := auth.uid();
  v_actor_person uuid;
  v_before       jsonb;
  v_after        jsonb;
  v_entity_id    uuid;
begin
  if v_actor_auth is not null then
    select p.id into v_actor_person
    from todotwo.people p
    where p.auth_user_id = v_actor_auth;
  end if;

  if tg_op = 'DELETE' then
    v_before := todotwo.redact(to_jsonb(old));
    v_entity_id := old.id;
  elsif tg_op = 'UPDATE' then
    v_before := todotwo.redact(to_jsonb(old));
    v_after := todotwo.redact(to_jsonb(new));
    v_entity_id := new.id;
  else
    v_after := todotwo.redact(to_jsonb(new));
    v_entity_id := new.id;
  end if;

  insert into todotwo.audit_log (
    actor_person_id, actor_auth_user_id, entity_schema, entity_table,
    entity_id, action, before, after
  )
  values (
    v_actor_person, v_actor_auth, tg_table_schema, tg_table_name,
    v_entity_id, lower(tg_op)::todotwo.audit_action, v_before, v_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger people_audit
  after insert or update or delete on todotwo.people
  for each row execute function todotwo.audit_trigger();

create trigger people_private_audit
  after insert or update or delete on todotwo.people_private
  for each row execute function todotwo.audit_trigger();

create trigger role_assignments_audit
  after insert or update or delete on todotwo.role_assignments
  for each row execute function todotwo.audit_trigger();

create trigger locations_audit
  after insert or update or delete on todotwo.locations
  for each row execute function todotwo.audit_trigger();

create trigger settings_audit
  after insert or update or delete on todotwo.settings
  for each row execute function todotwo.audit_trigger();

-- ROLLBACK:
--   drop table if exists todotwo.audit_log cascade;
--   drop table if exists todotwo.settings cascade;
--   drop table if exists todotwo.locations cascade;
--   drop table if exists todotwo.role_assignments cascade;
--   drop table if exists todotwo.people_private cascade;
--   drop table if exists todotwo.people cascade;
--   drop function if exists todotwo.audit_trigger();
--   drop function if exists todotwo.redact(jsonb);
--   drop type if exists todotwo.audit_action;
--   drop type if exists todotwo.location_kind;
--   drop type if exists todotwo.role_name;
