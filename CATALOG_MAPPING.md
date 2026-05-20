# Documentación del Catálogo: Base de Datos vs data.json

Este documento detalla la estructura del catálogo de música implementado en la aplicación y cómo se corresponde con el archivo fuente `data.json`.

## 1. Mapeo de Campos

| Campo JSON (`data.json`) | Columna DB (`music_catalog`) | Tipo de Dato | Descripción |
| :--- | :--- | :--- | :--- |
| `title` | `title` | `TEXT` | Título de la canción. |
| `artist` | `artist` | `TEXT` | Nombre del artista o banda. |
| `album` | `album` | `TEXT` | Álbum al que pertenece. |
| `year` | `year` | `INTEGER` | Año de lanzamiento. |
| `genre` | `genre` | `TEXT` | Género musical. |
| (N/A) | `id` | `UUID` | Identificador único (Generado por Supabase). |
| (N/A) | `created_at` | `TIMESTAMP` | Fecha de creación del registro. |

## 2. Proceso de Sincronización

La carga de datos se realiza a través del script `scripts/ingest.ts`. Este script lee el archivo `data.json` en la raíz del proyecto y realiza una inserción masiva (bulk insert) en la tabla `music_catalog` de Supabase.

### Comando de ejecución:
```bash
npx ts-node -O '{"module":"commonjs"}' scripts/ingest.ts
```

## 3. Consideraciones de Seguridad (SecOps)

- **Sanitización de Ingesta:** El script de ingesta utiliza el SDK oficial de Supabase, lo que garantiza que los datos se traten como valores literales y no como código ejecutable durante la inserción.
- **Validación de Tipos:** El campo `year` se fuerza a un entero (`INTEGER`) en la base de datos para evitar que se inyecten strings maliciosos donde se espera un número.
- **Búsqueda Segura:** En `app/catalog/page.tsx`, las búsquedas sobre estos campos se realizan mediante filtros parametrizados (`.ilike`), neutralizando cualquier intento de Inyección SQL (SQLi).
- **Escape de Salida:** React escapa automáticamente el contenido de estos campos al renderizarlos en el navegador, mitigando ataques de Cross-Site Scripting (XSS) persistente en caso de que el `data.json` contuviera etiquetas HTML o scripts.

## 4. Auditoría de Datos
El archivo `data.json` contiene +100 registros que sirven como base para las pruebas de penetración en la Fase 6, permitiendo verificar la eficiencia de los índices y la robustez de los filtros ante grandes volúmenes de datos.
