import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient, getClientIp } from '@/utils/supabase/middleware'

// 🛡️ SecOps: Almacén temporal para Rate Limiting (en memoria)
// NOTA: En producción con escalado horizontal se usaría Redis (Upstash).
// Para efectos demostrativos/académicos, esto funciona para una instancia.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

const RATE_LIMIT_THRESHOLD = 5 // Máximo 5 intentos
const RATE_LIMIT_WINDOW = 60 * 1000 // por minuto (60000ms)

export async function middleware(request: NextRequest) {
  // 1. 🛡️ SecOps: Mitigación de Fuerza Bruta (Rate Limiting)
  const ip = getClientIp(request)
  const isAuthAction = request.nextUrl.pathname.startsWith('/auth') ||
                       (request.nextUrl.pathname === '/login' && request.method === 'POST')

  if (isAuthAction) {
    const now = Date.now()
    const rateData = rateLimitMap.get(ip) || { count: 0, lastReset: now }

    if (now - rateData.lastReset > RATE_LIMIT_WINDOW) {
      rateData.count = 1
      rateData.lastReset = now
    } else {
      rateData.count++
    }

    rateLimitMap.set(ip, rateData)

    if (rateData.count > RATE_LIMIT_THRESHOLD) {
      return new NextResponse('Demasiadas peticiones. Por favor, intenta de nuevo en un minuto.', { 
        status: 429,
        headers: { 
          'Retry-After': '60',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      })
    }
  }

  const { supabase, getResponse } = createMiddlewareClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  const response = getResponse()

  // 🛡️ SecOps: Protección Perimetral
  if (!user && request.nextUrl.pathname.startsWith('/catalog')) {
    const url = request.nextUrl.clone()
    url.pathname = '/' // Redirigir al login
    return NextResponse.redirect(url)
  }

  // 🛡️ SecOps: Cabeceras de Seguridad Reforzadas
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim()

  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
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
