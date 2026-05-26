import { describe, it, expect } from 'vitest'
import {
  parseEmail,
  parseLogin,
  parseSignup,
  parseUpdatePassword,
} from '@/app/lib/auth-schemas'

// ─── parseEmail ─────────────────────────────────────────────────────────────

describe('parseEmail', () => {
  it('accepts valid email', () => {
    const r = parseEmail('User@Example.COM')
    expect(r.success).toBe(true)
    expect(r.data?.email).toBe('user@example.com')
  })

  it('rejects non-string', () => {
    expect(parseEmail(null).success).toBe(false)
    expect(parseEmail(42).success).toBe(false)
    expect(parseEmail(undefined).success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(parseEmail('').success).toBe(false)
    expect(parseEmail('   ').success).toBe(false)
  })

  it('rejects missing @ or TLD', () => {
    expect(parseEmail('notanemail').success).toBe(false)
    expect(parseEmail('a@').success).toBe(false)
    expect(parseEmail('@domain.com').success).toBe(false)
  })

  it('rejects email > 254 chars', () => {
    const long = 'a'.repeat(250) + '@b.com'
    expect(parseEmail(long).success).toBe(false)
  })
})

// ─── parseLogin ─────────────────────────────────────────────────────────────

describe('parseLogin', () => {
  it('accepts valid credentials', () => {
    const r = parseLogin({ email: 'test@example.com', password: 'secret' })
    expect(r.success).toBe(true)
    expect(r.data).toEqual({ email: 'test@example.com', password: 'secret' })
  })

  it('lowercases email', () => {
    const r = parseLogin({ email: 'TEST@Example.Com', password: 'abc' })
    expect(r.data?.email).toBe('test@example.com')
  })

  it('rejects password > 128 chars', () => {
    const r = parseLogin({ email: 'a@b.com', password: 'x'.repeat(129) })
    expect(r.success).toBe(false)
  })

  it('rejects non-string password', () => {
    expect(parseLogin({ email: 'a@b.com', password: null }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(parseLogin({ email: 'bad', password: 'abc' }).success).toBe(false)
  })
})

// ─── parseSignup ────────────────────────────────────────────────────────────

const STRONG = 'ValidPass1!'

describe('parseSignup', () => {
  it('accepts strong password without confirm', () => {
    const r = parseSignup({ email: 'a@b.com', password: STRONG })
    expect(r.success).toBe(true)
  })

  it('accepts matching confirm', () => {
    const r = parseSignup({ email: 'a@b.com', password: STRONG, confirm: STRONG })
    expect(r.success).toBe(true)
  })

  it('rejects mismatched confirm', () => {
    const r = parseSignup({ email: 'a@b.com', password: STRONG, confirm: 'Other1!' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/no coinciden/i)
  })

  it('rejects password < 8 chars', () => {
    const r = parseSignup({ email: 'a@b.com', password: 'Ab1!' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/8 caracteres/i)
  })

  it('rejects password without uppercase', () => {
    const r = parseSignup({ email: 'a@b.com', password: 'lowercase1!' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/mayúscula/i)
  })

  it('rejects password without number', () => {
    const r = parseSignup({ email: 'a@b.com', password: 'NoNumber!' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/número/i)
  })

  it('rejects password without special char', () => {
    const r = parseSignup({ email: 'a@b.com', password: 'NoSpecial1' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/especial/i)
  })

  it('returns error for invalid email', () => {
    const r = parseSignup({ email: 'bad', password: STRONG })
    expect(r.success).toBe(false)
  })
})

// ─── parseUpdatePassword ─────────────────────────────────────────────────────

describe('parseUpdatePassword', () => {
  it('accepts strong matching passwords', () => {
    const r = parseUpdatePassword({ password: STRONG, confirm: STRONG })
    expect(r.success).toBe(true)
    expect(r.data?.password).toBe(STRONG)
  })

  it('rejects mismatched passwords', () => {
    const r = parseUpdatePassword({ password: STRONG, confirm: 'Other1!' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/no coinciden/i)
  })

  it('rejects weak password', () => {
    const r = parseUpdatePassword({ password: 'weak', confirm: 'weak' })
    expect(r.success).toBe(false)
  })

  it('enforces uppercase', () => {
    const r = parseUpdatePassword({ password: 'lowercase1!', confirm: 'lowercase1!' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/mayúscula/i)
  })

  it('enforces number', () => {
    const r = parseUpdatePassword({ password: 'NoNumber!', confirm: 'NoNumber!' })
    expect(r.success).toBe(false)
  })

  it('enforces special char', () => {
    const r = parseUpdatePassword({ password: 'NoSpecial1', confirm: 'NoSpecial1' })
    expect(r.success).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(parseUpdatePassword({ password: null, confirm: null }).success).toBe(false)
  })
})
