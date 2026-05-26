# Plan de Mejora de Seguridad — Secure Music Cloud

**Versión:** 1.0  
**Fecha:** 2026-05-25  
**Auditor:** Arquitecto de Seguridad (Claude Code)  
**Stack auditado:** Next.js 16.2.6 · React 19 · @supabase/ssr 0.10.3 · TypeScript · Tailwind 4

---

## 1. Resumen Ejecutivo

La aplicación implementa una base de autenticación funcional con Supabase SSR, pero contiene **18 hallazgos de seguridad** (4 Críticos, 5 Altos, 6 Medios, 3 Bajos) que invalidan o degradan seriamente las defensas declaradas en `SECURITY_REPORT.md`. El reporte existente describe el stack como "Next.js 14" cuando en realidad corre Next 16, cuya API `request.ip` fue eliminada en v15 — haciendo que el rate-limiter nunca limite realmente al cliente real. El CSP usa `unsafe-inline` y `unsafe-eval` de forma permanente (no solo en dev), lo que anula la protección XSS. El OAuth callback no valida el parámetro `state` ni el parámetro `next`, abriendo vectores de CSRF y open-redirect. No existe validación de schema (Zod), política de contraseñas, MFA, auditoría de accesos ni pruebas automatizadas. Adicionalmente, `middleware.ts` es la convención deprecada en Next 16 (renombrada a `proxy.ts`).

---

## 2. Arquitectura Actual — Flujo Auth + Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                         │
│  /login (page.tsx) → <form formAction={serverAction}>           │
│  /catalog (page.tsx) → búsqueda GET ?q=...                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│              CAPA DE PROXY / MIDDLEWARE (Edge-like)              │
│  middleware.ts  ──→  [DEPRECADO en Next 16, debe ser proxy.ts]  │
│  ├── Rate Limit  (Map en memoria — ROTO: request.ip = undefined) │
│  ├── Auth Guard  (supabase.auth.getUser → redirige /catalog)    │
│  └── Security Headers (CSP con unsafe-inline/unsafe-eval fijos) │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    SERVER ACTIONS / ROUTE HANDLERS               │
│  app/auth/actions.ts                                             │
│  ├── login()    → sin Zod, sin política de contraseñas           │
│  ├── signup()   → sin Zod, sin validación de fortaleza           │
│  ├── signInWithGoogle() → sin state PKCE, sin validación next   │
│  └── signout()                                                   │
│                                                                  │
│  app/auth/callback/route.ts                                      │
│  └── GET ?code → exchangeCodeForSession()                        │
│      ├── sin validación de `state`                               │
│      ├── sin whitelist de `next`                                 │
│      └── redirect fijo a /catalog (ignorando ?next=)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      CAPA DE DATOS (Supabase)                    │
│  utils/supabase/server.ts → createClient() (SSR cookies)        │
│  ├── Sin Data Access Layer centralizado                          │
│  ├── Sin re-verificación de usuario en /catalog page            │
│  └── .or(`title.ilike.%${query}%,...`) → filter injection       │
│                                                                  │
│  Supabase Cloud (PostgreSQL + Auth)                              │
│  ├── RLS: no verificable en repo (sin migraciones SQL)           │
│  └── Sin MFA habilitado                                          │
└─────────────────────────────────────────────────────────────────┘

Variables de entorno:
  NEXT_PUBLIC_SUPABASE_URL   → expuesta al cliente (correcto para anon)
  NEXT_PUBLIC_SUPABASE_ANON_KEY → expuesta al cliente (correcto para anon)
  NEXT_PUBLIC_SITE_URL       → FALTANTE en .env (solo NEXT_PUBLIC_SUPABASE_URL
                                y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local)
  PASSWORD_DB                → en .env raíz — potencialmente commiteado
