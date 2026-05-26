# Reporte de Modelado de Amenazas y Seguridad (SecOps)

> **Nota de actualización (2026-05-25):** Este reporte fue originalmente redactado para Next.js 14. El stack real es **Next.js 16.2.6**, React 19, @supabase/ssr 0.10.3. Las contramedidas han sido actualizadas acorde. Ver `docs/security/IMPROVEMENT_PLAN.md` para la auditoría completa con 18 hallazgos.

Este documento detalla la arquitectura de seguridad, el análisis de riesgos y las contramedidas implementadas para proteger la aplicación "Secure Music Cloud".

## 1. Perfil del Sistema
- **Stack:** Next.js 16.2.6 (App Router), Supabase (PostgreSQL + Auth), React 19, TypeScript.
- **Activos a Proteger:** Credenciales de usuario, Perfiles de usuario, Integridad del Catálogo de Música, Disponibilidad del Servicio.

---

## 2. Árbol de Ataques (Attack Tree)

El objetivo del atacante es **Comprometer los datos de los usuarios o la integridad del catálogo**.

```text
Comprometer Secure Music Cloud
├── [OR] Acceso no autorizado a datos de terceros (IDOR)
│   └── Intentar cambiar UUID en peticiones API -> Bloqueado por RLS (auth.uid() = id)
├── [OR] Inyección de código malicioso
│   ├── Inyección SQL (SQLi) en buscador -> Bloqueado por Supabase SDK (Parametrización)
│   └── Inyección de Script (XSS) en catálogo -> Bloqueado por React Auto-escaping y CSP Headers
├── [OR] Robo de sesiones / Credenciales
│   ├── Ataque de Fuerza Bruta en Login -> Bloqueado por Middleware Rate Limiting (5 req/min)
│   └── Secuestro de Cookies (Session Hijacking) -> Bloqueado por Cookies HttpOnly y SameSite=Strict
└── [OR] Denegación de Servicio (DoS)
    ├── Inundación de peticiones (Flood) -> Mitigación parcial por Rate Limiting
    └── Payloads gigantes -> Bloqueado por Next.js Body Size Limits (default)
```

---

## 3. Matriz de Mitigación (OWASP Top 10)

| Riesgo OWASP | Contramedida Implementada | Ubicación Técnica |
| :--- | :--- | :--- |
| **A01:2021-Broken Access Control** | Row Level Security (RLS) estricto. | Supabase (PostgreSQL Policies) |
| **A03:2021-Injection (SQLi)** | Consultas parametrizadas vía SDK. | `app/catalog/page.tsx` |
| **A03:2021-Injection (XSS)** | CSP con nonces por-request (`strict-dynamic`) y React Auto-escape. | `proxy.ts` / Next.js Core |
| **A04:2021-Insecure Design** | Arquitectura SSR con cookies HttpOnly. Validación de inputs con schemas. | `utils/supabase/server.ts`, `app/lib/auth-schemas.ts` |
| **A07:2021-Identification & Auth Failures** | Rate Limiting por IP real (`x-forwarded-for`), Google OAuth 2.0, validación de políticas de contraseñas. | `proxy.ts` / Supabase Auth |

---

## 4. Justificación Técnica de Defensas

### 🛡️ Row Level Security (RLS)
A diferencia de las aplicaciones tradicionales donde el servidor controla el acceso, aquí la base de datos es la que impone las reglas. Aunque un atacante obtenga la `anon_key`, el motor de PostgreSQL rechazará cualquier consulta que no cumpla con `auth.uid() = id`, garantizando que el usuario A jamás vea los datos del usuario B.

### 🛡️ Middleware Rate Limiting
Implementamos un sistema de ventana de tiempo (1 minuto) para frenar ataques automatizados. Al responder con un estado `429`, protegemos no solo la base de datos de sobrecarga, sino que hacemos inviable el ataque de fuerza bruta por el tiempo requerido para probar miles de combinaciones.

### 🛡️ Content Security Policy (CSP)
La política usa `nonce` por-request con `strict-dynamic` en `script-src`, eliminando `unsafe-inline` y `unsafe-eval` en producción. Cada render genera un nonce criptográfico aleatorio (`Buffer.from(crypto.randomUUID()).toString('base64')`) que se propaga del `proxy.ts` al `RootLayout`. Solo los scripts con el nonce correcto se ejecutan, neutralizando XSS incluso si un atacante logra inyectar contenido.

---

## 5. Próximos Pasos (Fase 6)
Este modelo será puesto a prueba mediante simulaciones reales de inyección, bypass de autenticación y saturación de peticiones para validar que las contramedidas funcionan según lo diseñado.
