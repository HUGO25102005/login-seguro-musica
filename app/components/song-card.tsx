import { Play, Heart, MoreHorizontal } from 'lucide-react'

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
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 focus-within:ring-2 focus-within:ring-primary select-none cursor-pointer aspect-[3/4]"
    >
      {/* Decorative gradient glowing orb */}
      <div
        className="absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `oklch(0.65 0.18 ${hue})`,
        }}
      />

      {/* Glassmorphic sheen overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between z-10">
        {song.genre ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
            {song.genre}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
            Música
          </span>
        )}
        {song.year && (
          <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-md">
            {song.year}
          </span>
        )}
      </div>

      {/* Center Visual: Spinning Vinyl Record */}
      <div className="relative my-4 flex items-center justify-center z-10">
        <div
          className="relative flex items-center justify-center aspect-square w-28 rounded-full bg-neutral-950 dark:bg-black shadow-lg border-4 border-neutral-800/80 group-hover:animate-spin transition-transform duration-500 ease-out"
          style={{ animationDuration: '4s' }}
        >
          {/* Vinyl Grooves */}
          <div className="absolute inset-1.5 rounded-full border border-neutral-800/60 pointer-events-none" />
          <div className="absolute inset-3.5 rounded-full border border-neutral-800/40 pointer-events-none" />
          <div className="absolute inset-5.5 rounded-full border border-neutral-800/20 pointer-events-none" />
          
          {/* Dynamic Record Label */}
          <div
            className="absolute inset-8 rounded-full flex items-center justify-center shadow-inner"
            style={{
              background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}) 0%, oklch(0.55 0.22 ${hue2}) 100%)`,
            }}
          >
            {/* Center Hole */}
            <div className="h-3 w-3 rounded-full bg-card shadow-inner" />
          </div>
        </div>

        {/* Play Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            aria-label={`Reproducir ${song.title}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
          >
            <Play className="size-5 fill-current ml-0.5" />
          </button>
        </div>
      </div>

      {/* Track Details */}
      <div className="text-center z-10 space-y-1">
        <h3 className="font-bold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors duration-200" title={song.title}>
          {song.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate font-medium" title={song.artist}>
          {song.artist}
        </p>
        {song.album && (
          <p className="text-[10px] text-muted-foreground/60 truncate italic" title={song.album}>
            {song.album}
          </p>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3 z-10">
        <button
          type="button"
          aria-pressed={false}
          aria-label={`Agregar ${song.title} a favoritos`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <Heart className="size-4" />
        </button>

        <span className="text-[9px] font-bold text-muted-foreground/45 uppercase tracking-widest">
          Nº {song.id.slice(0, 4)}
        </span>

        <button
          type="button"
          aria-label="Más opciones"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </article>
  )
}

