-- Version history for BNIMSP slides: track published snapshots for reverting.
create table if not exists public.bnimsp_slide_versions (
  id bigserial primary key,
  slide_n integer not null,
  published_at timestamptz not null default now(),
  published_by text not null default 'admin',
  body jsonb not null,

  constraint bnimsp_slide_versions_slide_n_fk
    foreign key (slide_n)
    references public.bnimsp_slides(n) on delete cascade
);

create index if not exists bnimsp_slide_versions_slide_n_idx on public.bnimsp_slide_versions (slide_n, published_at desc);

-- When a slide is published, save the previous published version.
-- This is called from the publish API after the published column is updated.
create or replace function bnimsp_save_version_on_publish()
returns trigger as $$
begin
  -- If published changed from non-null to a different non-null value, save the old version.
  if old.published is not null and old.published is distinct from new.published then
    insert into public.bnimsp_slide_versions (slide_n, published_by, body)
    values (new.n, new.updated_by, old.published);
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger on bnimsp_slides to capture versions when published changes.
drop trigger if exists bnimsp_version_on_publish on public.bnimsp_slides;
create trigger bnimsp_version_on_publish
  after update of published on public.bnimsp_slides
  for each row
  execute function bnimsp_save_version_on_publish();

-- Allow service role to read version history.
alter table public.bnimsp_slide_versions enable row level security;
