import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Next.js stubs ───────────────────────────────────────────────────────────

const mockRedirect = vi.fn((url: string): never => {
  throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};` })
})
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (k: string) => (k === 'user-agent' ? 'vitest' : null),
  }),
}))

// ─── Supabase stub factory ───────────────────────────────────────────────────

const makeSupabase = (overrides: Partial<{
  signInWithPassword: ReturnType<typeof vi.fn>
  signUp: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  getUser: ReturnType<typeof vi.fn>
  signInWithOAuth: ReturnType<typeof vi.fn>
  resetPasswordForEmail: ReturnType<typeof vi.fn>
  updateUser: ReturnType<typeof vi.fn>
}> = {}) => ({
  auth: {
    signInWithPassword: overrides.signInWithPassword ?? vi.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
    signUp: overrides.signUp ?? vi.fn().mockResolvedValue({ data: { user: { id: 'uid-2' } }, error: null }),
    signOut: overrides.signOut ?? vi.fn().mockResolvedValue({ error: null }),
    getUser: overrides.getUser ?? vi.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } } }),
    signInWithOAuth: overrides.signInWithOAuth ?? vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2/...' }, error: null }),
    resetPasswordForEmail: overrides.resetPasswordForEmail ?? vi.fn().mockResolvedValue({ error: null }),
    updateUser: overrides.updateUser ?? vi.fn().mockResolvedValue({ error: null }),
  },
})

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const makeFormData = (fields: Record<string, string>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const redirectedTo = (e: unknown): string => {
  if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
    const match = (e as Error & { digest: string }).digest.match(/NEXT_REDIRECT;[^;]+;([^;]+)/)
    return match?.[1] ?? ''
  }
  throw e
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('login action', () => {
  let createClient: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const mod = await import('@/utils/supabase/server')
    createClient = mod.createClient as ReturnType<typeof vi.fn>
    mockRedirect.mockClear()
  })

  it('redirects to /catalog on success', async () => {
    createClient.mockResolvedValue(makeSupabase())
    const { login } = await import('@/app/auth/actions')
    await expect(login(makeFormData({ email: 'a@b.com', password: 'ValidPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/catalog')
  })

  it('redirects to /login?error on bad credentials', async () => {
    createClient.mockResolvedValue(makeSupabase({
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } }),
    }))
    const { login } = await import('@/app/auth/actions')
    await expect(login(makeFormData({ email: 'a@b.com', password: 'bad' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?error='))
  })

  it('redirects to /login?error on invalid email format', async () => {
    const { login } = await import('@/app/auth/actions')
    await expect(login(makeFormData({ email: 'notanemail', password: 'abc' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?error='))
  })

  it('redirects to /login?error on empty password', async () => {
    const { login } = await import('@/app/auth/actions')
    await expect(login(makeFormData({ email: 'a@b.com', password: '' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?error='))
  })
})

describe('signup action', () => {
  let createClient: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const mod = await import('@/utils/supabase/server')
    createClient = mod.createClient as ReturnType<typeof vi.fn>
    mockRedirect.mockClear()
    vi.resetModules()
  })

  it('redirects to /login?message on successful registration', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase())
    const { signup } = await import('@/app/auth/actions')
    await expect(signup(makeFormData({ email: 'new@b.com', password: 'ValidPass1!', confirm: 'ValidPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?message='))
  })

  it('redirects with error when passwords do not match', async () => {
    const { signup } = await import('@/app/auth/actions')
    await expect(signup(makeFormData({ email: 'a@b.com', password: 'ValidPass1!', confirm: 'OtherPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    const url = mockRedirect.mock.calls[0][0] as string
    expect(url).toContain('/login?tab=signup&error=')
    expect(decodeURIComponent(url)).toContain('no coinciden')
  })

  it('redirects with error for weak password (no uppercase)', async () => {
    const { signup } = await import('@/app/auth/actions')
    await expect(signup(makeFormData({ email: 'a@b.com', password: 'lowercase1!', confirm: 'lowercase1!' }))).rejects.toThrow('NEXT_REDIRECT')
    const url = mockRedirect.mock.calls[0][0] as string
    expect(decodeURIComponent(url)).toContain('mayúscula')
  })

  it('redirects with error for weak password (no number)', async () => {
    const { signup } = await import('@/app/auth/actions')
    await expect(signup(makeFormData({ email: 'a@b.com', password: 'NoNumber!', confirm: 'NoNumber!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(decodeURIComponent(mockRedirect.mock.calls[0][0] as string)).toContain('número')
  })

  it('redirects with error for weak password (no special char)', async () => {
    const { signup } = await import('@/app/auth/actions')
    await expect(signup(makeFormData({ email: 'a@b.com', password: 'NoSpecial1', confirm: 'NoSpecial1' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(decodeURIComponent(mockRedirect.mock.calls[0][0] as string)).toContain('especial')
  })

  it('redirects with error when Supabase returns error (e.g. email rate limit)', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase({
      signUp: vi.fn().mockResolvedValue({ data: {}, error: { message: 'email rate limit exceeded' } }),
    }))
    const { signup } = await import('@/app/auth/actions')
    await expect(signup(makeFormData({ email: 'a@b.com', password: 'ValidPass1!', confirm: 'ValidPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?tab=signup&error='))
  })
})

describe('resetPassword action', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRedirect.mockClear()
  })

  it('always redirects with success message (enumeration prevention)', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase())
    const { resetPassword } = await import('@/app/auth/actions')
    await expect(resetPassword(makeFormData({ email: 'any@valid.com' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/reset?message='))
  })

  it('redirects with success message even when Supabase errors', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase({
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: { message: 'unknown error' } }),
    }))
    const { resetPassword } = await import('@/app/auth/actions')
    await expect(resetPassword(makeFormData({ email: 'any@valid.com' }))).rejects.toThrow('NEXT_REDIRECT')
    // Still shows the generic success to prevent email enumeration
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/reset?message='))
  })

  it('redirects to /auth/reset?error for invalid email', async () => {
    const { resetPassword } = await import('@/app/auth/actions')
    await expect(resetPassword(makeFormData({ email: 'notanemail' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/reset?error='))
  })
})

describe('updatePassword action', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRedirect.mockClear()
  })

  it('redirects to /login?message on success', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase())
    const { updatePassword } = await import('@/app/auth/actions')
    await expect(updatePassword(makeFormData({ password: 'ValidPass1!', confirm: 'ValidPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?message='))
  })

  it('redirects to /auth/reset?error when no active session', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase({
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    }))
    const { updatePassword } = await import('@/app/auth/actions')
    await expect(updatePassword(makeFormData({ password: 'ValidPass1!', confirm: 'ValidPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/reset?error='))
  })

  it('redirects to /auth/reset/confirm?error when passwords do not match', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase())
    const { updatePassword } = await import('@/app/auth/actions')
    await expect(updatePassword(makeFormData({ password: 'ValidPass1!', confirm: 'Other1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/reset/confirm?error='))
  })

  it('enforces strength rules (weak password → error)', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase())
    const { updatePassword } = await import('@/app/auth/actions')
    await expect(updatePassword(makeFormData({ password: 'weakpass', confirm: 'weakpass' }))).rejects.toThrow('NEXT_REDIRECT')
    const url = mockRedirect.mock.calls[0][0] as string
    expect(url).toContain('/auth/reset/confirm?error=')
  })

  it('redirects to /auth/reset/confirm?error when Supabase update fails', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase({
      updateUser: vi.fn().mockResolvedValue({ error: { message: 'weak password' } }),
    }))
    const { updatePassword } = await import('@/app/auth/actions')
    await expect(updatePassword(makeFormData({ password: 'ValidPass1!', confirm: 'ValidPass1!' }))).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/reset/confirm?error='))
  })
})

describe('signout action', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRedirect.mockClear()
  })

  it('redirects to /login after signout', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase())
    const { signout } = await import('@/app/auth/actions')
    await expect(signout()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('still redirects to /login when signOut returns error', async () => {
    const { createClient: cc } = await import('@/utils/supabase/server')
    ;(cc as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase({
      signOut: vi.fn().mockResolvedValue({ error: { message: 'session not found' } }),
    }))
    const { signout } = await import('@/app/auth/actions')
    await expect(signout()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
