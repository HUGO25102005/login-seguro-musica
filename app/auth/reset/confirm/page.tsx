import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { updatePassword } from '@/app/auth/actions'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'
import { PasswordInput } from '@/components/password-input'
import { AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva contraseña' }

export default async function ResetConfirmPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/reset?error=' + encodeURIComponent('Enlace inválido o expirado.'))
  }

  const searchParams = await props.searchParams

  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Elige una contraseña segura de al menos 8 caracteres.
          </p>
        </div>

        {searchParams?.error && (
          <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-lg border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            {searchParams.error}
          </div>
        )}

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <PasswordInput
              id="confirm-password"
              name="confirm"
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              required
              minLength={8}
            />
          </div>
          <SubmitButton formAction={updatePassword} pendingText="Actualizando…">
            Actualizar contraseña
          </SubmitButton>
        </form>
      </div>
    </main>
  )
}
