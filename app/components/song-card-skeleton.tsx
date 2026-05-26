import { Skeleton } from '@/components/ui/skeleton'

export function SongCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 aspect-[3/4] flex flex-col justify-between">
      {/* Header Info skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>

      {/* Center Visual (Vinyl disc) skeleton */}
      <div className="my-4 flex items-center justify-center">
        <Skeleton className="h-28 w-28 rounded-full" />
      </div>

      {/* Track Details skeleton */}
      <div className="space-y-2 flex flex-col items-center">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>

      {/* Bottom Actions skeleton */}
      <div className="border-t border-border/40 pt-3 mt-3 flex justify-between items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}

