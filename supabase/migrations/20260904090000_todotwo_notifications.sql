-- TodoTwo Phase 6 — the notification outbox
--
-- Notifications are queued, never sent inline. A request path writes a row and
-- returns; a cron run picks it up and talks to the email provider. That means a
-- slow or unreachable provider cannot hold a page open, and a failed send is a
-- row with an error on it rather than a message that quietly never happened.
--
-- Idempotency is the unique dedupe key. Every producer builds the same string
-- for the same logical notification, so enqueueing twice — a retried trigger,
-- an overlapping cron run, a re-published announcement — is a no-op rather than
-- a second email. That is enforced by the database, not by the caller
-- remembering to check.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Only email today. Resend is the one channel that exists; an in-app channel
-- would need a read path and a UI, and shipping the enum value without them
-- would be an unreachable value.
create type todotwo.notification_channel as enum ('email');

create type todotwo.notification_status as enum ('pending', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- notification_outbox
-- ---------------------------------------------------------------------------

create table todotwo.notification_outbox (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references todotwo.people (id) on delete cascade,
  channel          todotwo.notification_channel not null default 'email',
  -- Where the address is frozen at enqueue time. If someone's email changes
  -- between queueing and sending, the message still goes where it was aimed,
  -- and the row stays a faithful record of what was attempted.
  recipient_email  text not null check (position('@' in recipient_email) > 1),
  subject          text not null check (length(trim(subject)) > 0),
  body             text not null check (length(trim(body)) > 0),
  -- What this is about, so a read path can show delivery beside the thing that
  -- caused it. Free text rather than an enum: producers are added by later
  -- phases and an enum here would need a migration for each one.
  topic            text not null check (length(trim(topic)) > 0),
  reference_id     uuid,
  dedupe_key       text not null unique,
  status           todotwo.notification_status not null default 'pending',
  attempts         integer not null default 0 check (attempts >= 0),
  last_error       text,
  -- Backoff. A pending row is invisible to the dispatcher until this passes.
  next_attempt_at  timestamptz not null default now(),
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table todotwo.notification_outbox is
  'Queued outbound notifications. Unique dedupe_key makes enqueueing idempotent; the cron dispatcher is the only sender.';
comment on column todotwo.notification_outbox.dedupe_key is
  'Built by todotwo.notification_dedupe_key(). Same logical notification, same key, at most one row.';

create index notification_outbox_due_idx
  on todotwo.notification_outbox (next_attempt_at)
  where status = 'pending';

create index notification_outbox_person_idx
  on todotwo.notification_outbox (person_id, created_at desc);

create index notification_outbox_reference_idx
  on todotwo.notification_outbox (topic, reference_id);

create trigger notification_outbox_touch_updated_at
  before update on todotwo.notification_outbox
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- The dedupe key, in the database
--
-- Mirrored by notificationDedupeKey() in lib/todotwo/notifications/dedupe.ts,
-- because producers exist on both sides: SQL triggers fan announcements out,
-- and TypeScript enqueues everything else. A test asserts the two agree, so a
-- change to one that is not made to the other fails the build rather than
-- quietly sending a duplicate.
-- ---------------------------------------------------------------------------

create or replace function todotwo.notification_dedupe_key(
  p_topic        text,
  p_reference_id uuid,
  p_person_id    uuid,
  p_channel      todotwo.notification_channel
)
returns text
language sql
immutable
set search_path = todotwo, public, pg_temp
as $$
  select lower(trim(p_topic)) || ':' || coalesce(p_reference_id::text, '-')
         || ':' || p_person_id::text || ':' || p_channel::text;
$$;

revoke all on function todotwo.notification_dedupe_key(text, uuid, uuid, todotwo.notification_channel)
  from public, anon;
grant execute on function todotwo.notification_dedupe_key(text, uuid, uuid, todotwo.notification_channel)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Enqueue
--
-- security definer so that a fan-out can queue a message for somebody else
-- without any role holding a blanket INSERT on the outbox. Staff only; the
-- caller is re-verified here rather than trusted.
--
-- Returns the row id, or the id of the row that already existed. Never raises
-- on a duplicate: "this was already queued" is a success, not an error.
-- ---------------------------------------------------------------------------

create or replace function todotwo.enqueue_notification(
  p_person_id    uuid,
  p_subject      text,
  p_body         text,
  p_topic        text,
  p_reference_id uuid default null,
  p_channel      todotwo.notification_channel default 'email'
)
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_key   text;
  v_email text;
  v_id    uuid;
begin
  if not todotwo.is_staff() then
    raise exception 'Only staff may queue notifications' using errcode = 'insufficient_privilege';
  end if;

  select email into v_email
  from todotwo.people
  where id = p_person_id and deleted_at is null and is_active;

  -- No address is not an error: people without an account are a normal part of
  -- the roster. There is simply nothing to send.
  if v_email is null or position('@' in v_email) < 2 then
    return null;
  end if;

  v_key := todotwo.notification_dedupe_key(p_topic, p_reference_id, p_person_id, p_channel);

  insert into todotwo.notification_outbox
    (person_id, channel, recipient_email, subject, body, topic, reference_id, dedupe_key)
  values
    (p_person_id, p_channel, v_email, p_subject, p_body, p_topic, p_reference_id, v_key)
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from todotwo.notification_outbox where dedupe_key = v_key;
  end if;

  return v_id;
end;
$$;

revoke all on function todotwo.enqueue_notification(uuid, text, text, text, uuid, todotwo.notification_channel)
  from public, anon;
grant execute on function todotwo.enqueue_notification(uuid, text, text, text, uuid, todotwo.notification_channel)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Read: staff see the whole queue, because someone has to be able to answer
-- "did that go out?". A person sees the notifications addressed to them and
-- nobody else's.
--
-- Write: nobody. There is no insert, update or delete policy, and no role holds
-- those privileges. Rows arrive through enqueue_notification() above, and only
-- the cron dispatcher — which holds the service role and therefore bypasses
-- policy — marks them sent or failed. That keeps attempts and last_error
-- honest: a user cannot clear their own failed send.
-- ---------------------------------------------------------------------------

alter table todotwo.notification_outbox enable row level security;

create policy notification_outbox_staff_select on todotwo.notification_outbox
  for select to authenticated
  using (todotwo.is_staff());

create policy notification_outbox_own_select on todotwo.notification_outbox
  for select to authenticated
  using (person_id = todotwo.current_person_id());

grant select on todotwo.notification_outbox to authenticated;
revoke insert, update, delete on todotwo.notification_outbox from authenticated;
revoke all on todotwo.notification_outbox from anon;

-- ROLLBACK:
--   drop function if exists todotwo.enqueue_notification(uuid, text, text, text, uuid, todotwo.notification_channel);
--   drop function if exists todotwo.notification_dedupe_key(text, uuid, uuid, todotwo.notification_channel);
--   drop table if exists todotwo.notification_outbox cascade;
--   drop type if exists todotwo.notification_status;
--   drop type if exists todotwo.notification_channel;
