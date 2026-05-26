import Link from 'next/link'
import { resetPassword } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Restablecer contraseña' }

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          <ArrowLeft className="size-3.5" />
          Volver al inicio de sesión
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Restablecer contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {searchParams?.message && (
          <div role="alert" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-success" />
            {searchParams.message}
          </div>
        )}
        {searchParams?.error && (
          <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-lg border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            {searchParams.error}
          </div>
        )}

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Correo electrónico</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <Button type="submit" formAction={resetPassword} className="w-full h-11">
            Enviar enlace
          </Button>
        </form>
      </div>
    </main>
  )
}
