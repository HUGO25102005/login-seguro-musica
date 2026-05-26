import { createClient } from '@/utils/supabase/server'
import { requireAuth } from '@/app/data/auth'
import { AppHeader } from '@/app/components/app-header'
import { SongCard } from '@/app/components/song-card'
import { EmptyState } from '@/app/components/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Catálogo' }

type CatalogPageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const user = await requireAuth()

  const { q } = await searchParams
  const supabase = await createClient()

  // 🛡️ Fix SQLi: sanitize query before interpolating into .or() filter string.
  // Supabase SDK parametrizes bound values but NOT the filter-string syntax itself.
  // Strip characters that could escape the ilike value and inject new filter clauses.
  const rawQuery = q ?? ''
  const safeQuery = rawQuery.replace(/[%,()'"\\]/g, '').slice(0, 100).trim()

  let dbQuery = supabase.from('music_catalog').select('*')

  if (safeQuery) {
    dbQuery = dbQuery.or(
      `title.ilike.%${safeQuery}%,artist.ilike.%${safeQuery}%,genre.ilike.%${safeQuery}%`
    )
  }

  const { data: songs } = await dbQuery.order('title', { ascending: true })

  return (
    <>
      <AppHeader
        userEmail={user?.email}
        resultCount={songs?.length ?? 0}
      />

      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Library header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tu biblioteca</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {songs?.length ?? 0}{' '}
              {(songs?.length ?? 0) === 1 ? 'canción' : 'canciones'}
              {safeQuery && ` · "${safeQuery}"`}
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {songs && songs.length > 0 ? (
            songs.map((song) => <SongCard key={song.id} song={song} />)
          ) : (
            <EmptyState query={safeQuery || undefined} />
          )}
        </div>
      </main>
    </>
  )
}
