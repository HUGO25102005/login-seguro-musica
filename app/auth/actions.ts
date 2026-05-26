'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { auditLog } from '@/app/lib/audit-logger'
import { parseLogin, parseSignup } from '@/app/lib/auth-schemas'

export async function login(formData: FormData) {
  const parsed = parseLogin({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success || !parsed.data) {
    return redirect('/login?error=' + encodeURIComponent(parsed.error!))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    auditLog({ event: 'LOGIN_FAILURE', metadata: { email: parsed.data.email } })
    return redirect(
      '/login?error=' + encodeURIComponent('Credenciales incorrectas. Verifica tu email y contraseña.'),
    )
  }

  auditLog({ event: 'LOGIN_SUCCESS', metadata: { email: parsed.data.email } })
  revalidatePath('/', 'layout')
  redirect('/catalog')
}

export async function signup(formData: FormData) {
  const parsed = parseSignup({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success || !parsed.data) {
    return redirect('/login?error=' + encodeURIComponent(parsed.error!))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp(parsed.data)

  if (error) {
    console.error('[signup]', error.message)
    return redirect(
      '/login?error=' + encodeURIComponent('No se pudo completar el registro. Intenta de nuevo.'),
    )
  }

  auditLog({ event: 'SIGNUP', metadata: { email: parsed.data.email } })
  revalidatePath('/', 'layout')
  redirect('/login?message=Revisa tu correo para confirmar el registro')
}

export async function signInWithGoogle() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (error) {
    return redirect('/login?error=' + encodeURIComponent('Error al iniciar sesión con Google.'))
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  auditLog({ event: 'LOGOUT' })
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')

  const email = formData.get('email')
  if (typeof email !== 'string' || !email.trim()) {
    return redirect('/auth/reset?error=El correo es requerido')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteUrl}/auth/reset/confirm`,
  })

  if (error) {
    console.error('[resetPassword]', error.message)
    return redirect(
      '/auth/reset?error=' + encodeURIComponent('No se pudo procesar la solicitud. Intenta de nuevo.'),
    )
  }

  redirect('/auth/reset?message=Revisa tu correo para restablecer tu contraseña')
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) {
    return redirect('/auth/reset/confirm?error=La contraseña debe tener al menos 8 caracteres')
  }
  if (password !== confirm) {
    return redirect('/auth/reset/confirm?error=Las contraseñas no coinciden')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[updatePassword]', error.message)
    return redirect(
      '/auth/reset/confirm?error=' + encodeURIComponent('No se pudo actualizar la contraseña. Intenta de nuevo.'),
    )
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Contraseña actualizada. Inicia sesión.')
}