```

---

## 3. Hallazgos Clasificados por Severidad

### CRITICOS

---

#### C-01: `request.ip` eliminado en Next.js 15+ — Rate Limiter completamente inoperante

- **Archivo:** `middleware.ts:20`
- **Descripción:** `request.ip` fue removido en Next.js 15.0.0 (confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md` — Version History: "`v15.0.0: ip and geo removed`"). El código usa `request.ip ?? '127.0.0.1'`, por lo que **todos los atacantes son tratados como `127.0.0.1`**. El contador de rate-limit se comparte entre todos los clientes, y el primer usuario legítimo en hacer 5 requests bloquea a todos los demás, mientras que un atacante con requests paralelas o desde múltiples conexiones nunca es bloqueado individualmente.
- **Impacto:** La única defensa contra fuerza bruta declarada en `SECURITY_REPORT.md` es completamente inefectiva. Permite ataques de enumeración de cuentas y credential stuffing sin restricción.
- **Fix propuesto:**

```typescript
// proxy.ts (nombre correcto en Next 16)
// Opción A: usar cabecera de proxy reverso (Vercel/Cloudflare/Nginx)
const ip =
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  'unknown'

// Opción B (recomendada para producción): Upstash Ratelimit + Redis
// pnpm add @upstash/ratelimit @upstash/redis
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
})

// En proxy():
const identifier = ip
const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
if (!success) {
  return new NextResponse('Demasiadas peticiones.', {
    status: 429,
    headers: {
      'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
    },
  })
}
```

---

#### C-02: `middleware.ts` es convención deprecada en Next.js 16 — debe renombrarse a `proxy.ts`

- **Archivo:** `middleware.ts:1-110`, `next.config.ts`
- **Descripción:** Según `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`: _"The `middleware` filename is deprecated, and has been renamed to `proxy`"_. El export `middleware` también es deprecado — debe ser `proxy`. Aunque Next 16 mantiene retrocompatibilidad temporal, el runtime ha cambiado: `proxy` corre en **Node.js** (no edge), lo que abre la puerta a usar Redis, `crypto` completo y otras APIs nativas.
- **Impacto:** El archivo genera deprecation warnings en build/dev. Si se actualiza Next en una release futura que elimine la retrocompatibilidad, el middleware deja de ejecutarse silenciosamente — sin protección perimetral ni headers de seguridad.
- **Fix propuesto:**

```bash
mv middleware.ts proxy.ts
```

```typescript
// proxy.ts
export function proxy(request: NextRequest) {  // renombrar función
  // ... mismo contenido
}

export const config = { matcher: [...] }  // config permanece igual
```

```typescript
// next.config.ts — si se usaba skipMiddlewareUrlNormalize:
const nextConfig: NextConfig = {
  skipProxyUrlNormalize: true,  // nombre actualizado
}
```

---

#### C-03: CSP con `unsafe-inline` y `unsafe-eval` permanentes — protección XSS anulada

- **Archivo:** `middleware.ts:82-83`
- **Descripción:** La política CSP declara `script-src 'self' 'unsafe-inline' 'unsafe-eval'` sin distinción entre entornos. La guía oficial de Next 16 (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) indica que `unsafe-eval` solo es necesario en **development** para stack traces de React, y que la solución correcta es usar **nonces** con `'strict-dynamic'`. Con `unsafe-inline`, cualquier script inyectado en el DOM (via XSS) se ejecuta libremente — el SECURITY_REPORT.md afirma que XSS está "bloqueado por CSP" pero esto es falso.
- **Impacto:** La CSP no ofrece protección real contra XSS. Un atacante que logre inyectar contenido (e.g., via filter injection en catalog, o parámetros URL no sanitizados) puede ejecutar JavaScript arbitrario.
- **Fix propuesto:**

```typescript
// proxy.ts
export function proxy(request: NextRequest) {
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

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim())

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim())
  return response
}
```

```typescript
// app/layout.tsx — pasar el nonce a scripts
import { headers } from 'next/headers'

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') ?? ''
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

---

#### C-04: OAuth callback sin validación de `state` — vulnerable a CSRF y Open Redirect

- **Archivo:** `app/auth/callback/route.ts:1-15`
- **Descripción:** El handler GET solo extrae `code` del query string y llama `exchangeCodeForSession(code)`. No valida el parámetro `state` (CSRF token de OAuth 2.0), no verifica que el `code` no haya sido inyectado por un tercero, y redirige incondicionalmente a `/catalog` ignorando cualquier parámetro `next`. Si se agregara un parámetro `next` en el futuro sin validación de whitelist, abriría un Open Redirect.
- **Impacto:** Un atacante puede iniciar un flujo OAuth, capturar el `code` y forzar a la víctima a completar la autenticación con la sesión del atacante (OAuth CSRF / session fixation).
- **Fix propuesto:**

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_REDIRECT_PATHS = ['/catalog', '/profile', '/settings']

const isSafeRedirect = (path: string): boolean =>
  ALLOWED_REDIRECT_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  )

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/catalog'

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_code`)
  }

  const safePath = isSafeRedirect(next) ? next : '/catalog'

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${requestUrl.origin}${safePath}`)
}
```

