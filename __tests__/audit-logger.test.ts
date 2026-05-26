import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { auditLog } from '@/app/lib/audit-logger'

// Mock next/headers — not available outside Next.js runtime
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}))

describe('auditLog', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('logs valid audit event as JSON', () => {
    auditLog({ event: 'LOGIN_SUCCESS', userId: 'uid-1', ip: '1.2.3.4', userAgent: 'test-agent' })
    expect(consoleSpy).toHaveBeenCalledOnce()
    const call = consoleSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(call)
    expect(parsed.level).toBe('audit')
    expect(parsed.event).toBe('LOGIN_SUCCESS')
    expect(parsed.userId).toBe('uid-1')
    expect(parsed.ip).toBe('1.2.3.4')
    expect(parsed.userAgent).toBe('test-agent')
    expect(parsed.timestamp).toBeTruthy()
  })

  it('includes timestamp in ISO format', () => {
    auditLog({ event: 'LOGOUT' })
    const raw = consoleSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(raw)
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp)
  })

  it('logs all supported event types without throwing', () => {
    const events = [
      'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'SIGNUP', 'LOGOUT', 'LOGOUT_FAILURE',
      'OAUTH_INITIATED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_UPDATED',
      'RATE_LIMIT_HIT', 'AUTH_CALLBACK_ERROR', 'UNAUTHORIZED_ACCESS',
    ] as const
    for (const event of events) {
      expect(() => auditLog({ event })).not.toThrow()
    }
    expect(consoleSpy).toHaveBeenCalledTimes(events.length)
  })

  it('includes metadata when provided', () => {
    auditLog({ event: 'LOGIN_FAILURE', metadata: { email: 'a@b.com', error: 'bad pass' } })
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(parsed.metadata.email).toBe('a@b.com')
    expect(parsed.metadata.error).toBe('bad pass')
  })

  it('omits optional fields when not provided', () => {
    auditLog({ event: 'RATE_LIMIT_HIT' })
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(parsed.userId).toBeUndefined()
    expect(parsed.ip).toBeUndefined()
  })
})
