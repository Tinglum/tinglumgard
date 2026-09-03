-- TodoTwo — feed_checks: the append-only log of feed-sufficiency answers
--
-- One row per time someone answers "enough food for the next two days?" while
-- completing an evening animal task. Append-only by design: a correction is a
-- new row with a fresh timestamp, not an edit of history, so nobody can quietly
-- rewrite what was reported. There is deliberately no update or delete policy.

create table todotwo.feed_checks (
  id                      uuid primary key default gen_random_uuid(),
  task_id                 uuid not null references todotwo.tasks (id) on delete cascade,
  person_id               uuid not null references todotwo.people (id),
  has_enough_for_two_days boolean not null,
  note                    text,
  created_at              timestamptz not null default now()
);

comment on table todotwo.feed_checks is
  'Append-only log of "enough food for the next two days?" answers, recorded when an evening animal task requiring the check is completed. See todotwo.complete_task().';

create index feed_checks_task_idx on todotwo.feed_checks (task_id, created_at desc);
create index feed_checks_person_idx on todotwo.feed_checks (person_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Select: staff see every answer, because a "no" needs to be visible farm-wide
-- for follow-up. A person sees their own answers and nobody else's.
--
-- Insert: a person may only log a check under their own person_id. Staff have
-- no separate insert bypass here — every row, staff or not, is written the
-- same way, through todotwo.complete_task() (security definer) or directly by
-- the person it belongs to.
--
-- No update, no delete, for anyone: this is a log, not editable state.
-- ---------------------------------------------------------------------------

alter table todotwo.feed_checks enable row level security;

create policy feed_checks_staff_select on todotwo.feed_checks
  for select to authenticated
  using (todotwo.is_staff());

create policy feed_checks_own_select on todotwo.feed_checks
  for select to authenticated
  using (person_id = todotwo.current_person_id());

create policy feed_checks_own_insert on todotwo.feed_checks
  for insert to authenticated
  with check (person_id = todotwo.current_person_id());

grant select, insert on todotwo.feed_checks to authenticated;
revoke update, delete on todotwo.feed_checks from authenticated;
revoke all on todotwo.feed_checks from anon;

create trigger feed_checks_audit
  after insert or update or delete on todotwo.feed_checks
  for each row execute function todotwo.audit_trigger();

-- ROLLBACK:
--   drop trigger if exists feed_checks_audit on todotwo.feed_checks;
--   drop table if exists todotwo.feed_checks cascade;
