// Validation schemas for auth inputs.
// TODO: replace with zod once installed (pnpm add zod).

export interface ParseResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseEmail(raw: unknown): ParseResult<{ email: string }> {
  if (typeof raw !== 'string') return { success: false, error: 'Correo inválido.' }
  const email = raw.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email) || email.length > 254)
    return { success: false, error: 'Correo inválido.' }
  return { success: true, data: { email } }
}

export function parseLogin(raw: { email: unknown; password: unknown }): ParseResult<LoginData> {
  if (typeof raw.password !== 'string') return { success: false, error: 'Datos inválidos.' }
  const emailResult = parseEmail(raw.email)
  if (!emailResult.success || !emailResult.data) return { success: false, error: emailResult.error }
  const password = raw.password
  if (!password) return { success: false, error: 'Email y contraseña son requeridos.' }
  if (password.length > 128) return { success: false, error: 'Contraseña inválida.' }
  return { success: true, data: { email: emailResult.data.email, password } }
}

function enforcePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula.'
  if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número.'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'La contraseña debe contener al menos un carácter especial.'
  return null
}

export function parseSignup(raw: { email: unknown; password: unknown; confirm?: unknown }): ParseResult<SignupData> {
  const base = parseLogin(raw)
  if (!base.success || !base.data) return base
  const { password } = base.data
  const strengthError = enforcePasswordStrength(password)
  if (strengthError) return { success: false, error: strengthError }
  if (raw.confirm !== undefined && raw.confirm !== null) {
    if (raw.confirm !== password) return { success: false, error: 'Las contraseñas no coinciden.' }
  }
  return { success: true, data: base.data }
}

export function parseUpdatePassword(raw: { password: unknown; confirm: unknown }): ParseResult<{ password: string }> {
  if (typeof raw.password !== 'string' || typeof raw.confirm !== 'string') {
    return { success: false, error: 'Datos inválidos.' }
  }
  const { password, confirm } = raw
  const strengthError = enforcePasswordStrength(password)
  if (strengthError) return { success: false, error: strengthError }
  if (password !== confirm) return { success: false, error: 'Las contraseñas no coinciden.' }
  return { success: true, data: { password } }
}
