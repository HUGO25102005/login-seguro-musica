'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { auditLog, getRequestContext } from '@/app/lib/audit-logger'
import { parseLogin, parseSignup, parseEmail, parseUpdatePassword } from '@/app/lib/auth-schemas'
import { getRateLimiter } from '@/app/lib/rate-limiter'

const limiter = getRateLimiter()

export async function login(formData: FormData) {
  const parsed = parseLogin({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success || !parsed.data) {
    return redirect('/login?error=' + encodeURIComponent(parsed.error!))
  }

  const { ip, userAgent } = await getRequestContext()

  const limitResult = await limiter.check(`login|${parsed.data.email}|${ip}`)
  if (!limitResult.success) {
    auditLog({ event: 'RATE_LIMIT_HIT', ip, userAgent, metadata: { action: 'login', email: parsed.data.email } })
    return redirect(
      '/login?error=' + encodeURIComponent(`Demasiados intentos. Reintenta en ${limitResult.retryAfter}s.`),
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    auditLog({ event: 'LOGIN_FAILURE', ip, userAgent, metadata: { email: parsed.data.email, error: error.message } })
    return redirect(
      '/login?error=' + encodeURIComponent('Credenciales incorrectas. Verifica tu email y contraseña.'),
    )
  }

  auditLog({ event: 'LOGIN_SUCCESS', userId: data.user?.id, ip, userAgent, metadata: { email: parsed.data.email } })
  revalidatePath('/', 'layout')
  redirect('/catalog')
}

export async function signup(formData: FormData) {
  const parsed = parseSignup({
    email: formData.get('email'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success || !parsed.data) {
    return redirect('/login?tab=signup&error=' + encodeURIComponent(parsed.error!))
  }

  const { ip, userAgent } = await getRequestContext()

  const limitResult = await limiter.check(`signup|${ip}`)
  if (!limitResult.success) {
    auditLog({ event: 'RATE_LIMIT_HIT', ip, userAgent, metadata: { action: 'signup' } })
    return redirect(
      '/login?tab=signup&error=' + encodeURIComponent(`Demasiados intentos. Reintenta en ${limitResult.retryAfter}s.`),
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    console.error('[signup]', error.message)
    return redirect(
      '/login?tab=signup&error=' + encodeURIComponent('No se pudo completar el registro. Intenta de nuevo.'),
    )
  }

  auditLog({ event: 'SIGNUP', userId: data.user?.id, ip, userAgent, metadata: { email: parsed.data.email } })
  revalidatePath('/', 'layout')
  redirect('/login?message=Revisa tu correo para confirmar el registro')
}

export async function signInWithGoogle() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')
  }

  const { ip, userAgent } = await getRequestContext()

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (error) {
    return redirect('/login?error=' + encodeURIComponent('Error al iniciar sesión con Google.'))
  }

  auditLog({ event: 'OAUTH_INITIATED', ip, userAgent, metadata: { provider: 'google' } })

  if (data.url) {
    redirect(data.url)
  }
}

export async function signout() {
  const { ip, userAgent } = await getRequestContext()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) {
    auditLog({ event: 'LOGOUT_FAILURE', userId: user?.id, ip, userAgent, metadata: { error: error.message } })
  } else {
    auditLog({ event: 'LOGOUT', userId: user?.id, ip, userAgent })
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const emailResult = parseEmail(formData.get('email'))
  if (!emailResult.success || !emailResult.data) {
    return redirect('/auth/reset?error=' + encodeURIComponent(emailResult.error ?? 'Correo inválido.'))
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')

  const { ip, userAgent } = await getRequestContext()
  const { email } = emailResult.data

  const limitResult = await limiter.check(`reset|${email}|${ip}`)
  if (!limitResult.success) {
    auditLog({ event: 'RATE_LIMIT_HIT', ip, userAgent, metadata: { action: 'reset', email } })
    return redirect(
      '/auth/reset?error=' + encodeURIComponent(`Demasiados intentos. Reintenta en ${limitResult.retryAfter}s.`),
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/auth/reset/confirm')}`,
  })

  auditLog({ event: 'PASSWORD_RESET_REQUESTED', ip, userAgent, metadata: { email, ok: !error } })

  if (error) {
    console.error('[resetPassword]', error.message)
  }

  // Always redirect with the same success message to prevent email enumeration
  redirect('/auth/reset?message=Revisa tu correo para restablecer tu contraseña')
}

export async function updatePassword(formData: FormData) {
  const { ip, userAgent } = await getRequestContext()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/auth/reset?error=' + encodeURIComponent('Enlace inválido o expirado.'))
  }

  const parsed = parseUpdatePassword({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success || !parsed.data) {
    return redirect('/auth/reset/confirm?error=' + encodeURIComponent(parsed.error!))
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    console.error('[updatePassword]', error.message)
    return redirect(
      '/auth/reset/confirm?error=' + encodeURIComponent('No se pudo actualizar la contraseña. Intenta de nuevo.'),
    )
  }

  auditLog({ event: 'PASSWORD_UPDATED', userId: user.id, ip, userAgent })
  await supabase.auth.signOut({ scope: 'local' })
  revalidatePath('/', 'layout')
  redirect('/login?message=Contraseña actualizada. Inicia sesión.')
}
