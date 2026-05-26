import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryRateLimiter } from '@/app/lib/rate-limiter'

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter

  beforeEach(() => {
    limiter = new InMemoryRateLimiter(3, 60_000)
  })

  it('allows requests under limit', async () => {
    const r1 = await limiter.check('user1')
    const r2 = await limiter.check('user1')
    const r3 = await limiter.check('user1')
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks after max requests', async () => {
    await limiter.check('user2')
    await limiter.check('user2')
    await limiter.check('user2')
    const r4 = await limiter.check('user2')
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  it('tracks different identifiers independently', async () => {
    await limiter.check('a')
    await limiter.check('a')
    await limiter.check('a')
    const blocked = await limiter.check('a')
    const allowed = await limiter.check('b')
    expect(blocked.success).toBe(false)
    expect(allowed.success).toBe(true)
  })

  it('returns limit metadata', async () => {
    const r = await limiter.check('meta')
    expect(r.limit).toBe(3)
    expect(r.remaining).toBe(2)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it('resets after window expires', async () => {
    const fast = new InMemoryRateLimiter(1, 50)
    await fast.check('reset')
    const blocked = await fast.check('reset')
    expect(blocked.success).toBe(false)

    await new Promise(r => setTimeout(r, 100))
    const recovered = await fast.check('reset')
    expect(recovered.success).toBe(true)
  })

  it('composite key login|email|ip isolates per user+ip', async () => {
    const userA_ip1 = 'login|a@b.com|1.1.1.1'
    const userA_ip2 = 'login|a@b.com|2.2.2.2'
    await limiter.check(userA_ip1)
    await limiter.check(userA_ip1)
    await limiter.check(userA_ip1)
    const blocked = await limiter.check(userA_ip1)
    const allowed = await limiter.check(userA_ip2)
    expect(blocked.success).toBe(false)
    expect(allowed.success).toBe(true)
  })
})
