# Plan de Pruebas — Secure Music Cloud

**Versión:** 1.0  
**Fecha:** 2026-05-25  
**Proyecto:** Next.js 16.2.6 · React 19 · Supabase SSR · Tailwind v4  
**Basado en:** `IMPROVEMENT_PLAN.md` (18 hallazgos: 4 Críticos, 5 Altos, 6 Medios, 3 Bajos)

---

## 1. Alcance

Este plan cubre cuatro dimensiones de prueba:

| Dimensión | Páginas / Módulos |
|-----------|------------------|
| **Funcional** | `/login` (tabs login + signup), `/auth/reset`, `/auth/reset/confirm`, `/catalog`, `/rate-limited`, flujo OAuth |
| **Seguridad** | Hallazgos C-01 a B-03 del `IMPROVEMENT_PLAN.md` |
| **Accesibilidad** | WCAG 2.1 AA en todas las páginas públicas y autenticadas |
| **Build / Regresión** | TypeScript, ESLint, `pnpm build` sin errores |

---

## 2. Entorno de Prueba

```bash
# Instalar dependencias
pnpm install

# Variables de entorno necesarias (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Iniciar servidor de desarrollo
pnpm dev   # http://localhost:3000
```

**Cuentas de prueba necesarias:**
- Usuario existente confirmado: `test-confirmed@example.com`
- Usuario inexistente: `no-existe@example.com`
- Usuario no confirmado: `test-unconfirmed@example.com`

---

## 3. Pruebas Funcionales

### 3.1 Página de Login — Pestaña "Iniciar sesión"

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-01 | Login exitoso | Ingresar email + contraseña válidos → Enviar | Redirección a `/catalog` |
| F-02 | Login con credenciales incorrectas | Email válido + contraseña incorrecta → Enviar | Alerta de error visible en pestaña "Iniciar sesión"; mensaje genérico (no revela si email existe) |
| F-03 | Login con email inválido | `no-es-email` → Enviar | Validación HTML5 del navegador impide submit; campo marcado como inválido |
| F-04 | Estado de carga del botón | Click "Entrar" | Botón muestra spinner + texto "Entrando…"; botón deshabilitado durante la petición |
| F-05 | Link "¿Olvidaste tu contraseña?" | Click en el enlace | Navega a `/auth/reset` |
| F-06 | Toggle visibilidad de contraseña | Click en el ícono ojo del campo contraseña | Campo alterna entre `type="password"` y `type="text"` |
| F-07 | Tab activa persiste en error | Enviar credenciales incorrectas | Alerta aparece en la pestaña "Iniciar sesión" (no cambia a "Crear cuenta") |

### 3.2 Página de Login — Pestaña "Crear cuenta"

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-08 | Signup exitoso | Email nuevo + contraseña válida (≥8 chars, mayúscula, número, especial) → Enviar | Redirección a `/login?message=Revisa tu correo...`; alerta verde visible |
| F-09 | Signup con email ya registrado | Email existente + contraseña válida → Enviar | Alerta de error en pestaña "Crear cuenta"; mensaje genérico sin revelar si email existe |
| F-10 | Signup con contraseña corta | Contraseña con 7 caracteres → Enviar | Error: "La contraseña debe tener al menos 8 caracteres" |
| F-11 | Signup sin mayúscula | `password1!` → Enviar | Error: "La contraseña debe contener al menos una mayúscula" |
| F-12 | Signup sin número | `Password!` → Enviar | Error: "La contraseña debe contener al menos un número" |
| F-13 | Signup sin carácter especial | `Password1` → Enviar | Error: "La contraseña debe contener al menos un carácter especial" |
| F-14 | Requisitos de contraseña visibles | Abrir pestaña "Crear cuenta" | Lista de 4 requisitos visible bajo el campo de contraseña |
| F-15 | Tab activa persiste en error | Enviar con contraseña débil | Alerta aparece en pestaña "Crear cuenta" (no cambia a "Iniciar sesión") |
| F-16 | Estado de carga del botón | Click "Crear cuenta" | Botón muestra spinner + texto "Creando cuenta…"; botón deshabilitado |
| F-17 | Selección de tab por URL | Navegar a `/login?tab=signup` | Pestaña "Crear cuenta" activa por defecto |