---

### ALTOS

---

#### A-01: Sin validación de schema (Zod) en Server Actions — inputs no sanitizados

- **Archivo:** `app/auth/actions.ts:7-28, 31-48`
- **Descripción:** Las funciones `login()` y `signup()` solo verifican que email y password no sean strings vacíos (`if (!email || !password)`). No se valida formato de email, longitud máxima, caracteres especiales, ni fortaleza de contraseña. Valores como `email = "a"` o `password = " "` (espacios) pasan la validación.
- **Impacto:** Permite ataques de payload oversizing, enumeración de cuentas por mensajes de error diferenciados, y registro con contraseñas triviales.
- **Fix propuesto:**

```typescript
// pnpm add zod
// app/lib/auth-schemas.ts
import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email inválido').max(254).toLowerCase().trim(),
  password: z.string().min(1).max(128),
})

export const SignupSchema = z.object({
  email: z.string().email('Email inválido').max(254).toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^a-zA-Z0-9]/, 'Debe contener al menos un carácter especial'),
})

// app/auth/actions.ts
import { LoginSchema, SignupSchema } from '@/app/lib/auth-schemas'

export async function login(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Datos inválidos'
    return redirect(`/login?error=${encodeURIComponent(msg)}`)
  }
  // usar parsed.data.email y parsed.data.password
}
```

---

#### A-02: Mensajes de error de Supabase expuestos directamente al cliente — enumeración de cuentas

- **Archivo:** `app/auth/actions.ts:23-24, 43-44`
- **Descripción:** `redirect('/login?error=' + encodeURIComponent(error.message))` reenvía el mensaje de error de Supabase directamente. Supabase retorna mensajes diferenciados como "Invalid login credentials" vs "Email not confirmed" vs "User not found", permitiendo a un atacante determinar si un email está registrado.
- **Impacto:** Facilita ataques de enumeración de usuarios y targeted phishing.
- **Fix propuesto:**

```typescript
// Mensaje genérico para login (nunca revelar si el email existe)
if (error) {
  return redirect('/login?error=' + encodeURIComponent(
    'Credenciales incorrectas. Verifica tu email y contraseña.'
  ))
}

// Para signup, el mensaje puede ser más específico pero sin confirmar existencia:
if (error) {
  // Loguear el error real internamente
  console.error('[signup]', error.message)
  return redirect('/login?error=' + encodeURIComponent(
    'No se pudo completar el registro. Intenta de nuevo.'
  ))
}
```

---

#### A-03: Rate-limit con `Map` en memoria — no funciona en entornos serverless/multi-instancia

- **Archivo:** `middleware.ts:7-10`
- **Descripción:** El `Map` en memoria se reinicia en cada cold start de la función serverless. En Vercel, cada worker tiene su propio estado en memoria que no se comparte. Además del problema del IP ya documentado en C-01, incluso con un IP correcto, el contador se resetea constantemente en producción.
- **Impacto:** El rate limiting es completamente inefectivo en producción serverless. Solo funciona en entornos de una sola instancia (desarrollo local con runtime persistente).
- **Fix propuesto:** Ver C-01 (Upstash Ratelimit + Redis). Interfaz pluggable recomendada en la Sección 5.

---

#### A-04: `/catalog` page sin re-verificación de usuario en Server Component

- **Archivo:** `app/catalog/page.tsx:1-77`
- **Descripción:** El middleware protege la ruta `/catalog`, pero la `CatalogPage` Server Component crea un cliente Supabase y consulta datos **sin verificar que el usuario tenga sesión activa válida**. Si el middleware falla (bug, race condition, bypass) o si la sesión expira entre el check del middleware y la ejecución del Server Component, los datos se exponen.
- **Impacto:** Defense-in-depth ausente. Un bypass de middleware (incluyendo errores de configuración del matcher) expone datos del catálogo.
- **Fix propuesto:**

