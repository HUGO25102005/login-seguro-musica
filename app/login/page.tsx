import Link from 'next/link'
import { login, signup, signInWithGoogle } from '@/app/auth/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PasswordInput } from '@/components/password-input'
import { SubmitButton } from '@/components/submit-button'
import { AlertCircle, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Acceso' }

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string; error?: string; tab?: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="min-h-screen flex">
      {/* Hero panel — visible en lg+ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-violet-700 via-fuchsia-600 to-pink-500 text-white">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="16" fill="white" fillOpacity="0.15" />
            <rect x="7"  y="14" width="2.5" height="4"  rx="1.25" fill="white" opacity="0.7" />
            <rect x="11" y="11" width="2.5" height="10" rx="1.25" fill="white" />
            <rect x="15" y="8"  width="2.5" height="16" rx="1.25" fill="white" />
            <rect x="19" y="11" width="2.5" height="10" rx="1.25" fill="white" />
            <rect x="23" y="14" width="2.5" height="4"  rx="1.25" fill="white" opacity="0.7" />
          </svg>
          <span className="font-bold text-lg tracking-tight">Secure Music Cloud</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Tu música, segura<br />y siempre contigo.
          </h1>
          <p className="text-white/80 text-lg max-w-sm">
            Accede a tu catálogo personal desde cualquier dispositivo. Protegido con autenticación de nivel empresarial.
          </p>
        </div>

        {/* Decorative waveform */}
        <div className="flex items-end gap-1 h-16 opacity-30" aria-hidden="true">
          {[4, 7, 12, 9, 14, 6, 10, 16, 8, 11, 5, 13, 7, 9, 12, 6, 10, 8, 14, 5].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white rounded-full"
              style={{ height: `${h * 4}px` }}
            />
          ))}
        </div>
      </div>

      {/* Form panel */}
      <main
        id="main"
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background"
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
          Saltar al contenido
        </a>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="m-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="16" fill="url(#m-grad)" />
              <rect x="7"  y="14" width="2.5" height="4"  rx="1.25" fill="white" opacity="0.8" />
              <rect x="11" y="11" width="2.5" height="10" rx="1.25" fill="white" />
              <rect x="15" y="8"  width="2.5" height="16" rx="1.25" fill="white" />
              <rect x="19" y="11" width="2.5" height="10" rx="1.25" fill="white" />
              <rect x="23" y="14" width="2.5" height="4"  rx="1.25" fill="white" opacity="0.8" />
            </svg>
            <span className="font-bold text-base tracking-tight">Secure Music Cloud</span>
          </div>

          {/* Alerts */}
          {searchParams?.message && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground"
            >
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-success" />
              {searchParams.message}
            </div>
          )}
          {searchParams?.error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-3 rounded-lg border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm text-foreground"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              {searchParams.error}
            </div>
          )}

          <Tabs defaultValue={searchParams?.tab === 'signup' ? 'signup' : 'login'}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Crear cuenta</TabsTrigger>
            </TabsList>

            {/* ── Login tab ── */}
            <TabsContent value="login" className="mt-6">
              <form className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Correo electrónico</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Link
                      href="/auth/reset"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <PasswordInput
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <SubmitButton formAction={login} pendingText="Entrando…">
                  Entrar
                </SubmitButton>
              </form>
            </TabsContent>

            {/* ── Signup tab ── */}
            <TabsContent value="signup" className="mt-6">
              <form className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Correo electrónico</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <PasswordInput
                    id="signup-password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Ej: MiPass1!"
                    required
                    minLength={8}
                  />
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground" aria-label="Requisitos de contraseña">
                    <li>✓ Mínimo 8 caracteres</li>
                    <li>✓ Una letra mayúscula</li>
                    <li>✓ Un número</li>
                    <li>✓ Un carácter especial</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm">Confirmar contraseña</Label>
                  <PasswordInput
                    id="signup-confirm"
                    name="confirm"
                    autoComplete="new-password"
                    placeholder="Repite la contraseña"
                    required
                    minLength={8}
                  />
                </div>

                <SubmitButton formAction={signup} pendingText="Creando cuenta…">
                  Crear cuenta
                </SubmitButton>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
