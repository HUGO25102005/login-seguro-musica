-- Catálogo compartido de solo lectura para usuarios autenticados.
-- service_role (usado por scripts/ingest.ts) bypasa RLS por defecto — no necesita política.
create policy "authenticated_read_catalog"
  on public.music_catalog
  for select
  to authenticated
  using (true);
