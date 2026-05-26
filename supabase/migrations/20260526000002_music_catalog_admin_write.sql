-- Drop any old user-scoped insert policy if it exists
drop policy if exists "insert_own_songs" on public.music_catalog;

-- Only admins can insert into the shared catalog
create policy "admin_insert_catalog" on public.music_catalog
  for insert to authenticated with check (public.is_admin());
