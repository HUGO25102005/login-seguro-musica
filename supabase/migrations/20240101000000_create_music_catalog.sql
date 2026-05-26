-- Create music catalog table
create table if not exists public.music_catalog (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  artist      text not null,
  genre       text not null,
  year        integer,
  created_at  timestamptz not null default now()
);

-- Full-text search index
create index if not exists music_catalog_fts_idx
  on public.music_catalog
  using gin(to_tsvector('spanish', title || ' ' || artist || ' ' || genre));
