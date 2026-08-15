-- Fitpreneur Nutrition Fitness Assessment
-- Live, section-gated assessment infrastructure (v1.0).
-- Question/answer copy is seeded separately so the authoritative handoff can be
-- verified independently from this schema migration.

create extension if not exists pgcrypto;

create type public.nutrition_event_status as enum ('draft', 'active', 'paused', 'ended');
create type public.nutrition_attempt_status as enum ('in_progress', 'submitted');
create type public.nutrition_admin_action as enum (
  'activate', 'release_next', 'pause', 'reopen', 'end', 'release_results'
);

create table public.nutrition_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version text not null,
  title_i18n jsonb not null,
  default_language text not null default 'en' check (default_language in ('en', 'no')),
  supported_languages text[] not null default array['en', 'no']::text[],
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slug, version),
  check (title_i18n ?& array['en', 'no']),
  check (supported_languages <@ array['en', 'no']::text[])
);

create unique index nutrition_one_active_version_per_slug
  on public.nutrition_assessment_versions (slug) where is_active;

create table public.nutrition_sections (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.nutrition_assessment_versions(id) on delete restrict,
  section_number smallint not null check (section_number between 1 and 5),
  title_i18n jsonb not null,
  description_i18n jsonb not null,
  unique (assessment_version_id, section_number),
  check (title_i18n ?& array['en', 'no']),
  check (description_i18n ?& array['en', 'no'])
);

create table public.nutrition_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.nutrition_sections(id) on delete restrict,
  question_number smallint not null check (question_number between 1 and 25),
  prompt_i18n jsonb not null,
  context_i18n jsonb,
  unique (section_id, question_number),
  unique (id, section_id),
  check (prompt_i18n ?& array['en', 'no']),
  check (context_i18n is null or context_i18n ?& array['en', 'no'])
);

create table public.nutrition_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.nutrition_questions(id) on delete restrict,
  answer_key text not null check (answer_key in ('A', 'B', 'C', 'D', 'E')),
  score smallint not null check (score between 0 and 4),
  text_i18n jsonb not null,
  unique (question_id, answer_key),
  unique (id, question_id),
  check (text_i18n ?& array['en', 'no']),
  check (
    (answer_key = 'A' and score = 0) or
    (answer_key = 'B' and score = 1) or
    (answer_key = 'C' and score = 2) or
    (answer_key = 'D' and score = 3) or
    (answer_key = 'E' and score = 4)
  )
);

create table public.nutrition_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.nutrition_events (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.nutrition_assessment_versions(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  join_code_hash text not null unique,
  join_code_label text not null,
  status public.nutrition_event_status not null default 'draft',
  released_section smallint not null default 0 check (released_section between 0 and 5),
  results_released boolean not null default false,
  starts_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  check (not results_released or released_section = 5)
);

create table public.nutrition_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.nutrition_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'no')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  deletion_requested_at timestamptz,
  unique (event_id, user_id)
);

create table public.nutrition_attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.nutrition_event_participants(id) on delete cascade,
  assessment_version_id uuid not null references public.nutrition_assessment_versions(id) on delete restrict,
  status public.nutrition_attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  section_scores smallint[] check (
    section_scores is null or
    (cardinality(section_scores) = 5 and section_scores <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]::smallint[])
  ),
  total_score smallint check (total_score between 0 and 100),
  check ((status = 'in_progress' and submitted_at is null) or (status = 'submitted' and submitted_at is not null))
);

create unique index nutrition_one_open_attempt_per_participant
  on public.nutrition_attempts (participant_id) where status = 'in_progress';

create table public.nutrition_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.nutrition_attempts(id) on delete cascade,
  question_id uuid not null,
  choice_id uuid not null,
  answer_key text not null check (answer_key in ('A', 'B', 'C', 'D', 'E')),
  score smallint not null check (score between 0 and 4),
  revision bigint not null default 1 check (revision > 0),
  last_mutation_id uuid not null,
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id),
  unique (attempt_id, last_mutation_id),
  foreign key (choice_id, question_id) references public.nutrition_choices(id, question_id) on delete restrict
);

create table public.nutrition_event_audit (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.nutrition_events(id) on delete cascade,
  actor_id text not null,
  action public.nutrition_admin_action not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);

