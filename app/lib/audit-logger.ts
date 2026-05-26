type AuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'SIGNUP'
  | 'LOGOUT'
  | 'RATE_LIMIT_HIT'
  | 'AUTH_CALLBACK_ERROR'
  | 'UNAUTHORIZED_ACCESS'

interface AuditEntry {
  event: AuditEvent
  userId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export const auditLog = (entry: Omit<AuditEntry, 'timestamp'>) => {
  const log: AuditEntry = { ...entry, timestamp: new Date().toISOString() }
  console.log(JSON.stringify({ level: 'audit', ...log }))
}