```typescript
// app/catalog/page.tsx
import { redirect } from 'next/navigation'

export default async function CatalogPage(props) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // Re-verificar explícitamente aunque el middleware ya lo haga
  if (!user || userError) {
    redirect('/login')
  }

  // ... resto del componente
}
```

---

#### A-05: Filter injection en `.or()` de Supabase — bypass de filtros y potencial exposición de datos

- **Archivo:** `app/catalog/page.tsx:18-21`
- **Descripción:** La query `dbQuery.or(`title.ilike.%${query}%,artist.ilike.%${query}%,genre.ilike.%${query}%`)` interpola directamente el input del usuario en el string del filtro PostgREST. Aunque Supabase parametriza los valores de `ilike`, el **operador y estructura del filtro** se construyen por concatenación. Un usuario puede inyectar operadores PostgREST adicionales como `%,id.eq.1%` o cierres de paréntesis para alterar la lógica del filtro.
- **Impacto:** Dependiendo del schema de RLS y la estructura de la tabla, puede permitir bypass de filtros, exposición de filas no esperadas, o errores que revelan la estructura de la base de datos.
- **Fix propuesto:**

```typescript
// Sanitizar el query: solo permitir alfanuméricos, espacios y caracteres seguros
const sanitizeQuery = (q: string): string =>
  q.replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑüÜ]/g, '').slice(0, 100)

// O usar OR con métodos separados (más seguro):
if (query) {
  const safe = sanitizeQuery(query)
  dbQuery = dbQuery.or(
    `title.ilike.%${safe}%,artist.ilike.%${safe}%,genre.ilike.%${safe}%`
  )
}

// Alternativamente, usar búsqueda full-text de Postgres:
// dbQuery = dbQuery.textSearch('fts', query, { type: 'websearch' })
```

---

### MEDIOS

---

#### M-01: Parámetros `message` y `error` de URL renderizados sin sanitización adicional

- **Archivo:** `app/login/page.tsx:82-91`
- **Descripción:** `searchParams.message` y `searchParams.error` se renderizan directamente como texto en el JSX (`{searchParams.error}`). React escapa el contenido por defecto para prevenir HTML injection, pero si en algún momento se usa `dangerouslySetInnerHTML` o se pasa a un componente de terceros que no escape, se abriría XSS reflejado.
- **Impacto:** Riesgo bajo en el estado actual (React escapa), pero la práctica de pasar mensajes de error en URL es frágil y facilita ataques de phishing (URLs con mensajes falsos enviadas por atacantes).
- **Fix propuesto:** Migrar a cookies flash o estado de Server Action (`useActionState`) en lugar de query params para mensajes de error.

---

#### M-02: `NEXT_PUBLIC_SITE_URL` no definida en `.env` — OAuth redirect a localhost en producción

- **Archivo:** `app/auth/actions.ts:55-57`, `.env` / `.env.local`
- **Descripción:** `signInWithGoogle()` usa `process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'`. El archivo `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` pero no `NEXT_PUBLIC_SITE_URL`. En producción, si esta variable no está configurada en el hosting, los callbacks OAuth apuntarán a `localhost:3000`.
- **Impacto:** El flujo OAuth falla en producción. Si el atacante controla `localhost:3000` en el contexto del usuario (improbable pero posible en ciertos escenarios), podría interceptar el callback.
- **Fix propuesto:**

```bash
# .env.example (commitable, sin valores reales)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

```typescript
// app/auth/actions.ts — fallar explícitamente si falta la variable
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
if (!siteUrl) {
  throw new Error('NEXT_PUBLIC_SITE_URL environment variable is required')
}
```

---

#### M-03: `PASSWORD_DB` en archivo `.env` raíz — posible commit de secreto

- **Archivo:** `.env` (línea 1)
- **Descripción:** El archivo `.env` raíz contiene una variable `PASSWORD_DB` con valor (redactado en esta auditoría). Si `.env` no está en `.gitignore`, esta contraseña de base de datos puede estar commiteada en el repositorio.
- **Impacto:** Exposición de credenciales de base de datos en el historial de git.
- **Fix propuesto:**

```bash
# Verificar que .env esté en .gitignore
grep -E "^\.env$|^\.env\." .gitignore

