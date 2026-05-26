'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function RateLimitedPage() {
  const [seconds, setSeconds] = useState(60)

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-5">
            <ShieldAlert className="size-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Demasiados intentos</h1>
          <p className="text-muted-foreground text-sm">
            Por seguridad, bloqueamos el acceso temporalmente tras detectar múltiples intentos fallidos.
          </p>
        </div>

        {seconds > 0 ? (
          <div className="rounded-xl border border-border bg-muted p-6 space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Podrás intentarlo en</p>
            <p className="text-5xl font-bold tabular-nums text-primary">{seconds}s</p>
          </div>
        ) : (
            <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Volver al inicio de sesión
          </Link>
        )}

        {seconds > 0 && (
          <p className="text-xs text-muted-foreground">
            La página se actualizará automáticamente cuando el tiempo expire.
          </p>
        )}
      </div>
    </main>
  )
}
