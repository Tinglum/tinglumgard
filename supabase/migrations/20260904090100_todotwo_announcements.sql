-- TodoTwo Phase 6 — announcements and acknowledgements
--
-- The noticeboard. A coordinator writes something everybody on the farm needs
-- to know — the vet comes Thursday, the north gate latch is broken — and can
-- see who has actually read it.
--
-- Two decisions worth stating:
--
-- Drafts are real. published_at is null until someone presses publish, and an
-- unpublished announcement is invisible to everyone but staff. Writing a notice
-- half-finished and coming back to it should not email the farm twice.
--
-- Publishing fans out into the outbox rather than sending. The trigger below
-- queues one row per person; the cron dispatcher sends. Publishing therefore
-- cannot fail because Resend is down, and re-publishing cannot double-send
-- because the dedupe key already exists.

create type todotwo.announcement_urgency as enum ('info', 'important', 'urgent');

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------

create table todotwo.announcements (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (length(trim(title)) > 0),
  body             text not null check (length(trim(body)) > 0),
  urgency          todotwo.announcement_urgency not null default 'info',
  author_person_id uuid references todotwo.people (id) on delete set null,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

comment on table todotwo.announcements is
  'Farm noticeboard. Null published_at is a draft, visible to staff only. Publishing fans out into todotwo.notification_outbox.';

create index announcements_published_idx
  on todotwo.announcements (published_at desc)
  where published_at is not null and deleted_at is null;

create trigger announcements_touch_updated_at
  before update on todotwo.announcements
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- announcement_acknowledgements — who has read it
-- ---------------------------------------------------------------------------

create table todotwo.announcement_acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references todotwo.announcements (id) on delete cascade,
  person_id       uuid not null references todotwo.people (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (announcement_id, person_id)
);

comment on table todotwo.announcement_acknowledgements is
  'One row per person per announcement. Insert-only: an acknowledgement cannot be taken back, which is the point of it.';

create index announcement_acks_announcement_idx
  on todotwo.announcement_acknowledgements (announcement_id);

-- ---------------------------------------------------------------------------
-- Fan-out on publish
--
-- Fires when published_at goes from null to a value. Queues one notification
-- per active person who holds a role and has an address, skipping the author —
-- nobody needs an email about the thing they just wrote.
--
-- security definer because it must read the whole roster and queue for other
-- people. It re-checks that the caller is staff rather than trusting the fact
-- that they got as far as an UPDATE.
-- ---------------------------------------------------------------------------

create or replace function todotwo.announcement_publish_fanout()
returns trigger
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_person record;
  v_prefix text;
begin
  if new.published_at is null or new.deleted_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.published_at is not null then
    return new;
  end if;

  if not todotwo.is_staff() then
    raise exception 'Only staff may publish an announcement'
      using errcode = 'insufficient_privilege';
  end if;

  v_prefix := case new.urgency
                when 'urgent' then 'Urgent: '
                when 'important' then 'Important: '
                else ''
              end;

  for v_person in
    select distinct p.id
    from todotwo.people p
    join todotwo.role_assignments r on r.person_id = p.id and r.revoked_at is null
    where p.deleted_at is null
      and p.is_active
      and p.email is not null
      and p.id is distinct from new.author_person_id
  loop
    perform todotwo.enqueue_notification(
      v_person.id,
      v_prefix || new.title,
      new.body,
      'announcement',
      new.id,
      'email'
    );
  end loop;

  return new;
end;
$$;

create trigger announcements_fanout
  after insert or update of published_at on todotwo.announcements
  for each row execute function todotwo.announcement_publish_fanout();

create trigger announcements_audit
  after insert or update or delete on todotwo.announcements
  for each row execute function todotwo.audit_trigger();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- announcements: staff do everything. Everybody else reads what is published
-- and not deleted, and writes nothing.
--
-- acknowledgements: you may record your own, for an announcement you can
-- actually see. You may read your own; staff read all of them, because "who has
-- seen this" is the whole reason the table exists. There is no update or delete
-- policy for anyone — an acknowledgement is a fact about the past.
-- ---------------------------------------------------------------------------

alter table todotwo.announcements enable row level security;

create policy announcements_staff_all on todotwo.announcements
  for all to authenticated
  using (todotwo.is_staff()) with check (todotwo.is_staff());

create policy announcements_read_published on todotwo.announcements
  for select to authenticated
  using (
    todotwo.current_person_id() is not null
    and published_at is not null
    and deleted_at is null
  );

grant select, insert, update, delete on todotwo.announcements to authenticated;
revoke all on todotwo.announcements from anon;

alter table todotwo.announcement_acknowledgements enable row level security;

create policy announcement_acks_staff_select on todotwo.announcement_acknowledgements
  for select to authenticated
  using (todotwo.is_staff());

create policy announcement_acks_own_select on todotwo.announcement_acknowledgements
  for select to authenticated
  using (person_id = todotwo.current_person_id());

create policy announcement_acks_own_insert on todotwo.announcement_acknowledgements
  for insert to authenticated
  with check (
    person_id = todotwo.current_person_id()
    and exists (
      select 1 from todotwo.announcements a
      where a.id = announcement_id
        and a.published_at is not null
        and a.deleted_at is null
    )
  );

grant select, insert on todotwo.announcement_acknowledgements to authenticated;
revoke update, delete on todotwo.announcement_acknowledgements from authenticated;
revoke all on todotwo.announcement_acknowledgements from anon;

-- ---------------------------------------------------------------------------
-- Reading status back
--
-- security_invoker so the caller's policies still apply: a Workawayer sees
-- counts for announcements they can see, staff see everything including drafts.
-- ---------------------------------------------------------------------------

create or replace view todotwo.announcement_reach
with (security_invoker = true)
as
select
  a.id as announcement_id,
  count(distinct k.person_id)                                       as acknowledged_count,
  count(distinct n.id) filter (where n.status = 'sent')             as notifications_sent,
  count(distinct n.id) filter (where n.status = 'pending')          as notifications_pending,
  count(distinct n.id) filter (where n.status = 'failed')           as notifications_failed
from todotwo.announcements a
left join todotwo.announcement_acknowledgements k on k.announcement_id = a.id
left join todotwo.notification_outbox n
       on n.topic = 'announcement' and n.reference_id = a.id
group by a.id;

grant select on todotwo.announcement_reach to authenticated;
revoke all on todotwo.announcement_reach from anon;

-- ROLLBACK:
--   drop view if exists todotwo.announcement_reach;
--   drop function if exists todotwo.announcement_publish_fanout() cascade;
--   drop table if exists todotwo.announcement_acknowledgements cascade;
--   drop table if exists todotwo.announcements cascade;
--   drop type if exists todotwo.announcement_urgency;
