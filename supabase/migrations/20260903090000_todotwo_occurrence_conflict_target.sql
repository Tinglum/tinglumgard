-- TodoTwo — make the occurrence uniqueness usable as an ON CONFLICT target
--
-- 20260902090200 created:
--
--   create unique index tasks_series_occurrence_unique
--     on todotwo.tasks (series_id, occurrence_date)
--     where series_id is not null and deleted_at is null;
--
-- That enforces uniqueness correctly but cannot back an upsert: Postgres will
-- only infer a partial index for ON CONFLICT when the statement repeats the
-- index predicate, and PostgREST has no way to express one. Every series failed
-- to generate with "there is no unique or exclusion constraint matching the ON
-- CONFLICT specification".
--
-- A plain unique constraint works instead. Rows with a null series_id — every
-- one-off task — are still unconstrained, because Postgres treats nulls as
-- distinct in a unique index by default.
--
-- Dropping the deleted_at clause is a deliberate behaviour change: a
-- soft-deleted occurrence now blocks regeneration of that day. That is what we
-- want. Someone deleted Tuesday's milking on purpose, and a nightly job should
-- not quietly bring it back.

drop index if exists todotwo.tasks_series_occurrence_unique;

alter table todotwo.tasks
  add constraint tasks_series_occurrence_unique
  unique (series_id, occurrence_date);

comment on constraint tasks_series_occurrence_unique on todotwo.tasks is
  'Makes occurrence generation idempotent and usable as an ON CONFLICT target. A soft-deleted occurrence intentionally blocks regeneration of that date.';

-- ROLLBACK:
--   alter table todotwo.tasks drop constraint if exists tasks_series_occurrence_unique;
--   create unique index tasks_series_occurrence_unique
--     on todotwo.tasks (series_id, occurrence_date)
--     where series_id is not null and deleted_at is null;
