-- TodoTwo — letting an administrator add someone without a service-role key
--
-- Creating a Supabase auth user requires the service role, which is banned from
-- every TodoTwo request path. So accounts are not created by an administrator
-- at all: the administrator adds a person row carrying an email, and that email
-- becomes able to sign in. The auth user is created by Supabase on first
-- sign-in and linked to the waiting person row.
--
-- The gate is email_is_invited(): the login screen asks whether an address is
-- expected before allowing sign-up, so a stranger who finds /todotwo/login
-- still cannot make themselves an account.

-- ---------------------------------------------------------------------------
-- Is this address expected?
--
-- Callable by anon, because the login screen asks before anyone is signed in.
-- It answers a single yes/no about an address the caller already typed, and
-- reveals nothing else — no name, no role, no list.
-- ---------------------------------------------------------------------------

create or replace function todotwo.email_is_invited(p_email text)
returns boolean
language sql
stable
security definer
set search_path = todotwo, public, pg_temp
as $$
  select exists (
    select 1
    from todotwo.people
    where lower(email) = lower(trim(p_email))
      and deleted_at is null
      and is_active
  );
$$;

revoke all on function todotwo.email_is_invited(text) from public;
grant execute on function todotwo.email_is_invited(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Claiming the waiting person row on first sign-in
--
-- Runs as the newly signed-in user. It links only a row that matches their own
-- verified email and is not already linked to someone else, so it cannot be
-- used to take over an existing account.
-- ---------------------------------------------------------------------------

create or replace function todotwo.claim_person()
returns uuid
language plpgsql
security definer
set search_path = todotwo, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_person  uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  -- Already linked: nothing to do.
  select id into v_person from todotwo.people where auth_user_id = v_user_id;
  if v_person is not null then
    return v_person;
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return null;
  end if;

  update todotwo.people
     set auth_user_id = v_user_id
   where lower(email) = lower(v_email)
     and auth_user_id is null
     and deleted_at is null
     and is_active
  returning id into v_person;

  return v_person;
end;
$$;

revoke all on function todotwo.claim_person() from public, anon;
grant execute on function todotwo.claim_person() to authenticated;

-- ---------------------------------------------------------------------------
-- An administrator adding someone needs to insert a person row. The Phase 0
-- policy already allows that; this makes the intent explicit in one place.
-- ---------------------------------------------------------------------------

comment on function todotwo.email_is_invited(text) is
  'Login gate: has an administrator added this address? Deliberately reveals nothing beyond yes/no.';
comment on function todotwo.claim_person() is
  'Links a newly created auth user to the person row an administrator prepared for their email.';

-- ROLLBACK:
--   drop function if exists todotwo.claim_person();
--   drop function if exists todotwo.email_is_invited(text);
