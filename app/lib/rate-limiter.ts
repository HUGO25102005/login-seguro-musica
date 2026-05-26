export interface RateLimiter {
  check(identifier: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    retryAfter: number
  }>
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  async check(id: string) {
    const now = Date.now()
    const entry = this.store.get(id) ?? { count: 0, resetAt: now + this.windowMs }
    if (now > entry.resetAt) {
      entry.count = 0
      entry.resetAt = now + this.windowMs
    }
    entry.count++
    this.store.set(id, entry)
    return {
      success: entry.count <= this.max,
      limit: this.max,
      remaining: Math.max(0, this.max - entry.count),
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
}

// Swap for UpstashRateLimiter in production when UPSTASH_REDIS_REST_URL is set
export const getRateLimiter = (): RateLimiter => new InMemoryRateLimiter(5, 60_000)