### 3.3 Login con Google (OAuth)

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-18 | Botón Google inicia flujo | Click "Continuar con Google" | Redirección a la página de consentimiento de Google |
| F-19 | Estado de carga del botón Google | Click en el botón | Botón muestra spinner + "Redirigiendo…"; botón deshabilitado |
| F-20 | Callback exitoso redirige a catalog | Completar autenticación Google | Redirección final a `/catalog` |

### 3.4 Recuperación de Contraseña — `/auth/reset`

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-21 | Enviar email de reset con email válido | Ingresar email registrado → Enviar | Alerta verde: "Revisa tu correo para restablecer tu contraseña" |
| F-22 | Enviar email de reset con email inválido | Ingresar `no-es-email` → Enviar | Validación HTML5 impide submit |
| F-23 | Estado de carga | Click "Enviar enlace" | Spinner + "Enviando…" visible |
| F-24 | Volver al login | Click "Volver al inicio de sesión" | Navega a `/login` |

### 3.5 Nueva Contraseña — `/auth/reset/confirm`

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-25 | Contraseñas coincidentes válidas | Ingresar contraseña + confirmación iguales y válidas | Redirección a `/login?message=Contraseña actualizada` |
| F-26 | Contraseñas no coinciden | Contraseña ≠ confirmación → Enviar | Error: "Las contraseñas no coinciden" |
| F-27 | Contraseña demasiado corta | Menos de 8 caracteres → Enviar | Error: "La contraseña debe tener al menos 8 caracteres" |
| F-28 | Estado de carga | Click "Actualizar contraseña" | Spinner + "Actualizando…" visible |

### 3.6 Catálogo — `/catalog`

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-29 | Acceso autenticado | Login exitoso → navegar a `/catalog` | Lista de canciones visible; grid responsivo |
| F-30 | Búsqueda básica | Escribir término en campo de búsqueda | Resultados filtrados; contador actualizado |
| F-31 | Búsqueda con debounce | Escribir rápidamente varias letras | Sólo una petición tras ~250ms de pausa |
| F-32 | Búsqueda sin resultados | Buscar término inexistente | Estado vacío con mensaje + botón para limpiar |
| F-33 | Limpiar búsqueda | Click botón "×" en campo de búsqueda | Campo limpio; todos los resultados visibles |
| F-34 | Cerrar sesión | Click "Cerrar sesión" en menú avatar | Redirección a `/login` |
| F-35 | Dark mode toggle | Click botón tema en header | Tema alterna entre claro y oscuro; persiste al recargar |

### 3.7 Página Rate Limited — `/rate-limited`

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| F-36 | Acceso directo a `/rate-limited` | Navegar a `/rate-limited` | Página de error branded visible con countdown |

---

## 4. Pruebas de Seguridad

> Referencia cruzada con hallazgos del `IMPROVEMENT_PLAN.md`

### 4.1 Rate Limiting (C-01, A-03)

| ID | Caso de prueba | Comando / Pasos | Resultado esperado |
|----|---------------|-----------------|-------------------|
| S-01 | 6 requests del mismo IP son bloqueadas | `for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}\n" -H "X-Forwarded-For: 10.0.0.1" http://localhost:3000/login; done` | Los primeros 5 retornan 200/307; el 6to retorna 429 o redirige a `/rate-limited` |
| S-02 | IPs distintas no comparten contador | Tras bloquear `10.0.0.1`, enviar desde `10.0.0.2` | `10.0.0.2` recibe 200/307 (no bloqueada) |
| S-03 | Header `Retry-After` presente en 429 | Provocar 429 | Respuesta incluye header `Retry-After` con valor numérico |
| S-04 | Rate limit no usa `request.ip` nativa | Revisar `middleware.ts` / `proxy.ts` | Código no usa `request.ip`; usa `x-forwarded-for` o `x-real-ip` |