# Si no está, agregar:
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Auditar historial de git:
git log --all --full-history -- .env
# Si fue commiteado, rotar el secreto y usar: git filter-repo
```

---

#### M-04: Sin política de contraseñas / longitud mínima real

- **Archivo:** `app/auth/actions.ts:31-48`
- **Descripción:** `signup()` no impone ninguna política de contraseñas. Supabase por defecto acepta contraseñas de 6+ caracteres. No hay verificación de longitud mínima, complejidad, ni listas de contraseñas comunes (HIBP).
- **Impacto:** Permite registro con contraseñas débiles como "123456", facilitando ataques de fuerza bruta.
- **Fix propuesto:** Implementar `SignupSchema` con Zod (ver A-01) + opcionalmente integrar Have I Been Pwned API para verificar contraseñas comprometidas.

---

#### M-05: Sin MFA (Multi-Factor Authentication)

- **Archivo:** `app/auth/actions.ts`, configuración de Supabase
- **Descripción:** No hay implementación de TOTP/SMS MFA para la autenticación. Supabase Auth soporta MFA nativo.
- **Impacto:** Credenciales robadas o adivinadas dan acceso completo sin segundo factor.
- **Fix propuesto:** Habilitar MFA en Supabase Dashboard → Authentication → MFA. Implementar flujo de enrollment post-login.

---

#### M-06: Sin migraciones SQL en el repositorio — RLS no auditable

- **Archivo:** (ausente) `supabase/migrations/`
- **Descripción:** No existe el directorio `supabase/migrations/` con el schema SQL. El `SECURITY_REPORT.md` afirma que RLS protege contra IDOR con `auth.uid() = id`, pero estas políticas no son verificables en el código del repositorio.
- **Impacto:** Imposible auditar, reproducir o revisar las políticas RLS en PR. Un error en las políticas de Supabase Cloud quedaría invisible hasta que sea explotado.
- **Fix propuesto:**

```bash
# Inicializar Supabase CLI
pnpm add -D supabase
npx supabase init
npx supabase db pull  # bajar schema actual del proyecto

