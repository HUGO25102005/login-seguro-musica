import { Play, Heart, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Song = {
  id: string
  title: string
  artist: string
  album?: string | null
  genre?: string | null
  year?: number | null
}

function hashHue(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 360
}

export function SongCard({ song }: { song: Song }) {
  const hue = hashHue(song.artist)
  const hue2 = (hue + 60) % 360

  return (
    <article
      className="group relative rounded-xl overflow-hidden border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/10 focus-within:shadow-lg focus-within:shadow-primary/10"
    >
      {/* Album art */}
      <div
        className="relative aspect-square w-full"
        style={{
          background: `linear-gradient(135deg, oklch(0.5 0.18 ${hue}) 0%, oklch(0.4 0.22 ${hue2}) 100%)`,
        }}
      >
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            aria-label={`Reproducir ${song.title}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-md hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Play className="size-5 ml-0.5" fill="currentColor" />
          </button>
        </div>

        {/* Favorite */}
        <button
          type="button"
          aria-pressed={false}
          aria-label={`Agregar ${song.title} a favoritos`}
          className={cn(
            'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
            'hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          )}
        >
          <Heart className="size-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 space-y-0.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{song.title}</h3>
            <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
          </div>
          <button
            type="button"
            aria-label="Más opciones"
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        {song.genre && (
          <span className="inline-block mt-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            {song.genre}
          </span>
        )}
      </div>
    </article>
  )
}