### 4.2 CSP y XSS (C-03)

| ID | Caso de prueba | Comando / Pasos | Resultado esperado |
|----|---------------|-----------------|-------------------|
| S-05 | CSP no contiene `unsafe-inline` en producción | `curl -s -I http://localhost:3000/login \| grep Content-Security-Policy` | Header CSP visible; en `NODE_ENV=production` NO contiene `unsafe-inline` |
| S-06 | CSP no contiene `unsafe-eval` en producción | Mismo comando | Header no contiene `unsafe-eval` (solo en dev es aceptable) |
| S-07 | Nonce presente en scripts inline | Ver código fuente de `/login` | Tag `<script>` tiene atributo `nonce` coincidiendo con CSP |
| S-08 | Parámetros URL escapados | Navegar a `/login?error=<script>alert(1)</script>` | Texto renderizado como literal; sin ejecución de script; React escapa el contenido |

### 4.3 OAuth Callback (C-04)

| ID | Caso de prueba | Comando / Pasos | Resultado esperado |
|----|---------------|-----------------|-------------------|
| S-09 | Callback sin `code` redirige a login | `curl -s -o /dev/null -w "%{redirect_url}" "http://localhost:3000/auth/callback"` | Redirige a `/login?error=...` |
| S-10 | `next` con URL externa es ignorado | `curl -s -o /dev/null -w "%{redirect_url}" "http://localhost:3000/auth/callback?code=FAKE&next=https://evil.com"` | Redirige a `/catalog` (no a evil.com) |
| S-11 | `next` con path no permitido rechazado | Usar `next=/admin` o `next=//../etc/passwd` | Redirige a `/catalog` |
| S-12 | `code` inválido muestra error | `curl` con code falso | Redirige a `/login?error=...` con mensaje genérico |

### 4.4 Filter Injection en Catálogo (A-05)

| ID | Caso de prueba | Comando / Pasos | Resultado esperado |
|----|---------------|-----------------|-------------------|
| S-13 | Query con operadores PostgREST | Buscar `test,id.eq.1` en catálogo | Resultados de búsqueda normales; sin error de DB ni rows no esperadas |
| S-14 | Query con paréntesis | Buscar `%)) or 1=1--` | Sanitizado; búsqueda normal o resultados vacíos |
| S-15 | Query con comillas | Buscar `' OR '1'='1` | Sanitizado; sin error de DB |
| S-16 | Query extremadamente largo | String de 200+ caracteres | Truncado a ≤100 caracteres; petición procesada normalmente |

**Comando de prueba:**
```bash
# Requiere cookie de sesión activa
SESSION_COOKIE="<cookie-de-sesión>"
curl -s "http://localhost:3000/catalog?q=test%2Cid.eq.1" \
  -H "Cookie: $SESSION_COOKIE" | grep -c "<article"
# Debe retornar el mismo número que una búsqueda sin inyección
```

### 4.5 Enumeración de Usuarios (A-02)

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| S-17 | Email registrado vs no registrado | Intentar login con email válido + contraseña incorrecta vs email inválido + contraseña cualquiera | **Mismo mensaje de error** en ambos casos: "Credenciales incorrectas. Verifica tu email y contraseña." |
| S-18 | Signup con email ya registrado | Registrar email ya existente | Mensaje genérico sin confirmar si el email está en uso |

### 4.6 Protección de Rutas (A-04, C-04)

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| S-19 | `/catalog` sin sesión redirige | Navegar a `http://localhost:3000/catalog` sin estar autenticado | Redirección a `/login` |
| S-20 | `/catalog` con cookie expirada | Modificar cookie de sesión manualmente → navegar a `/catalog` | Redirección a `/login` |
| S-21 | Verificación en Server Component | Revisar `app/catalog/page.tsx` | Llama a `requireAuth()` o hace `supabase.auth.getUser()` con redirect si no hay usuario |

