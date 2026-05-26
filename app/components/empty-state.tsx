import Link from 'next/link'
import { Music2 } from 'lucide-react'

type EmptyStateProps = {
  query?: string
}

export function EmptyState({ query }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-5">
        <Music2 className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">
          {query ? `Sin resultados para "${query}"` : 'Sin canciones en el catálogo'}
        </p>
        <p className="text-sm text-muted-foreground">
          {query ? 'Intenta con otro título, artista o género.' : 'El catálogo está vacío.'}
        </p>
      </div>
      {query && (
        <Link
          href="/catalog"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Limpiar búsqueda
        </Link>
      )}
    </div>
  )
}
