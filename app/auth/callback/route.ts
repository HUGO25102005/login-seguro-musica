import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { auditLog } from '@/app/lib/audit-logger'

const ALLOWED_REDIRECT_PATHS = ['/catalog', '/profile', '/settings', '/auth/reset/confirm']

const isSafeRedirect = (path: string): boolean =>
  ALLOWED_REDIRECT_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  )

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/catalog'

  if (!code) {
    auditLog({ event: 'AUTH_CALLBACK_ERROR', metadata: { reason: 'missing_code' } })
    return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_code`)
  }

  const safePath = isSafeRedirect(next) ? next : '/catalog'

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    auditLog({ event: 'AUTH_CALLBACK_ERROR', metadata: { reason: error.message } })
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('Error al iniciar sesión con Google.')}`,
    )
  }

  return NextResponse.redirect(`${requestUrl.origin}${safePath}`)
}
