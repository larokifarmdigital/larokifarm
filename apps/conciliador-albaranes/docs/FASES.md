# Fases de implementación — Conciliador multi-tenant

> Roadmap de construcción. Complementa `multi-tenant.md` (infraestructura) y los docs de
> contexto del repo. **El VPS no hace falta hasta la Fase 6.** Todo el resto se desarrolla
> en local con Postgres en Docker y storage local.

---

## Decisión arquitectónica que desbloquea las Fases 1-5: storage abstraído

Antes de empezar, una pieza clave: **interfaz `Storage` con drivers intercambiables**.

```ts
// src/shared/lib/storage.ts
interface Storage {
  upload(key: string, data: Buffer, contentType: string): Promise<void>
  getDownloadUrl(key: string, expiresInSec: number): Promise<string>
  delete(key: string): Promise<void>
}

// STORAGE_DRIVER=local  → guarda en ./storage/ y sirve por /api/files/[...key] con auth
// STORAGE_DRIVER=spaces → AWS SDK contra DigitalOcean Spaces
```

Esto significa que **toda la app (Fases 1-5) se desarrolla y prueba 100% en local** sin
tocar AWS SDK ni DO. El día que el cliente compre el VPS, se cambia
`STORAGE_DRIVER=local` por `STORAGE_DRIVER=spaces` y se aporta el SDK.

Lo mismo aplica a Postgres: en local va Docker, en producción va Managed. Misma variable
`DATABASE_URL`, distinto valor.

---

## Fase 1 — Fundación: Auth + BD + Login

**Duración estimada:** 2-3 días.
**Dependencia de VPS:** 0%.

**Objetivo:** poder loguearse y ver una página vacía protegida.

**Entregables:**

- `docker-compose.dev.yml` con Postgres 16 alpine en puerto 5432.
- Prisma instalado + schema con `User` + `Business` + enum `Role` + primera migración aplicada.
- Auth.js v5 con Credentials provider + `bcryptjs`.
- `src/middleware.ts` que redirige a `/login` si no hay sesión (excepto `/login` y `/api/auth/*`).
- Página `/login` funcional (server action que llama a `signIn`).
- Script `scripts/seed.ts` que crea un SUPER_ADMIN ("erick@laroki.com") y 1 negocio de prueba ("larokifarm").
- `.env.example` con `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`.

**Demo al cliente:** "Ya hay login. Esto reemplaza el PIN compartido."

---

## Fase 2 — Persistencia de comparaciones

**Duración estimada:** 3-4 días.
**Dependencia de VPS:** 0% (driver `local` de storage).

**Objetivo:** cada comparación queda guardada en BD + archivos en disco local.

**Entregables:**

- Schema Prisma completo (`Comparison` + `ComparisonFile` + enums `ComparisonStatus`, `FileKind`).
- Helper `storage.ts` con driver `local` funcional: guarda en `./storage/<businessSlug>/<YYYY-MM>/<comparisonId>/<kind>/<filename>` y sirve por `/api/files/[...key]` con check de sesión + scoping de negocio.
- `extraerAlbaran.ts` ampliado: devuelve `usageMetadata` (input/output tokens) junto con `AlbaranData`.
- `/api/conciliar` refactorizado: lee sesión → resuelve negocio → resuelve key Gemini (BYOK fallback a global) → procesa → guarda en transacción Prisma → sube archivos vía `storage` → devuelve respuesta.
- `crypto.ts` con `encrypt`/`decrypt` AES-GCM (para BYOK).
- Sin cambios visibles en la UI todavía — el cliente sube y descarga como antes.

**Demo al cliente:** "Mira la BD: cada comparación queda con su autor, fecha, tokens consumidos y los archivos quedan archivados."

---

## Fase 3 — Historial visible

**Duración estimada:** 2-3 días.
**Dependencia de VPS:** 0%.

**Objetivo:** el usuario ve sus comparaciones pasadas y re-descarga informes.

**Entregables:**

- `/historial` con tabla paginada, filtros por fecha/proveedor/estado/usuario.
- `/historial/[id]` con detalle: pares procesados, discrepancias, archivos asociados.
- `/api/historial/[id]/descargar?file=...` que genera URL temporal:
  - Driver `local`: URL firmada con JWT corto (expira 5 min).
  - Driver `spaces`: presigned URL S3.
- Botón "re-descargar informe" en cada fila.

**Demo al cliente:** "Puedo ver las comparaciones de la semana pasada y volver a bajar el informe."

---

## Fase 4 — Panel de administración

**Duración estimada:** 3-4 días.
**Dependencia de VPS:** 0%.

**Objetivo:** gestionar usuarios y negocios desde la UI.

**Entregables:**

- Sidebar con selector de negocio (visible solo para SUPER_ADMIN).
- `/admin/usuarios` (CRUD):
  - BUSINESS_ADMIN solo ve los de su farmacia.
  - SUPER_ADMIN los ve todos.
