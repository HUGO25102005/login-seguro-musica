import { SongCardSkeleton } from '@/app/components/song-card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function CatalogLoading() {
  return (
    <>
      {/* Stub header */}
      <div className="sticky top-0 z-40 w-full border-b border-border bg-background/80 h-14" />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <SongCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </>
  )
}
