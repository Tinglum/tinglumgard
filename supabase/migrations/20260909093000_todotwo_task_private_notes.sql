-- TodoTwo — private personal notes on a task
--
-- A person's own scratchpad on a task ("double-check the fence latch here"),
-- distinct from todotwo.task_comments: comments are farm-visible, this is not.
-- One note per person per task, edited in place rather than accumulating a
-- thread — this is a scratchpad, not a discussion.
--
-- RLS is deliberately narrower here than almost anywhere else in TodoTwo: no
-- is_staff() clause at all. Staff can see everyone's tasks, assignments and
-- comments, but this table is the one place a person's own words stay theirs
-- alone, including from staff. Do not add a staff-visibility policy here later
-- without being very sure that is actually wanted.

create table todotwo.task_private_notes (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references todotwo.tasks (id) on delete cascade,
  person_id  uuid not null references todotwo.people (id) on delete cascade,
  note       text not null check (length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_private_notes_one_per_person unique (task_id, person_id)
);

comment on table todotwo.task_private_notes is
  'One private scratchpad note per person per task. Visible only to its author — not staff, not admin. See RLS policies below.';

create index task_private_notes_person_idx on todotwo.task_private_notes (person_id);

create trigger task_private_notes_touch_updated_at
  before update on todotwo.task_private_notes
  for each row execute function todotwo.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security — author only, no exceptions
-- ---------------------------------------------------------------------------

alter table todotwo.task_private_notes enable row level security;

create policy task_private_notes_own on todotwo.task_private_notes
  for all to authenticated
  using (person_id = todotwo.current_person_id())
  with check (person_id = todotwo.current_person_id());

grant select, insert, update, delete on todotwo.task_private_notes to authenticated;
revoke all on todotwo.task_private_notes from anon;

-- ROLLBACK:
--   drop table if exists todotwo.task_private_notes cascade;