### 4.7 Secretos y Configuración (M-02, M-03)

| ID | Caso de prueba | Comando | Resultado esperado |
|----|---------------|---------|-------------------|
| S-22 | `.env` no trackeado por git | `git ls-files .env .env.local` | Sin output (archivos no trackeados) |
| S-23 | `.env` en historial de git | `git log --all --oneline -- .env .env.local` | Sin commits (o commits solo antes de agregar a .gitignore) |
| S-24 | `NEXT_PUBLIC_SITE_URL` configurada | `grep NEXT_PUBLIC_SITE_URL .env.local` | Variable definida y no vacía |
| S-25 | `.env.example` existe | `ls .env.example` | Archivo existe con todas las variables documentadas sin valores reales |

### 4.8 Política de Contraseñas (M-04)

| ID | Caso de prueba | Pasos | Resultado esperado |
|----|---------------|-------|-------------------|
| S-26 | Contraseña débil rechazada en signup | Usar `123456` | Error explícito de validación |
| S-27 | Contraseña solo letras rechazada | Usar `PasswordSoloLetras` | Error: falta número y carácter especial |
| S-28 | Contraseña válida aceptada | Usar `Password1!` | Signup procesado (si email es nuevo) |

### 4.9 Auditoría de Dependencias (A-06)

| ID | Caso de prueba | Comando | Resultado esperado |
|----|---------------|---------|-------------------|
| S-29 | Sin vulnerabilidades conocidas | `pnpm audit` | 0 vulnerabilidades críticas o altas; documentar cualquier hallazgo |

---

## 5. Pruebas de Accesibilidad (WCAG 2.1 AA)

### 5.1 Estructura y Semántica

| ID | Criterio WCAG | Página | Verificación | Resultado esperado |
|----|--------------|--------|-------------|-------------------|
| A-01 | 1.3.1 Info y relaciones | `/login` | Cada `<input>` tiene `id` único; cada `<label>` tiene `htmlFor` coincidente | Sin inputs sin label; sin labels huérfanas |
| A-02 | 1.3.1 | `/catalog` | Encabezado `<h1>` presente; landmarks `<header>`, `<main>` | Estructura semántica correcta |
| A-03 | 3.1.1 Idioma | Todas | `<html lang="es">` | Atributo presente y correcto |
| A-04 | 2.4.1 Saltar bloques | `/login`, `/catalog` | Skip link `<a href="#main">` al inicio | Skip link visible al recibir foco |

### 5.2 Contraste y Color

