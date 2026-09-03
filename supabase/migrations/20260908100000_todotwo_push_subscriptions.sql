-- TodoTwo — Web Push subscriptions
--
-- A second delivery channel for the existing notification_outbox (Phase 6):
-- endpoints registered by a person's browser so the cron dispatcher can also
-- ping a phone or desktop instead of, or alongside, email.
--
-- Unlike webauthn_credentials, there is no security-definer write path here.
-- A push subscription is not a credential that grants access to anything — it
-- is an opaque, per-device delivery address the browser itself generated, and
-- the worst an attacker who could forge one could do is make a device that
-- isn't theirs show a notification it was already entitled to receive (their
-- own person_id, enforced by RLS). A plain insert policy is enough.
--
-- Staff get no special access: push endpoints are device tokens, not content,
-- and there is no operational reason for a coordinator to see or delete
-- another person's registered device.

create table todotwo.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references todotwo.people (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth_key      text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

comment on table todotwo.push_subscriptions is
  'Web Push endpoints registered by a person''s browser. Read by the cron dispatcher (privileged client) to send alongside/instead of email.';

create index push_subscriptions_person_idx
  on todotwo.push_subscriptions (person_id);

alter table todotwo.push_subscriptions enable row level security;

create policy push_subscriptions_select_own on todotwo.push_subscriptions
  for select to authenticated
  using (person_id = todotwo.current_person_id());

create policy push_subscriptions_insert_own on todotwo.push_subscriptions
  for insert to authenticated
  with check (person_id = todotwo.current_person_id());

create policy push_subscriptions_delete_own on todotwo.push_subscriptions
  for delete to authenticated
  using (person_id = todotwo.current_person_id());

-- No update policy: a changed subscription (rotated keys, a new endpoint) is
-- a delete followed by a fresh insert, not a mutation of an existing row.

grant select, insert, delete on todotwo.push_subscriptions to authenticated;
revoke all on todotwo.push_subscriptions from anon;

-- ROLLBACK:
--   drop policy if exists push_subscriptions_delete_own on todotwo.push_subscriptions;
--   drop policy if exists push_subscriptions_insert_own on todotwo.push_subscriptions;
--   drop policy if exists push_subscriptions_select_own on todotwo.push_subscriptions;
--   drop table if exists todotwo.push_subscriptions cascade;
