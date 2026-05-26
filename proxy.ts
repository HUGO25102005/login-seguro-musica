import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient, getClientIp } from '@/utils/supabase/middleware'
import { auditLog } from '@/app/lib/audit-logger'
import { getRateLimiter } from '@/app/lib/rate-limiter'

const rateLimiter = getRateLimiter()

export async function proxy(request: NextRequest) {
  // Generate per-request nonce for CSP (C-03)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Forward nonce + CSP to Server Components via headers() (C-03)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  // Rate limiting — reads real IP from x-forwarded-for/x-real-ip (C-01)
  const ip = getClientIp(request)
  const isAuthAction =
    request.nextUrl.pathname.startsWith('/auth') ||
    (request.nextUrl.pathname === '/login' && request.method === 'POST')

  if (isAuthAction) {
    const result = await rateLimiter.check(ip)
    if (!result.success) {
      auditLog({ event: 'RATE_LIMIT_HIT', ip })
      return new NextResponse(
        'Demasiadas peticiones. Por favor, intenta de nuevo en un minuto.',
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'Content-Type': 'text/plain; charset=utf-8',
          },
        },
      )
    }
  }

  const { supabase, getResponse } = createMiddlewareClient(request, requestHeaders)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const response = getResponse()

  // Auth guard for protected routes
  if (!user && request.nextUrl.pathname.startsWith('/catalog')) {
    auditLog({ event: 'UNAUTHORIZED_ACCESS', ip, metadata: { path: request.nextUrl.pathname } })
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Set security headers on response
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