create index nutrition_participants_event_idx on public.nutrition_event_participants(event_id);
create index nutrition_attempts_participant_idx on public.nutrition_attempts(participant_id);
create index nutrition_answers_attempt_idx on public.nutrition_answers(attempt_id);
create index nutrition_questions_section_idx on public.nutrition_questions(section_id);

create or replace function public.is_nutrition_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.nutrition_admins a where a.user_id = p_user_id);
$$;

revoke all on function public.is_nutrition_admin(uuid) from public;
grant execute on function public.is_nutrition_admin(uuid) to authenticated;

create or replace function public.join_nutrition_event(
  p_join_code text,
  p_display_name text,
  p_language text default 'en'
) returns table (participant_id uuid, event_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_event public.nutrition_events%rowtype; v_participant_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if char_length(trim(p_display_name)) not between 1 and 80 then raise exception 'Invalid display name'; end if;
  if p_language not in ('en', 'no') then raise exception 'Unsupported language'; end if;
  select * into v_event from public.nutrition_events e
   where e.join_code_hash = encode(extensions.digest(upper(trim(p_join_code)), 'sha256'), 'hex')
     and e.status in ('active', 'paused');
  if not found then raise exception 'Event not found or unavailable'; end if;
  insert into public.nutrition_event_participants(event_id, user_id, display_name, preferred_language)
  values (v_event.id, auth.uid(), trim(p_display_name), p_language)
  on conflict (event_id, user_id) do update
    set display_name = excluded.display_name, preferred_language = excluded.preferred_language,
        last_seen_at = now()
  returning id into v_participant_id;
  return query select v_participant_id, v_event.id;
end $$;

create or replace function public.start_or_resume_nutrition_attempt(p_event_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_participant public.nutrition_event_participants%rowtype; v_attempt_id uuid;
begin
  select p.* into v_participant from public.nutrition_event_participants p
  join public.nutrition_events e on e.id = p.event_id
  where p.event_id = p_event_id and p.user_id = auth.uid() and e.status in ('active','paused');
  if not found then raise exception 'Event access denied' using errcode = '42501'; end if;
  select a.id into v_attempt_id from public.nutrition_attempts a
   where a.participant_id = v_participant.id and a.status = 'in_progress';
  if v_attempt_id is null then
    insert into public.nutrition_attempts(participant_id, assessment_version_id)
    select v_participant.id, e.assessment_version_id from public.nutrition_events e where e.id = p_event_id
    returning id into v_attempt_id;
  end if;
  return v_attempt_id;
end $$;

-- Idempotent, optimistic mutation endpoint for online or queued/offline clients.
-- A null expected revision is valid only for the first answer to a question.
create or replace function public.save_nutrition_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_choice_id uuid,
  p_mutation_id uuid,
  p_expected_revision bigint default null,
  p_client_updated_at timestamptz default null
) returns public.nutrition_answers
language plpgsql security definer set search_path = '' as $$
declare v_existing public.nutrition_answers%rowtype; v_choice public.nutrition_choices%rowtype;
        v_section smallint; v_event public.nutrition_events%rowtype; v_result public.nutrition_answers%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select e.* into v_event from public.nutrition_attempts a
  join public.nutrition_event_participants p on p.id = a.participant_id
  join public.nutrition_events e on e.id = p.event_id
  where a.id = p_attempt_id and p.user_id = auth.uid() and a.status = 'in_progress' for update of a;
  if not found then raise exception 'Attempt unavailable' using errcode = '42501'; end if;
  if v_event.status <> 'active' then raise exception 'Event is not accepting answers'; end if;
  select c.* into v_choice from public.nutrition_choices c
  where c.id = p_choice_id and c.question_id = p_question_id;
  select s.section_number into v_section
  from public.nutrition_choices c join public.nutrition_questions q on q.id = c.question_id
  join public.nutrition_sections s on s.id = q.section_id
  where c.id = p_choice_id and q.id = p_question_id
    and s.assessment_version_id = v_event.assessment_version_id;
  if not found or v_section > v_event.released_section then raise exception 'Question is not released'; end if;
  select * into v_existing from public.nutrition_answers
   where attempt_id = p_attempt_id and question_id = p_question_id for update;
  if found and v_existing.last_mutation_id = p_mutation_id then return v_existing; end if;
  if found and (p_expected_revision is null or p_expected_revision <> v_existing.revision) then
    raise exception 'Answer revision conflict' using errcode = '40001';
  elsif not found and p_expected_revision is not null then
    raise exception 'Answer revision conflict' using errcode = '40001';
  end if;
  insert into public.nutrition_answers(
    attempt_id, question_id, choice_id, answer_key, score, revision,
    last_mutation_id, client_updated_at
  ) values (
    p_attempt_id, p_question_id, p_choice_id, v_choice.answer_key, v_choice.score, 1,
    p_mutation_id, p_client_updated_at
  ) on conflict (attempt_id, question_id) do update set
    choice_id = excluded.choice_id, answer_key = excluded.answer_key, score = excluded.score,
    revision = public.nutrition_answers.revision + 1,
    last_mutation_id = excluded.last_mutation_id,
    client_updated_at = excluded.client_updated_at, updated_at = now()
  returning * into v_result;
  update public.nutrition_event_participants set last_seen_at = now()
   where id = (select participant_id from public.nutrition_attempts where id = p_attempt_id);
  return v_result;
end $$;

create or replace function public.submit_nutrition_attempt(p_attempt_id uuid)
returns public.nutrition_attempts
language plpgsql security definer set search_path = '' as $$
declare v_attempt public.nutrition_attempts%rowtype; v_sections smallint[]; v_total smallint; v_count integer;
begin
  select a.* into v_attempt from public.nutrition_attempts a
  join public.nutrition_event_participants p on p.id = a.participant_id
  join public.nutrition_events e on e.id = p.event_id
  where a.id = p_attempt_id and p.user_id = auth.uid() and a.status = 'in_progress'
    and e.status = 'active' and e.released_section = 5 for update of a;
  if not found then raise exception 'Attempt cannot be submitted' using errcode = '42501'; end if;
  select count(*), coalesce(sum(score),0)::smallint into v_count, v_total
    from public.nutrition_answers where attempt_id = p_attempt_id;
  if v_count <> 25 then raise exception 'All 25 questions must be answered'; end if;
  select array_agg(x.section_score order by x.section_number)::smallint[] into v_sections
  from (
    select s.section_number, sum(a.score)::smallint section_score
    from public.nutrition_answers a join public.nutrition_questions q on q.id = a.question_id
    join public.nutrition_sections s on s.id = q.section_id
    where a.attempt_id = p_attempt_id group by s.section_number
  ) x;
  if cardinality(v_sections) <> 5 then raise exception 'All five sections must be answered'; end if;
  update public.nutrition_attempts set status='submitted', submitted_at=now(),
    section_scores=v_sections, total_score=v_total where id=p_attempt_id returning * into v_attempt;
  return v_attempt;
end $$;

create or replace function public.get_nutrition_results(p_attempt_id uuid)
returns table (section_scores smallint[], total_score smallint, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.section_scores, a.total_score, a.submitted_at
  from public.nutrition_attempts a
  join public.nutrition_event_participants p on p.id=a.participant_id
  join public.nutrition_events e on e.id=p.event_id
  where a.id=p_attempt_id and a.status='submitted'
    and (public.is_nutrition_admin(auth.uid()) or (p.user_id=auth.uid() and e.results_released));
$$;

create or replace function public.request_nutrition_data_deletion()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_requested_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.nutrition_event_participants
    set deletion_requested_at=v_requested_at
    where user_id=auth.uid() and deletion_requested_at is null;
  return v_requested_at;
end $$;

create or replace function public.admin_control_nutrition_event(
  p_event_id uuid, p_action public.nutrition_admin_action
) returns public.nutrition_events
language plpgsql security definer set search_path = '' as $$
declare v_before public.nutrition_events%rowtype; v_after public.nutrition_events%rowtype;
begin
  if not public.is_nutrition_admin(auth.uid()) then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into v_before from public.nutrition_events where id=p_event_id for update;
  if not found then raise exception 'Event not found'; end if;
  if p_action = 'activate' then
    if v_before.status <> 'draft' then raise exception 'Only draft events can be activated'; end if;
    update public.nutrition_events set status='active', released_section=greatest(released_section,1), updated_at=now() where id=p_event_id;
  elsif p_action = 'release_next' then
    if v_before.status <> 'active' or v_before.released_section >= 5 then raise exception 'Cannot release next section'; end if;
    update public.nutrition_events set released_section=released_section+1, updated_at=now() where id=p_event_id;
  elsif p_action = 'pause' then
    if v_before.status <> 'active' then raise exception 'Only active events can be paused'; end if;
    update public.nutrition_events set status='paused', updated_at=now() where id=p_event_id;
  elsif p_action = 'reopen' then
    if v_before.status not in ('paused','ended') then raise exception 'Only paused or ended events can be reopened'; end if;
    update public.nutrition_events set status='active', ended_at=null, updated_at=now() where id=p_event_id;
  elsif p_action = 'end' then
    if v_before.status not in ('active','paused') then raise exception 'Event cannot be ended'; end if;
    update public.nutrition_events set status='ended', ended_at=now(), updated_at=now() where id=p_event_id;
  elsif p_action = 'release_results' then
    if v_before.released_section <> 5 then raise exception 'Release all sections first'; end if;
    update public.nutrition_events set results_released=true, updated_at=now() where id=p_event_id;
  end if;
  select * into v_after from public.nutrition_events where id=p_event_id;
  insert into public.nutrition_event_audit(event_id,actor_id,action,before_state,after_state)
  values (p_event_id,auth.uid()::text,p_action,to_jsonb(v_before),to_jsonb(v_after));
  return v_after;
end $$;

create or replace view public.nutrition_attempt_live_scores
with (security_invoker = true) as
select a.id attempt_id, p.event_id, p.id participant_id, p.display_name, p.last_seen_at,
       count(ans.id)::integer answered_count, coalesce(sum(ans.score),0)::integer earned_points,
       max(q.question_number) filter (where ans.id is not null)::smallint current_question,
       coalesce(sum(ans.score) filter (where s.section_number=1),0)::integer section_1_score,
       coalesce(sum(ans.score) filter (where s.section_number=2),0)::integer section_2_score,
       coalesce(sum(ans.score) filter (where s.section_number=3),0)::integer section_3_score,
       coalesce(sum(ans.score) filter (where s.section_number=4),0)::integer section_4_score,
       coalesce(sum(ans.score) filter (where s.section_number=5),0)::integer section_5_score,
       a.status, a.submitted_at
from public.nutrition_attempts a
join public.nutrition_event_participants p on p.id=a.participant_id
left join public.nutrition_answers ans on ans.attempt_id=a.id
left join public.nutrition_questions q on q.id=ans.question_id
left join public.nutrition_sections s on s.id=q.section_id
group by a.id,p.event_id,p.id,p.display_name,p.last_seen_at,a.status,a.submitted_at;

-- Returns no rows for cohorts smaller than three to reduce singling-out risk.
create or replace function public.nutrition_anonymous_aggregates(p_event_id uuid)
returns table (question_number smallint, answer_key text, response_count bigint)
language sql stable security definer set search_path = '' as $$
  select q.question_number, a.answer_key, count(*)
  from public.nutrition_answers a
  join public.nutrition_attempts t on t.id=a.attempt_id
  join public.nutrition_event_participants p on p.id=t.participant_id
  join public.nutrition_questions q on q.id=a.question_id
  where p.event_id=p_event_id
    and (public.is_nutrition_admin(auth.uid()) or exists (
      select 1 from public.nutrition_event_participants mine
      where mine.event_id=p_event_id and mine.user_id=auth.uid()
    ))
    and (select count(*) from public.nutrition_event_participants cohort where cohort.event_id=p_event_id) >= 3
  group by q.question_number,a.answer_key order by q.question_number,a.answer_key;
$$;

revoke all on function public.join_nutrition_event(text,text,text) from public;
revoke all on function public.start_or_resume_nutrition_attempt(uuid) from public;
revoke all on function public.save_nutrition_answer(uuid,uuid,uuid,uuid,bigint,timestamptz) from public;
revoke all on function public.submit_nutrition_attempt(uuid) from public;
revoke all on function public.get_nutrition_results(uuid) from public;
revoke all on function public.request_nutrition_data_deletion() from public;
revoke all on function public.admin_control_nutrition_event(uuid,public.nutrition_admin_action) from public;
revoke all on function public.nutrition_anonymous_aggregates(uuid) from public;
grant execute on function public.join_nutrition_event(text,text,text) to authenticated;
grant execute on function public.start_or_resume_nutrition_attempt(uuid) to authenticated;
grant execute on function public.save_nutrition_answer(uuid,uuid,uuid,uuid,bigint,timestamptz) to authenticated;
grant execute on function public.submit_nutrition_attempt(uuid) to authenticated;
grant execute on function public.get_nutrition_results(uuid) to authenticated;
grant execute on function public.request_nutrition_data_deletion() to authenticated;
grant execute on function public.admin_control_nutrition_event(uuid,public.nutrition_admin_action) to authenticated;
grant execute on function public.nutrition_anonymous_aggregates(uuid) to authenticated;

alter table public.nutrition_assessment_versions enable row level security;
alter table public.nutrition_sections enable row level security;
alter table public.nutrition_questions enable row level security;
alter table public.nutrition_choices enable row level security;
alter table public.nutrition_admins enable row level security;
alter table public.nutrition_events enable row level security;
alter table public.nutrition_event_participants enable row level security;
alter table public.nutrition_attempts enable row level security;
alter table public.nutrition_answers enable row level security;
alter table public.nutrition_event_audit enable row level security;

create policy nutrition_content_read on public.nutrition_assessment_versions for select to authenticated using (true);
create policy nutrition_sections_read on public.nutrition_sections for select to authenticated using (true);
create policy nutrition_questions_read on public.nutrition_questions for select to authenticated using (true);
create policy nutrition_choices_read on public.nutrition_choices for select to authenticated using (true);
create policy nutrition_admin_self_read on public.nutrition_admins for select to authenticated
  using (user_id=auth.uid() or public.is_nutrition_admin(auth.uid()));
create policy nutrition_events_member_read on public.nutrition_events for select to authenticated using (
  public.is_nutrition_admin(auth.uid()) or exists (
    select 1 from public.nutrition_event_participants p where p.event_id=id and p.user_id=auth.uid()
  )
);
create policy nutrition_participants_read on public.nutrition_event_participants for select to authenticated using (
  user_id=auth.uid() or public.is_nutrition_admin(auth.uid())
);
create policy nutrition_attempts_read on public.nutrition_attempts for select to authenticated using (
  public.is_nutrition_admin(auth.uid()) or exists (
    select 1 from public.nutrition_event_participants p where p.id=participant_id and p.user_id=auth.uid()
  )
);
create policy nutrition_answers_read on public.nutrition_answers for select to authenticated using (
  public.is_nutrition_admin(auth.uid()) or exists (
    select 1 from public.nutrition_attempts t join public.nutrition_event_participants p on p.id=t.participant_id
    where t.id=attempt_id and p.user_id=auth.uid()
  )
);
create policy nutrition_audit_admin_read on public.nutrition_event_audit for select to authenticated
  using (public.is_nutrition_admin(auth.uid()));

-- Direct client writes are intentionally absent. SECURITY DEFINER RPCs above are
-- the authoritative write gates; service_role remains available for provisioning.
grant select on public.nutrition_assessment_versions, public.nutrition_sections,
  public.nutrition_questions, public.nutrition_choices, public.nutrition_admins,
  public.nutrition_events, public.nutrition_event_participants,
  public.nutrition_answers, public.nutrition_event_audit to authenticated;
-- Final score snapshots are deliberately omitted; get_nutrition_results enforces
-- the facilitator-controlled result release. Admin dashboards should use a
-- service-role server endpoint for the live score view.
grant select (id, participant_id, assessment_version_id, status, started_at, submitted_at)
  on public.nutrition_attempts to authenticated;
revoke all on public.nutrition_attempt_live_scores from anon, authenticated;
revoke insert, update, delete, truncate on public.nutrition_assessment_versions,
  public.nutrition_sections, public.nutrition_questions, public.nutrition_choices,
  public.nutrition_admins, public.nutrition_events, public.nutrition_event_participants,
  public.nutrition_attempts, public.nutrition_answers, public.nutrition_event_audit
  from anon, authenticated;

-- Supabase Realtime: participants can subscribe to their event row; RLS filters it.
do $$ begin
  alter publication supabase_realtime add table public.nutrition_events;
exception when duplicate_object then null;
end $$;

comment on table public.nutrition_admins is 'Named administrators. Bootstrap entries with service_role or SQL editor.';
comment on column public.nutrition_events.join_code_hash is 'SHA-256 hex of normalized join code; never store plaintext codes.';
comment on column public.nutrition_answers.last_mutation_id is 'Client UUID providing idempotency for offline retry.';
