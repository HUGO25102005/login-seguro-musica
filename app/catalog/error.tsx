'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-5">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Error al cargar el catálogo</h2>
        <p className="text-sm text-muted-foreground">
          Algo salió mal al obtener las canciones. Por favor, intenta de nuevo.
        </p>
      </div>
      <Button onClick={reset} className="h-11">
        Reintentar
      </Button>
    </main>
  )
}