# Estructura esperada:
# supabase/
#   migrations/
#     20240101000000_create_music_catalog.sql
#     20240101000001_enable_rls.sql
#   seed.sql
```

---

### BAJOS

---

#### B-01: `SECURITY_REPORT.md` desactualizado — stack incorrecto (Next 14 vs 16)

- **Archivo:** `SECURITY_REPORT.md:6`
- **Descripción:** El reporte documenta "Next.js 14 (App Router)" cuando el `package.json` declara `"next": "16.2.6"`. Las mitigaciones descritas (rate limiting funcional, CSP efectiva) no corresponden al estado real del código.
- **Impacto:** Genera falsa confianza en el equipo sobre la postura de seguridad real.
- **Fix propuesto:** Actualizar el reporte con los hallazgos de esta auditoría y mantenerlo sincronizado con el código real.

---

#### B-02: Sin módulo de auditoría/logging de eventos de seguridad

- **Archivo:** (ausente) `app/lib/audit-logger.ts`
- **Descripción:** No existe logging de eventos críticos: intentos de login fallidos, signouts, cambios de contraseña, accesos denegados por rate limit. Los `catch (error) {}` silenciosos en `server.ts` también suprimen errores relevantes.
- **Impacto:** Imposible detectar o investigar incidentes de seguridad post-facto.
- **Fix propuesto:** Ver Sección 5 — Módulo de Auditoría/Logging.

---

#### B-03: Sin tests de seguridad automatizados

- **Archivo:** (ausente) `__tests__/`, `vitest.config.ts`
- **Descripción:** No hay suite de tests. Las regresiones de seguridad (e.g., que el rate limit vuelva a romperse, que el auth guard sea eliminado por error) no se detectarían automáticamente.
- **Impacto:** Cualquier cambio futuro puede reintroducir vulnerabilidades sin detección.
- **Fix propuesto:** Ver Sección 7 — Verificación y tests propuestos.

---

## 4. Roadmap por Fases

### Fase 1 — Quick Wins (1-2 días, impacto inmediato)

| Tarea | Hallazgo | Esfuerzo |
|-------|----------|---------|
| Renombrar `middleware.ts` → `proxy.ts`, función `middleware` → `proxy` | C-02 | 15 min |
| Obtener IP real de cabeceras `x-forwarded-for` | C-01 (parcial) | 30 min |
| Reemplazar CSP con versión nonce (dev/prod separados) | C-03 | 2h |
| Validar `code` en callback y whitelist de `next` | C-04 | 1h |
| Re-verificar usuario en `CatalogPage` | A-04 | 20 min |
| Sanitizar `query` antes de `.or()` en catalog | A-05 | 30 min |
| Mensajes de error genéricos en login/signup | A-02 | 20 min |
| Agregar `.env` y `.env.local` a `.gitignore` (verificar) | M-03 | 10 min |
| Agregar `NEXT_PUBLIC_SITE_URL` a `.env.example` | M-02 | 10 min |

### Fase 2 — Hardening (1 semana)

| Tarea | Hallazgo | Esfuerzo |
|-------|----------|---------|
| Instalar Zod + schemas de validación para login/signup | A-01, M-04 | 4h |
| Migrar rate limit a Upstash Redis (interfaz pluggable) | C-01, A-03 | 1 día |
| Crear módulo de auditoría/logging centralizado | B-02 | 4h |
| Añadir `supabase init` + `db pull` + migraciones al repo | M-06 | 4h |
| Crear `.env.example` con todas las variables requeridas | M-02 | 30 min |
| Migrar mensajes de error de URL params a cookies flash | M-01 | 2h |

### Fase 3 — Estructural (2-4 semanas)

| Tarea | Hallazgo | Esfuerzo |
|-------|----------|---------|
| Habilitar MFA TOTP en Supabase + flujo de enrollment | M-05 | 2 días |
| Implementar Data Access Layer centralizado | Arquitectura | 3 días |
| Suite de tests con Vitest + MSW | B-03 | 3 días |
| Actualizar `SECURITY_REPORT.md` con hallazgos reales | B-01 | 2h |
| Pentest formal de las rutas /auth/* | Todos | 1 día |

---

## 5. Mejoras Arquitectónicas

### 5.1 Separación cliente/servidor de Supabase

Crear archivos distintos para los contextos de uso:

```
utils/supabase/
  server.ts      → createServerClient() para Server Components y Actions
  client.ts      → createBrowserClient() para Client Components (si aplica)
  admin.ts       → createClient(SERVICE_ROLE_KEY) SOLO para admin scripts (nunca en App)
```

### 5.2 Capa de validación con Zod — Data Access Layer

```
app/lib/
  auth-schemas.ts     → LoginSchema, SignupSchema, OAuthCallbackSchema
  catalog-schemas.ts  → CatalogQuerySchema (q: string máx 100 chars)
  definitions.ts      → Tipos TypeScript derivados de schemas Zod

app/data/             → Data Access Layer (DAL)
  auth.ts             → getCurrentUser(), requireAuth()
  catalog.ts          → searchCatalog(query: ValidatedQuery, userId: string)
```

```typescript
// app/data/auth.ts — centralizar verificación de sesión
import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error ? null : user
})

export const requireAuth = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
```

### 5.3 Módulo de Auditoría/Logging

```typescript
// app/lib/audit-logger.ts
type AuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'SIGNUP'
  | 'LOGOUT'
  | 'RATE_LIMIT_HIT'
  | 'AUTH_CALLBACK_ERROR'
  | 'UNAUTHORIZED_ACCESS'

interface AuditEntry {
  event: AuditEvent
  userId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export const auditLog = (entry: Omit<AuditEntry, 'timestamp'>) => {
  const log: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }
  // En desarrollo: console.log
  // En producción: enviar a servicio de logging (Datadog, Axiom, Supabase Edge Functions)
  console.log(JSON.stringify({ level: 'audit', ...log }))
}
```

### 5.4 Abstracción de Rate-Limit con interfaz pluggable

```typescript
// app/lib/rate-limiter.ts
export interface RateLimiter {
  check(identifier: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    retryAfter: number
  }>
}

// Implementación en memoria (solo desarrollo/testing):
export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>()
  constructor(private max: number, private windowMs: number) {}

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