| ID | Criterio WCAG | Elemento | Ratio mínimo | Verificación |
|----|--------------|----------|-------------|-------------|
| A-05 | 1.4.3 Contraste | Texto normal | 4.5:1 | `text-foreground` sobre `bg-background`: verificar con DevTools o axe |
| A-06 | 1.4.3 | `text-muted-foreground` | 4.5:1 | Color de ayuda y placeholders |
| A-07 | 1.4.11 No-textual | Borde de inputs | 3:1 | `--border` (#d6d3d1) sobre `--background` |
| A-08 | 1.4.3 | Botón primary | 4.5:1 | Texto blanco sobre violet |

### 5.3 Teclado y Foco

| ID | Criterio WCAG | Caso | Resultado esperado |
|----|--------------|------|-------------------|
| A-09 | 2.1.1 Teclado | Navegar todo `/login` con Tab/Shift+Tab | Orden lógico; todos los elementos interactivos reciben foco |
| A-10 | 2.4.7 Foco visible | Todos los inputs, botones, links | Ring de foco visible (`focus-visible:ring-2`) al navegar con teclado |
| A-11 | 2.1.1 | Pestaña "Crear cuenta" con teclado | Enter/Space cambia de tab |
| A-12 | 2.1.1 | Toggle de contraseña con teclado | Enter/Space alterna visibilidad |
| A-13 | 2.5.5 Tamaño de objetivo | Botones en mobile (375px) | Altura mínima 44px (`h-11`) |

### 5.4 Alertas y Estado

| ID | Criterio WCAG | Elemento | Resultado esperado |
|----|--------------|----------|-------------------|
| A-14 | 4.1.3 Mensajes de estado | Alerta de error | `role="alert"` + `aria-live="assertive"` presente |
| A-15 | 4.1.3 | Alerta de éxito | `role="alert"` + `aria-live="polite"` presente |
| A-16 | 4.1.3 | Spinner de carga | `aria-disabled="true"` en botón durante carga |
| A-17 | 3.3.1 Identificación de error | Toggle de contraseña | `aria-pressed` refleja estado actual |

### 5.5 Dark Mode

| ID | Caso | Resultado esperado |
|----|------|-------------------|
| A-18 | Contrastes en dark mode | Verificar ratios en tema oscuro con axe | Sin violaciones de contraste |
| A-19 | Persistencia de preferencia | Cambiar a dark → recargar | Tema oscuro persiste sin FOUC (flash) |
| A-20 | Respeta `prefers-color-scheme` | Primer visit sin `localStorage.theme` | Usa preferencia del sistema |

**Herramientas de verificación:**
```bash
# axe DevTools (extensión de Chrome/Firefox) — 0 violaciones críticas
# Lighthouse Accessibility — meta: ≥95

# Verificación de contraste manual:
# Chrome DevTools → Elements → CSS Overview → Colors
```

---

## 6. Pruebas de Build y Regresión

| ID | Verificación | Comando | Resultado esperado |
|----|-------------|---------|-------------------|
| B-01 | Build limpio | `pnpm build` | Sin errores TypeScript ni warnings de Next.js |
| B-02 | Lint limpio | `pnpm lint` | 0 errores, 0 warnings |
| B-03 | Sin middleware deprecado | `ls middleware.ts 2>&1` | "No such file" si fue renombrado a `proxy.ts` |
| B-04 | Tipos TypeScript | `pnpm tsc --noEmit` | 0 errores de tipos |
| B-05 | Variables de entorno | Ver Sección 4.7 S-24 | Todas las variables requeridas definidas |

---

## 7. Casos de Regresión Críticos

> Estos casos aseguran que las correcciones previas no regresen.

| ID | Regresión a prevenir | Verificación |
|----|---------------------|-------------|
| R-01 | Tab de signup se pierde en error | Enviar signup con error → confirmar URL contiene `tab=signup` y tab activa es "Crear cuenta" |
| R-02 | Mensaje de Supabase expuesto directamente | Login incorrecto → alerta dice mensaje genérico, NO mensajes como "Invalid login credentials" |
| R-03 | SQLi en búsqueda del catálogo | Buscar `%)) or 1=1` → resultado normal, no error 500 ni rows extras |
| R-04 | Botones sin estado de carga | Submit en cualquier form → spinner aparece; botón se deshabilita |
| R-05 | Dark mode con FOUC | Recargar en dark mode → página carga oscura desde el primer paint |
| R-06 | Login sin `lang="es"` | Ver source de cualquier página → `<html lang="es">` presente |

---

## 8. Matriz de Riesgo — Hallazgos vs Cobertura de Pruebas

| Hallazgo IMPROVEMENT_PLAN | Severidad | Prueba(s) cubren |
|--------------------------|-----------|-----------------|
| C-01: `request.ip` eliminado | CRÍTICO | S-01, S-02, S-03 |
| C-02: `middleware.ts` deprecado | CRÍTICO | B-03 |
| C-03: CSP con `unsafe-inline` | CRÍTICO | S-05, S-06, S-07 |
| C-04: OAuth callback sin `state` | CRÍTICO | S-09, S-10, S-11, S-12 |
| A-01: Sin validación Zod | ALTO | F-09 a F-13, S-26 a S-28 |
| A-02: Enumeración de usuarios | ALTO | S-17, S-18 |
| A-03: Rate-limit en memoria | ALTO | S-01, S-02, S-04 |
| A-04: `/catalog` sin re-verificación | ALTO | S-19, S-20, S-21 |
| A-05: Filter injection | ALTO | S-13, S-14, S-15, S-16, R-03 |
| M-01: Params en URL sin protección | MEDIO | S-08 |
| M-02: `NEXT_PUBLIC_SITE_URL` faltante | MEDIO | S-24, S-25 |
| M-03: `PASSWORD_DB` en `.env` | MEDIO | S-22, S-23 |
| M-04: Sin política de contraseñas | MEDIO | F-10 a F-13, S-26 a S-28 |
| M-05: Sin MFA | MEDIO | Fuera de alcance v1 |
| M-06: Sin migraciones SQL | MEDIO | Fuera de alcance v1 |
| B-01: SECURITY_REPORT desactualizado | BAJO | Manual |
| B-02: Sin auditoría/logging | BAJO | Revisar `auditLog` en actions.ts |
| B-03: Sin tests automatizados | BAJO | Este documento |

---

## 9. Tests Automatizados — Roadmap

Una vez instalado Vitest:

```bash
pnpm add -D vitest @vitejs/plugin-react msw
```

### Archivos de test sugeridos

```
__tests__/
  unit/
    auth-schemas.test.ts       → parseLogin, parseSignup — inputs válidos e inválidos
    rate-limiter.test.ts       → InMemoryRateLimiter — bloquea en intento 6+
    sanitize-query.test.ts     → regex de sanitización en catalog
  integration/
    auth-callback.test.ts      → GET /auth/callback — sin code, next externo
    auth-guard.test.ts         → /catalog sin sesión → redirige a /login
  e2e/
    login-flow.test.ts         → flujo completo login + logout
    signup-flow.test.ts        → flujo completo signup con requisitos
    catalog-search.test.ts     → búsqueda + filtro + injection
```

### Ejemplo — `auth-schemas.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseLogin, parseSignup } from '@/app/lib/auth-schemas'

describe('parseSignup', () => {
  it('acepta contraseña válida', () => {
    const result = parseSignup({ email: 'test@test.com', password: 'Password1!' })
    expect(result.success).toBe(true)
  })

  it('rechaza contraseña sin mayúscula', () => {
    const result = parseSignup({ email: 'test@test.com', password: 'password1!' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/mayúscula/)
  })

  it('rechaza contraseña sin número', () => {
    const result = parseSignup({ email: 'test@test.com', password: 'Password!' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/número/)
  })

  it('rechaza contraseña sin carácter especial', () => {
    const result = parseSignup({ email: 'test@test.com', password: 'Password1' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/especial/)
  })

  it('rechaza email inválido', () => {
    const result = parseSignup({ email: 'no-es-email', password: 'Password1!' })
    expect(result.success).toBe(false)
  })
})
```

---

## 10. Criterios de Aceptación

### Mínimos para entrega (Prioridad 1)

- [ ] F-01 a F-07: flujo de login completo funcional
- [ ] F-08 a F-17: flujo de signup funcional con validaciones
- [ ] F-29, F-30, F-34: catálogo accesible con búsqueda y signout
- [ ] S-19, S-20: rutas protegidas redirigen correctamente
- [ ] S-13 a S-16: filter injection sanitizado
- [ ] S-17, S-18: mensajes de error genéricos
- [ ] A-01 a A-10: navegación por teclado y labels correctas
- [ ] B-01, B-02: build y lint limpios

### Objetivos de calidad (Prioridad 2)

- [ ] S-01 a S-04: rate limiting funcional por IP
- [ ] S-05 a S-07: CSP sin `unsafe-inline` en producción
- [ ] S-09 a S-12: OAuth callback seguro
- [ ] A-14 a A-17: alertas con ARIA correctas
- [ ] Lighthouse Accessibility ≥ 95 en todas las páginas
- [ ] `pnpm audit` sin vulnerabilidades críticas

---

*Este plan debe revisarse y actualizarse en cada sprint. Los hallazgos resueltos se marcan con ✅; los nuevos se agregan con su severidad correspondiente.*
