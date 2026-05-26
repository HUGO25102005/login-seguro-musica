import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function createMiddlewareClient(request: NextRequest, requestHeaders?: Headers) {
  const hdrs = requestHeaders ?? request.headers
  let response = NextResponse.next({ request: { headers: hdrs } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options: CookieOptions) => {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: hdrs } })
          response.cookies.set({ name, value, ...options })
        },
        remove: (name, options: CookieOptions) => {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: hdrs } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  return { supabase, getResponse: () => response }
}

// request.ip fue removido en Next 15+; leer de headers estándar de proxy
export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}
