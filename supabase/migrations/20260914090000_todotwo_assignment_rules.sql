-- TodoTwo — the farm's assignment rules, as data rather than code
--
-- The standing arrangement (goats with rabbits, breakfast apart from dinner,
-- and so on) lived in lib/todotwo/domain/farm-rules.ts as constants. That was
-- fine when there were five of them and they never changed, but it means
-- nothing can be switched off for a week, and adding one needs a developer
-- and a deploy.
--
-- Rules now live here. The nightly round reads whatever is enabled, so
-- turning a rule off is a toggle rather than a code change.
--
-- Payload is jsonb keyed by kind, deliberately not a column per constraint
-- type: the shapes genuinely differ (labels, label pairs, a person and
-- weekdays, a number) and five sparse nullable columns would be worse. The
-- check constraint keeps the kinds honest.
--
-- Note which kinds are storable. A rule has to survive to tomorrow, so it
-- cannot reference task ids — those belong to one occurrence on one day.
-- Anything task-shaped is stored as a LABEL and resolved against that day's
-- work when the round runs. That is why "Robert does no housekeeping" is
-- exclude_task_group here and becomes exclude_tasks at assignment time.

create table todotwo.assignment_rules (
  id             uuid primary key default gen_random_uuid(),
  label          text not null check (length(trim(label)) > 0),
  kind           text not null check (
    kind in (
      'same_person',
      'different_people',
      'unavailable_weekday',
      'max_per_day',
      'exclude_task_group'
    )
  ),
  payload        jsonb not null,
  enabled        boolean not null default true,
  sort_order     numeric not null default 0,
  -- Free text somebody typed, when the rule came from the parser. Kept so a
  -- rule that reads oddly later can be checked against what was asked for.
  source_text    text,
  created_by_person_id uuid references todotwo.people (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index assignment_rules_enabled_idx on todotwo.assignment_rules (enabled, sort_order);

create trigger assignment_rules_touch_updated_at
  before update on todotwo.assignment_rules
  for each row execute function todotwo.touch_updated_at();

alter table todotwo.assignment_rules enable row level security;

-- Everyone signed in may read them: the assignment preview shows which rules
-- are in play, and "why did I get the goats" is a fair question for anybody
-- on the farm to be able to answer.
create policy assignment_rules_select_all on todotwo.assignment_rules
  for select to authenticated
  using (true);

create policy assignment_rules_staff_write on todotwo.assignment_rules
  for all to authenticated
  using (todotwo.is_staff())
  with check (todotwo.is_staff());

grant select, insert, update, delete on todotwo.assignment_rules to authenticated;
revoke all on todotwo.assignment_rules from anon;

comment on table todotwo.assignment_rules is
  'How the farm divides a day. Read by the nightly assignment round and by the preview screen; each row can be switched off without deleting it.';

-- ---------------------------------------------------------------------------
-- The arrangement as it stands today, moved out of farm-rules.ts unchanged.
--
-- In the owner''s words: same person for goats and rabbits, another for
-- chickens, ducks and pigs, Liam on his own; morning and evening always the
-- same person; separate people for breakfast and dinner; whoever does a
-- livestock round does neither meal; whoever cooks does not do the kitchen.
-- Liam sits outside the meals rule on purpose — walking the dog is lighter
-- than a livestock round, so his person may still cook.
-- ---------------------------------------------------------------------------

insert into todotwo.assignment_rules (label, kind, payload, sort_order) values
  (
    'Goats and rabbits — one person, morning and evening',
    'same_person',
    '{"labels": ["Goats", "Rabbits"]}'::jsonb,
    10
  ),
  (
    'Chickens, ducks and pigs — one person, morning and evening',
    'same_person',
    '{"labels": ["Chickens + Ducks", "Pigs"]}'::jsonb,
    20
  ),
  (
    'Liam — one person, morning and evening',
    'same_person',
    '{"labels": ["Liam"]}'::jsonb,
    30
  ),
  (
    'Breakfast and dinner — different people',
    'different_people',
    '{"labelsA": ["Breakfast"], "labelsB": ["Dinner"]}'::jsonb,
    40
  ),
  (
    'A livestock round means neither meal',
    'different_people',
    '{"labelsA": ["Goats", "Rabbits", "Chickens + Ducks", "Pigs"], "labelsB": ["Breakfast", "Dinner"]}'::jsonb,
    50
  ),
  (
    'Whoever cooks does not do the kitchen',
    'different_people',
    '{"labelsA": ["Breakfast", "Dinner"], "labelsB": ["Kitchen"]}'::jsonb,
    60
  );

-- ROLLBACK:
--   drop table if exists todotwo.assignment_rules;
