-- Habilitar extensión para búsqueda por similitud (ILIKE eficiente)
create extension if not exists pg_trgm;

create table if not exists public.music_catalog (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  artist      text        not null,
  album       text,
  year        integer     check (year between 1900 and 2100),
  genre       text,
  created_at  timestamptz not null default now()
);

-- Índices GIN para búsqueda por similitud en title, artist, genre
create index if not exists music_catalog_title_idx  on public.music_catalog using gin (title  gin_trgm_ops);
create index if not exists music_catalog_artist_idx on public.music_catalog using gin (artist gin_trgm_ops);
create index if not exists music_catalog_genre_idx  on public.music_catalog (genre);

alter table public.music_catalog enable row level security;