// Implementación Redis (producción):
// export class UpstashRateLimiter implements RateLimiter { ... }

// Factory:
export const getRateLimiter = (): RateLimiter => {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    // return new UpstashRateLimiter(...)
  }
  return new InMemoryRateLimiter(5, 60_000)
}
```

---

## 6. Checklist OWASP Top 10 (2021) — Mapeado al Proyecto

| # | Categoría OWASP | Estado | Hallazgos Relacionados |
|---|-----------------|--------|----------------------|
| A01 | Broken Access Control | PARCIAL | Middleware protege /catalog pero C-04 (OAuth sin state), A-04 (sin re-check en SC), falta de whitelist en redirect |
| A02 | Cryptographic Failures | PARCIAL | Cookies HttpOnly/Secure gestionadas por Supabase SSR (OK). Supabase usa bcrypt para passwords (OK). Sin HTTPS forzado en next.config (solo HSTS header) |
| A03 | Injection | VULNERABLE | A-05 (filter injection en .or()), C-03 (CSP inefectiva permite XSS), A-01 (sin validación de schema) |
| A04 | Insecure Design | VULNERABLE | C-01/C-02 (rate limit roto), M-04 (sin política de contraseñas), M-05 (sin MFA), sin DAL |
| A05 | Security Misconfiguration | VULNERABLE | C-02 (middleware deprecado), C-03 (CSP permisiva), M-02 (SITE_URL faltante), M-03 (secretos en .env), sin CSP report-uri |
| A06 | Vulnerable & Outdated Components | REVISAR | @supabase/ssr 0.10.3 — verificar changelog para CVEs. No hay `pnpm audit` en CI |
| A07 | Identification & Auth Failures | VULNERABLE | C-01 (rate limit inoperante), A-01 (sin validación), A-02 (enumeración de usuarios), M-04 (contraseñas débiles), M-05 (sin MFA), C-04 (OAuth CSRF) |
| A08 | Software & Data Integrity | N/A | No hay pipelines de CI/CD ni deserialización custom en el repo visible |
| A09 | Security Logging & Monitoring | AUSENTE | B-02 (sin audit log), catch vacíos en server.ts, sin alertas |
| A10 | Server-Side Request Forgery | BAJO RIESGO | No hay fetch a URLs controladas por usuario en el código actual. Monitorear si se agregan integraciones externas |

Leyenda: **OK** = mitigado, **PARCIAL** = mitigación incompleta, **VULNERABLE** = expuesto, **AUSENTE** = sin implementar, **REVISAR** = requiere evaluación externa

---

## 7. Verificación — Comandos para Validar Cada Fix

### Build y lint

```bash
# Verificar que el build pasa sin errores de deprecation
pnpm build 2>&1 | grep -E "error|warn|deprecated"

# Lint
pnpm lint

# Verificar que proxy.ts es reconocido (Next 16)
ls proxy.ts  # debe existir después de renombrar middleware.ts

# Verificar que no queda middleware.ts (deprecado)
ls middleware.ts 2>&1  # debe dar "No such file"
```

### Variables de entorno

```bash
# Verificar que todas las variables requeridas están definidas
node -e "
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL'
];
required.forEach(v => {
  if (!process.env[v]) console.error('MISSING:', v);
  else console.log('OK:', v);
});
" -- --env-file=.env.local
```

### CSP con nonces

```bash
# Verificar que la respuesta NO contiene unsafe-inline ni unsafe-eval en producción
curl -s -o /dev/null -D - http://localhost:3000/login | grep "Content-Security-Policy" | grep -v "unsafe"
# (debe mostrar la cabecera sin unsafe-inline ni unsafe-eval)

# En dev, unsafe-eval es aceptable:
NODE_ENV=development pnpm dev &
curl -s -o /dev/null -D - http://localhost:3000/login | grep "Content-Security-Policy"
```

### Rate Limiting

```bash
# Verificar que requests desde diferentes IPs son rastreadas independientemente
# (requiere que x-forwarded-for esté siendo leído)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-Forwarded-For: 10.0.0.1" \
    -X POST http://localhost:3000/auth/sign-in
done
# Las primeras 5 deben dar 200 o redirect, la 6ta debe dar 429