- `/admin/negocios` (CRUD, solo SUPER_ADMIN): crear nuevas farmacias.
- Formulario "Configurar API key Gemini" por negocio: input password, se cifra con `ENCRYPTION_KEY` antes de guardar (`geminiKeyEnc`).
- Helper `withBusinessScope(session)` que aplica filtro automático en queries Prisma (excepto SUPER_ADMIN).

**Demo al cliente:** "Crea tú mismo a tus empleados. Si quieres usar tu propia cuenta de Gemini, configúrala aquí."

---

## Fase 5 — Dashboard de uso

**Duración estimada:** 1-2 días.
**Dependencia de VPS:** 0%.

**Objetivo:** ver consumo agregado por usuario/negocio/mes.

**Entregables:**

- `/admin/uso` con KPIs del mes (comparaciones, PDFs, tokens input/output, coste USD).
- Gráfico de evolución mensual (Recharts).
- Desglose:
  - BUSINESS_ADMIN: por usuario de su farmacia.
  - SUPER_ADMIN: por negocio.
- Tabla "Top usuarios este mes".
- Coste calculado con precios actuales de `gemini-2.5-flash` (configurable en código).

**Demo al cliente:** "Ya puedes ver cuánto está usando cada empleado y cuánto te está costando al mes."

---

## 🟢 Punto de corte: app completa funcionando en local

A estas alturas (~2-3 semanas de trabajo neto) la app está 100% terminada y usable. Se
puede hacer demos al cliente con un túnel (ngrok / Cloudflare Tunnel) desde la máquina
del desarrollador. **Esperar a que el cliente compre el VPS no bloquea nada.**

---

## Fase 6 — Cloud config + Deploy

**Duración estimada:** 1 día.
**Dependencia de VPS:** 100%. Solo se puede hacer cuando el cliente compre.

**Pre-requisito:** droplet + Managed Postgres + Spaces creados según `multi-tenant.md §6`.

**Entregables:**

- `Dockerfile` multi-stage (`pnpm install` → `prisma generate` → `next build` → runtime `node:22-alpine`).
- `docker-compose.yml` de producción (sin postgres, con caddy).
- `Caddyfile`.
- Implementar driver `spaces` de `storage.ts` (con `@aws-sdk/client-s3` + presigned URLs).
- `.env` en el droplet con las URLs del Managed (pooler + directo) y credenciales de Spaces.
- DNS apuntando al droplet.
- `docker compose up -d --build` y primer login en producción.

**Demo al cliente:** "Tu app vive en `conciliador.tu-dominio.com`. Aquí están las credenciales."

---

## Fase 7 — Backups + observabilidad

**Duración estimada:** medio día, después del deploy.

**Objetivo:** dormir tranquilo.

**Entregables:**

- Script `scripts/backup-db.sh` con `pg_dump → gpg → s3cmd put` a Spaces.
- Mismo script sube también con `restic` a Backblaze B2.
- Cron del host: domingos 3:00 AM.
- Endpoint `/api/health` + healthcheck en `docker-compose.yml`.
- Documentar runbook (qué hacer si la app cae, cómo restaurar un backup).

---

## Resumen visual

```
┌─────────────────────────────────────────────────────────┐
│ AHORA (sin VPS, 100% local)                             │
│ ─────────────────────────────────────                   │
│ Fase 1 — Auth + BD             ~3 días                  │
│ Fase 2 — Persistencia          ~4 días                  │
│ Fase 3 — Historial             ~3 días                  │
│ Fase 4 — Admin                 ~4 días                  │
│ Fase 5 — Dashboard             ~2 días                  │
│                                ───────                  │
│                            ~2-3 semanas                 │
└─────────────────────────────────────────────────────────┘
              │
              │  ⏸  Punto de espera (cliente compra VPS)
              ▼
┌─────────────────────────────────────────────────────────┐
│ CUANDO LLEGUE EL VPS                                    │
│ ─────────────────────────                               │
│ Fase 6 — Deploy                ~1 día                   │
│ Fase 7 — Backups + obs.        ~0.5 día                 │
│                                ───────                  │
│                            ~1.5 días                    │
└─────────────────────────────────────────────────────────┘
```

---

## Orden recomendado dentro de cada fase
p
1. **Empezar por Fase 1** sin atajos — la base auth/BD es lo que más se reutiliza.
2. **Fase 2 en cuanto Fase 1 cierre** — es el corazón del valor (sin esto no hay "historial").
3. **Después Fase 3** — primer cambio que el cliente percibe ("antes no podía volver a bajar informes, ahora sí").
4. **Fase 4 y 5** pueden ir en cualquier orden, pero Fase 4 desbloquea darle acceso a más
   usuarios reales (puedes empezar a usar la app en serio con larokifarm aunque Fase 5
   no esté terminada).
5. **Fase 6 cuando llegue el VPS** — preparada de antemano, será un día de trabajo, no una semana.
