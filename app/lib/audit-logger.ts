import { headers } from 'next/headers'

export type AuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'SIGNUP'
  | 'LOGOUT'
  | 'LOGOUT_FAILURE'
  | 'OAUTH_INITIATED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_UPDATED'
  | 'RATE_LIMIT_HIT'
  | 'AUTH_CALLBACK_ERROR'
  | 'UNAUTHORIZED_ACCESS'
  | 'SONG_CREATED'

interface AuditEntry {
  event: AuditEvent
  userId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export async function getRequestContext(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers()
  const vercel = h.get('x-vercel-forwarded-for')
  const fwd = h.get('x-forwarded-for')
  const real = h.get('x-real-ip')
  const ip = vercel
    ? vercel.split(',')[0].trim()
    : process.env.TRUST_PROXY === '1' && fwd
      ? fwd.split(',')[0].trim()
      : (real ?? '127.0.0.1')
  const userAgent = h.get('user-agent') ?? 'unknown'
  return { ip, userAgent }
}

export const auditLog = (entry: Omit<AuditEntry, 'timestamp'>) => {
  const log: AuditEntry = { ...entry, timestamp: new Date().toISOString() }
  console.log(JSON.stringify({ level: 'audit', ...log }))
  // void persistAudit(log).catch(() => {}) // phase 2: uncomment when audit_logs table + admin client are ready
}
