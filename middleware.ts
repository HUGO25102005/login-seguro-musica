import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 🛡️ SecOps: Almacén temporal para Rate Limiting (en memoria)
// NOTA: En producción con escalado horizontal se usaría Redis (Upstash).
// Para efectos demostrativos/académicos, esto funciona para una instancia.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

const RATE_LIMIT_THRESHOLD = 5 // Máximo 5 intentos
const RATE_LIMIT_WINDOW = 60 * 1000 // por minuto (60000ms)

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. 🛡️ SecOps: Mitigación de Fuerza Bruta (Rate Limiting)
  const ip = request.ip ?? '127.0.0.1'
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

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
