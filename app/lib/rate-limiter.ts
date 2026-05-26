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

export class UpstashRateLimiter implements RateLimiter {
  private limiter: import('@upstash/ratelimit').Ratelimit | null = null

  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  private async getLimiter() {
    if (this.limiter) return this.limiter
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    this.limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(this.max, `${this.windowMs} ms`),
      prefix: 'rl:auth',
      analytics: true,
    })
    return this.limiter
  }

  async check(id: string) {
    const limiter = await this.getLimiter()
    const result = await limiter.limit(id)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    }
  }
}

export const getRateLimiter = (): RateLimiter =>
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new UpstashRateLimiter(5, 60_000)
    : new InMemoryRateLimiter(5, 60_000)
