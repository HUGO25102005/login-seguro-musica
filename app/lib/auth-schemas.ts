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

export function parseLogin(raw: { email: unknown; password: unknown }): ParseResult<LoginData> {
  if (typeof raw.email !== 'string' || typeof raw.password !== 'string') {
    return { success: false, error: 'Datos inválidos.' }
  }
  const email = raw.email.trim().toLowerCase()
  const password = raw.password
  if (!email || !password) return { success: false, error: 'Email y contraseña son requeridos.' }
  if (!EMAIL_RE.test(email) || email.length > 254) return { success: false, error: 'Email inválido.' }
  if (password.length > 128) return { success: false, error: 'Contraseña inválida.' }
  return { success: true, data: { email, password } }
}

export function parseSignup(raw: { email: unknown; password: unknown }): ParseResult<SignupData> {
  const base = parseLogin(raw)
  if (!base.success || !base.data) return base
  const { password } = base.data
  if (password.length < 8) return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (!/[A-Z]/.test(password)) return { success: false, error: 'La contraseña debe contener al menos una mayúscula.' }
  if (!/[0-9]/.test(password)) return { success: false, error: 'La contraseña debe contener al menos un número.' }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { success: false, error: 'La contraseña debe contener al menos un carácter especial.' }
  }
  return { success: true, data: base.data }
}
