-- BNIMSP — Train-the-trainer page (Nasjonal MSP 2026)
-- Tables are accessed only through service-role API routes; RLS is enabled with
-- no public policies so anon/auth keys cannot read or write directly.

-- Directors (per-user login). Passwords are bcrypt hashes set via the admin API.
create table if not exists public.bnimsp_directors (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- Per-slide content. `published` is what directors see; `draft` holds pending edits.
-- Both are jsonb blobs matching the SlideLayers shape (plus title/timing/module/image).
create table if not exists public.bnimsp_slides (
  n integer primary key,
  module_id text not null,
  title text not null default '',
  image text not null default '',
  timing text not null default '',
  published jsonb not null default '{}'::jsonb,
  draft jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Modules (ordering / grouping of slides).
create table if not exists public.bnimsp_modules (
  id text primary key,
  title text not null,
  slide_from integer not null,
  slide_to integer not null,
  sort_order integer not null default 0
);

-- Appendix reference pages (group assignments, language bank, checklists, …).
create table if not exists public.bnimsp_appendix (
  slug text primary key,
  title text not null,
  published text not null default '',
  draft text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Private per-director notes, one row per (director, slide).
create table if not exists public.bnimsp_user_notes (
  director_id uuid not null references public.bnimsp_directors(id) on delete cascade,
  slide_n integer not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (director_id, slide_n)
);

create index if not exists bnimsp_slides_module_idx on public.bnimsp_slides (module_id);
create index if not exists bnimsp_user_notes_director_idx on public.bnimsp_user_notes (director_id);

alter table public.bnimsp_directors  enable row level security;
alter table public.bnimsp_slides      enable row level security;
alter table public.bnimsp_modules     enable row level security;
alter table public.bnimsp_appendix    enable row level security;
alter table public.bnimsp_user_notes  enable row level security;
-- No policies: only the service role (which bypasses RLS) may touch these tables.
