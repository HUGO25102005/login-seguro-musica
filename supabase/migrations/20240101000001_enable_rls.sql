-- Enable Row Level Security
alter table public.music_catalog enable row level security;

-- Users can only read their own songs
create policy "select_own_songs" on public.music_catalog
  for select using (auth.uid() = user_id);

-- Users can only insert their own songs
create policy "insert_own_songs" on public.music_catalog
  for insert with check (auth.uid() = user_id);

-- Users can only update their own songs
create policy "update_own_songs" on public.music_catalog
  for update using (auth.uid() = user_id);

-- Users can only delete their own songs
create policy "delete_own_songs" on public.music_catalog
  for delete using (auth.uid() = user_id);