# Verificar que otra IP no está limitada:
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Forwarded-For: 10.0.0.2" \
  -X POST http://localhost:3000/auth/sign-in
# Debe dar 200 o redirect, NO 429
```

### OAuth Callback

```bash
# Verificar que callback sin code redirige a /login
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "http://localhost:3000/auth/callback"
# Debe dar: 307 http://localhost:3000/login?error=missing_code

# Verificar que next con path no permitido es ignorado
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "http://localhost:3000/auth/callback?code=FAKE&next=https://evil.com"
# Debe redirigir a /catalog, NO a https://evil.com
```

### Filter Injection en Catalog

```bash
# Verificar que caracteres especiales son sanitizados
curl -s "http://localhost:3000/catalog?q=test%2Cid.eq.1" \
  -H "Cookie: [session-cookie]"
# Debe ejecutar búsqueda normal, no alterar el filtro SQL
```

### Auditoría de secretos en git

```bash
# Verificar que .env no está trackeado
git ls-files .env .env.local 2>/dev/null
# No debe mostrar ningún archivo

# Verificar historial
git log --all --oneline -- .env .env.local
# Idealmente sin commits
```

### Tests de seguridad propuestos (una vez instalado Vitest)

```bash
# pnpm add -D vitest @vitejs/plugin-react msw

# Ejecutar suite completa
pnpm test

# Tests sugeridos a implementar:
# - auth-schemas.test.ts: LoginSchema/SignupSchema con inputs inválidos
# - rate-limiter.test.ts: que InMemoryRateLimiter bloquea en el intento 6+
# - callback.test.ts: que next no permitido es rechazado
# - catalog.test.ts: que query con caracteres especiales es sanitizado
# - auth-guard.test.ts: que /catalog sin sesión redirige a /login
```

### Verificar dependencias con vulnerabilidades conocidas

```bash
pnpm audit
# Revisar especialmente: @supabase/ssr, next, react
```

---

## Apéndice — Resumen de Hallazgos

| ID | Severidad | Título | Archivo |
|----|-----------|--------|---------|
| C-01 | CRITICO | `request.ip` eliminado — rate limiter inoperante | `middleware.ts:20` |
| C-02 | CRITICO | `middleware.ts` deprecado en Next 16 | `middleware.ts:1` |
| C-03 | CRITICO | CSP con `unsafe-inline`/`unsafe-eval` permanentes | `middleware.ts:82-83` |
| C-04 | CRITICO | OAuth callback sin validación de state / Open Redirect | `app/auth/callback/route.ts` |
| A-01 | ALTO | Sin validación Zod en Server Actions | `app/auth/actions.ts:7-48` |
| A-02 | ALTO | Mensajes de error Supabase expuestos — enumeración | `app/auth/actions.ts:23,43` |
| A-03 | ALTO | Rate-limit en Map — no funciona en serverless | `middleware.ts:7-10` |
| A-04 | ALTO | `/catalog` sin re-verificación de usuario | `app/catalog/page.tsx:1` |
| A-05 | ALTO | Filter injection en `.or()` de Supabase | `app/catalog/page.tsx:19` |
| M-01 | MEDIO | Params de error en URL renderizados sin protección extra | `app/login/page.tsx:82-91` |
| M-02 | MEDIO | `NEXT_PUBLIC_SITE_URL` no definida — OAuth a localhost | `app/auth/actions.ts:55` |
| M-03 | MEDIO | `PASSWORD_DB` en `.env` raíz — posible secreto commiteado | `.env:1` |
| M-04 | MEDIO | Sin política de contraseñas / longitud mínima | `app/auth/actions.ts:31-48` |
| M-05 | MEDIO | Sin MFA | Configuración Supabase |
| M-06 | MEDIO | Sin migraciones SQL — RLS no auditable en repo | (ausente) |
| B-01 | BAJO | `SECURITY_REPORT.md` desactualizado (Next 14 vs 16) | `SECURITY_REPORT.md:6` |
| B-02 | BAJO | Sin módulo de auditoría/logging | (ausente) |
| B-03 | BAJO | Sin tests de seguridad automatizados | (ausente) |

**Total: 18 hallazgos — 4 Críticos / 5 Altos / 6 Medios / 3 Bajos**
