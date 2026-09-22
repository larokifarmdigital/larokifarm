# Plan · Backoffice unificado larokifarm

> Doc de hand-off. Léelo antes de empezar a mover nada.

## En una frase

Consolidar todo el ecosistema **larokifarm** en un backoffice web (Next.js 16) que **comparte la misma base de datos y sistema de autenticación** con el conciliador de albaranes ya en producción. El backoffice añade la gestión de contenido de las landings (hoy en Sanity), pilotará Scout como módulo interno y, cuando toque, absorberá el conciliador como módulo también. Un solo login para todo el ecosistema.

Sin apagar nada hasta que la nueva pieza equivalente esté funcionando.

## Decisiones tomadas (2026-09-18)

| Decisión | Elegido | Razón |
| --- | --- | --- |
| Estructura | **Todo en el monorepo existente** | Ya funciona el pnpm workspace, comparte tipos y CI |
| Backend | **Servicio HTTP separado** (`apps/api/` con Hono) | Consumible desde backoffice, landings, widget y futuros clientes externos. Escala independiente del backoffice |
| Frontend admin | **`apps/backoffice/` (Next.js 16 solo UI)** | Consume `apps/api/` vía `packages/api-client`. Renderiza pantallas, no lógica de dominio |
| Hosting backoffice + api | **Vercel Hobby** (2 proyectos separados) | $0 · sin problema LaLiga (Cloudflare descartado). Fallback: Vercel Pro $20/mes o Netlify Free |
| Hosting conciliador | **Sigue en Cloudflare Workers** (no se toca) | Producción estable. Comparte DB con el resto vía DATABASE_URL |
| Dominios | `larokifarm.com` → backoffice · `api.larokifarm.com` → backend · `conciliador.larokifarm.com` → conciliador | Cookie `.larokifarm.com` para auth cross-subdomain |
| **Base de datos** | **Neon Postgres compartida** — la misma que ya usa el conciliador en producción | Un solo `User`, un solo `Business`, cero duplicación. Login único para backoffice + conciliador |
| **Auth** | **next-auth v5** (adoptado del conciliador) | El conciliador ya la usa en producción, evitamos convivencia de dos sistemas de auth. Adapter Prisma nativo, cookie compartida en subdominios |
| ORM | **Prisma** (versión del conciliador: 6.19) | Ya en uso. Un solo `schema.prisma` compartido en `packages/db/` |
| Schema | **Extender el schema actual del conciliador** — sin renombrar `Business` | Añadir campos de farmacia (`ciudad`, `descripcionCorta`, etc.) a `Business`. Añadir tablas nuevas `Servicio`, `Faq`, `Resena`, `ContentImage`. Sin migración destructiva |
| Roles | **Reutilizar los existentes** del conciliador | `SUPER_ADMIN` = admin global · `BUSINESS_ADMIN` = manager de una farmacia · `USER` = viewer. Cero migración de enum |
| Storage imágenes | **Cloudflare R2** (S3-compatible) | Barato, sin egress fee. El conciliador ya usa `@aws-sdk/client-s3`, misma librería |
| Editor rich text | **Tiptap** | Extensible, TypeScript, migra bien de Sanity Portable Text |
| Validación | **Zod** | Server + client, base para generar OpenAPI |
| Docs API | **`@hono/zod-openapi` + Scalar UI** desde Fase 2 | Cada ruta del api queda documentada sobre la marcha |
| SDK cliente | **`packages/api-client` autogenerado** desde el OpenAPI del api | Backoffice, landings y widget consumen el mismo tipado |
| Emails | Resend (opcional Fase 9) | 3k emails/mes free |

## Coste operativo total

| Servicio | Coste mensual | Notas |
| --- | --- | --- |
| **Vercel Hobby** (backoffice + api + landings) | **$0** | 3-4 proyectos separados, todos en Hobby. Fallback: Netlify Free o Vercel Pro $20 |
| **Cloudflare Workers** (conciliador + scout-batch + cima-inventory-sync) | **$0** | 100k req/día free. LaLiga no afecta al conciliador porque los usuarios ya llegan por su propio dominio, y a los otros dos porque no son user-facing |
| **Neon Free tier** (compartida) | **$0** | Ya la pagas si el conciliador está ahí. 500 MB, 191h compute/mes |
| **Cloudflare R2** | **$0** | Hasta 10 GB gratis, sin egress fee |
| **next-auth v5** | **$0** | Self-hosted |
| **Total mensual incremental** | **$0** | El backoffice no añade coste real al stack existente |

Cuando crezca la DB o tráfico → upgrade selectivo (Neon Pro $19, Vercel Pro $20). Nunca fijo desde el día 1.

## Alerta: contexto Vercel Hobby y LaLiga

**Vercel Hobby**:
- ToS dice "no commercial use", área gris para landings de farmacia.
- Miles de PYMES lo usan sin problema. Vercel no ha demostrado ser agresivo persiguiendo esto.
- Si un día detectan patrón comercial: envían email pidiendo upgrade a Pro con 30 días.
- **Plan B lista**: Netlify Free (100% legal comercial) o Vercel Pro ($20/mes).

**LaLiga blocking en Cloudflare**:
- Fines de semana durante partidos (sáb/dom 14:00-17:00 y noche), Cloudflare Workers/Pages tienen bloqueos por IPs en Movistar/Vodafone/Orange/DIGI.
- **Backoffice, api y landings NUNCA en Cloudflare Pages/Workers** por esto.
- **Conciliador** ya vive en Cloudflare Workers; si LaLiga lo bloquea, se plantea migrar (Fase 8 del plan absorbe el conciliador de todos modos).

## Arquitectura final

```
    ┌──────────────────────────────────────┐
    │  BACKOFFICE (Next.js 16 · solo UI)   │
    │  https://larokifarm.com              │       ┌─────────────────────────────┐
    │  · Login (next-auth cookie .lar…)    │       │  CONCILIADOR (Next.js 15)   │
    │  · Gestión farmacias                 │       │  https://conciliador.       │
    │  · Scout (precios)                   │       │           larokifarm.com    │
    │  · Albaranes (ver histórico)         │       │  · Producción actual        │
    │  · Inventario                        │       │  · Cloudflare Workers       │
    │  Vercel Hobby · proyecto 1           │       └────────────┬────────────────┘
    └──────────────┬───────────────────────┘                    │
                   │ fetch con cookie                            │ Prisma directo
                   │ (packages/api-client)                       │ (misma DB)
                   ▼                                             │
    ┌────────────────────────────────────────────┐               │
    │  API (Hono · backend HTTP puro)            │               │
    │  https://api.larokifarm.com                │               │
    │  · /admin/*     → next-auth session         │              │
    │  · /publico/*   → sin auth, CORS abierto   │               │
    │  · /auth/*      → next-auth handler         │              │
    │  · /docs        → Scalar UI                │               │
    │  Vercel Hobby · proyecto 2                 │               │
    └──────────────┬─────────────────────────────┘               │
                   │ Prisma                                       │
                   ▼                                              │
                ┌────────────────────────────────────────┐        │
                │  Neon (PostgreSQL) — COMPARTIDA        │◄───────┘
                │  Un solo User, un solo Business,       │
                │  tablas conciliador + tablas backoffice│
                └──────────▲────────────▲────────────────┘
                           │            │
                           │            │ (background jobs)
                           │            │
    ┌──────────────────────┴──┐  ┌──────┴──────────────────────┐
    │  Landings Astro         │  │  Cloudflare Workers          │
    │  · torrents · chamarro  │  │  · scout-batch               │
    │  Vercel Hobby           │  │  · cima-inventory-sync       │
    └──────────┬──────────────┘  └──────────────────────────────┘
               │ fetch api.larokifarm.com/publico/*
               ▼
      packages/api-client (tipado desde OpenAPI)

    ┌────────────────────────┐
    │  Cloudflare R2         │◄──── presigned URLs (upload desde backoffice)
    │  (imágenes de landings)│────► CDN directo (lectura pública)
    └────────────────────────┘
```

**Flujo de auth compartido**:
- next-auth v5 emite cookie con `domain: .larokifarm.com`, `secure`, `httpOnly`, `sameSite: lax`.
- Login en backoffice (`larokifarm.com`) crea cookie válida en todo `.larokifarm.com`.
- Backoffice llama a `api.larokifarm.com/admin/*` con `credentials: 'include'` → api valida la sesión con la misma librería.
- El conciliador (`conciliador.larokifarm.com`) también reconoce la cookie si el user ya está autenticado en el backoffice → SSO real, no doble login.

## Convivencia con el conciliador (importante)

El conciliador **ya está en producción con clientes reales** (Farmacia Chamarro, otros). Estas son las reglas de oro para no romperlo:

1. **El schema del conciliador es la base**. El backoffice **extiende**, no reemplaza. Toda migración se prueba primero en preview/branch antes de aplicarse.
2. **Cero migraciones destructivas** en tablas del conciliador (`Business`, `User`, `Comparison`, `ComparisonFile`, `ComparisonReport`). Solo `ALTER TABLE ADD COLUMN` con `DEFAULT NULL` o campos opcionales.
3. **Coordinar despliegues**: cuando el backoffice aplica una migración, el conciliador debe estar preparado. Como Prisma es idempotente, esto se controla desde CI.
4. **Ampliaciones al `User`**: si se necesitan nuevos campos, se añaden como opcionales. `passwordHash` sigue siendo `bcryptjs` — el backoffice lo respeta.
5. **Ampliaciones al `Business`**: se añaden columnas de farmacia (`ciudad`, `descripcionCorta`, etc.) como opcionales. Un Business que hoy solo tiene `slug` + `name` sigue funcionando.
6. **Migración del schema al package compartido** (Fase 0): se mueve `apps/conciliador-albaranes/prisma/` a `packages/db/prisma/`. El conciliador se actualiza para importar `@larokifarm/db`. Se prueba localmente y en preview antes de deploy.

## Estructura del monorepo final

```
larokifarm/
├── apps/
│   ├── backoffice/                    ← NUEVO · Next.js 16 solo UI
│   │   ├── src/app/
│   │   │   ├── (auth)/login/          ← form de login → api /auth
│   │   │   ├── (dashboard)/
│   │   │   │   ├── farmacias/         ← CRUD, textos, imágenes
│   │   │   │   ├── scout/             ← comparador precios
│   │   │   │   ├── albaranes/         ← visualización del histórico del conciliador
│   │   │   │   ├── inventario/
│   │   │   │   └── ajustes/
│   │   │   └── layout.tsx
│   │   └── package.json               ← depende de @larokifarm/api-client, @larokifarm/ui, @larokifarm/db (para middleware SSR)
│   │
│   ├── api/                           ← NUEVO · Hono backend HTTP puro
│   │   ├── src/
│   │   │   ├── index.ts               ← app.route() todos los módulos
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            ← next-auth handler
│   │   │   │   ├── admin/
│   │   │   │   │   ├── farmacias.ts   ← CRUD protegido
│   │   │   │   │   ├── media.ts       ← presigned URLs a R2
│   │   │   │   │   ├── usuarios.ts
│   │   │   │   │   └── albaranes.ts   ← lee del histórico del conciliador
│   │   │   │   └── publico/
│   │   │   │       ├── farmacia.ts    ← GET /publico/farmacia/:slug
│   │   │   │       ├── inventario.ts  ← GET /publico/inventario
│   │   │   │       └── faqs.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts            ← guard de sesión next-auth
│   │   │   │   ├── cors.ts            ← CORS con allowlist
│   │   │   │   └── rateLimit.ts
│   │   │   └── openapi/
│   │   │       └── generate.ts        ← script que genera spec.json en build
│   │   └── package.json               ← depende de @larokifarm/db, @larokifarm/auth
│   │
│   ├── conciliador-albaranes/         ← EXISTE · producción · migra su schema a @larokifarm/db en Fase 0
│   ├── torrents/                      ← existe · consume @larokifarm/api-client
│   ├── chamarro/                      ← existe · consume @larokifarm/api-client
│   ├── scout/                         ← DEPRECAR al final Fase 6
│   └── inventory-sync/                ← mover a workers/
│
├── packages/                          ← NUEVO nivel · código compartido
│   ├── db/                            ← Prisma schema compartido (movido del conciliador)
│   │   ├── prisma/
│   │   │   ├── schema.prisma          ← Business + User + Comparison* (existentes) + Servicio + Faq + Resena + ContentImage (nuevos)
│   │   │   └── migrations/            ← historial completo desde el conciliador + nuevas
│   │   ├── src/
│   │   │   └── client.ts              ← factory Prisma
│   │   └── package.json
│   │
│   ├── auth/                          ← next-auth v5 config compartida
│   │   ├── src/
│   │   │   ├── server.ts              ← auth() con Prisma adapter + cookie domain .larokifarm.com
│   │   │   └── client.ts              ← React auth client
│   │   └── package.json
│   │
│   ├── api-client/                    ← SDK TypeScript autogenerado desde OpenAPI
│   │   ├── src/
│   │   │   ├── generated/
│   │   │   ├── client.ts              ← wrapper fetch con credentials
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                            ← componentes React compartidos
│   ├── shared/                        ← tipos y utils cross-package
│   └── storage/                       ← wrapper Cloudflare R2 (S3 SDK)
│
├── widgets/
│   └── cima-chat/                     ← existe · consume api.larokifarm.com/publico/inventario
│
├── workers/                           ← NUEVO nivel para Cloudflare Workers
│   ├── inventory-sync/                ← reubicar desde apps/inventory-sync
│   └── scout-batch/                   ← reubicar desde apps/scout/worker
│
├── studio/                            ← DEPRECAR al final (Sanity)
│
├── pnpm-workspace.yaml
├── package.json
└── BACKOFFICE-PLAN.md                 ← este archivo
```

## Schema extendido (delta sobre lo existente del conciliador)

### Ampliaciones a modelos existentes

```prisma
model Business {
  // Campos existentes (no se tocan):
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  geminiKeyEnc     String?
  monthlyBudgetUsd Decimal? @db.Decimal(10, 4)
  supportEmail     String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // ── NUEVOS campos para landing (todos opcionales) ─────
  ciudad             String?
  telefono           String?
  whatsapp           String?
  email              String?
  web                String?
  titular            String?
  numeroColegiado    String?
  descripcionCorta   Json?     // { es, en, ca }
  descripcionLarga   Json?     // Portable Text migrado o HTML de Tiptap
  logoUrl            String?
  heroImages         Json?
  direccion          Json?
  horarios           Json?
  redesSociales      Json?
  googleMapsUrl      String?
  idiomasActivos     Json?
  publishedStatus    String    @default("draft") // draft | published | archived
  seoConfig          Json?
  // ────────────────────────────────────────────────────

  // Relaciones existentes:
  users       User[]
  comparisons Comparison[]

  // ── NUEVAS relaciones para landing ────────────────────
  servicios Servicio[]
  faqs      Faq[]
  resenas   Resena[]
  imagenes  ContentImage[]

  @@map("businesses")
}
```

### Tablas nuevas (100% para el backoffice)

```prisma
model Servicio {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  icono        String?
  nombre       Json     // { es, en, ca }
  descripcion  Json?
  enlace       Json?
  orden        Int      @default(0)

  @@index([businessId, orden])
  @@map("servicios")
}

model Faq {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  pregunta     Json
  respuesta    Json
  orden        Int      @default(0)

  @@index([businessId, orden])
  @@map("faqs")
}

model Resena {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  autor        String
  puntuacion   Int
  texto        String
  fecha        DateTime
  fuente       String   // 'google' | 'manual'
  avatarUrl    String?
  orden        Int      @default(0)

  @@index([businessId, fecha])
  @@map("resenas")
}

model ContentImage {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  role         String   // 'logo' | 'hero' | 'servicio' | 'gallery' | 'og'
  storageKey   String   // clave en R2
  publicUrl    String
  alt          Json     // multi-idioma
  width        Int?
  height       Int?
  sizeBytes    Int?
  createdAt    DateTime @default(now())

  @@index([businessId, role])
  @@map("content_images")
}
```

**Nota**: `heroImages` y `logoUrl` en `Business` son la fuente RÁPIDA para lecturas de la landing. `ContentImage` es el catálogo completo con metadata (para admin: reutilizar imágenes entre secciones, alt text estructurado, versiones).

## next-auth v5 con cookie compartida cross-subdomain

`packages/auth/src/server.ts`:

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@larokifarm/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: '__Secure-larokifarm.session',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        domain: '.larokifarm.com',
        path: '/',
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '').toLowerCase();
        const password = String(creds?.password ?? '');
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.businessId = (user as { businessId?: string }).businessId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { businessId?: string }).businessId = token.businessId as string | undefined;
      }
      return session;
    },
  },
});
```

Con esto:
- Login en backoffice (`larokifarm.com`) crea cookie con `Domain=.larokifarm.com`.
- Backoffice llama a `api.larokifarm.com/admin/*` con `credentials: 'include'` y la cookie viaja.
- El conciliador (`conciliador.larokifarm.com`) reconoce la misma cookie → SSO transparente.

## Fases de migración (~5-7 semanas)

### Fase 0 · Consolidar la base de datos (2-3 días)

- [ ] Snapshot del schema actual del conciliador (`_backups/schema-2026-09-18.prisma`).
- [ ] Crear `packages/db/` moviendo `apps/conciliador-albaranes/prisma/` allí.
- [ ] Actualizar `apps/conciliador-albaranes/` para importar `@larokifarm/db`.
- [ ] Verificar en local que el conciliador sigue funcionando (`pnpm --filter conciliador-albaranes dev`).
- [ ] Deploy del conciliador en preview branch para validar.
- [ ] Crear `packages/auth/` con next-auth v5 apuntando al mismo `User` existente.
- [ ] Crear `packages/storage/` con S3 SDK apuntando a R2.
- [ ] Crear bucket R2 en Cloudflare + API tokens.
- [ ] Añadir `packages/*` al `pnpm-workspace.yaml`.

**Entrega:** el conciliador en preview sigue funcionando idéntico con el schema movido a `packages/db/`.

### Fase 1 · Ampliar schema para landings (1-2 días)

- [ ] Añadir campos opcionales a `Business` (`ciudad`, `descripcionCorta`, etc.).
- [ ] Crear modelos `Servicio`, `Faq`, `Resena`, `ContentImage`.
- [ ] Migración Prisma: `pnpm --filter @larokifarm/db prisma migrate dev --name add_landing_content`.
- [ ] Aplicar en Neon producción con `prisma migrate deploy` (una vez validado en preview).
- [ ] Verificar que el conciliador sigue funcionando (no depende de los nuevos campos).

**Entrega:** schema extendido en producción, conciliador intacto.

### Fase 2 · Api HTTP + OpenAPI + api-client (4-5 días)

- [ ] Crear `apps/api/` con Hono + `@hono/zod-openapi`.
- [ ] Configurar CORS con allowlist.
- [ ] Montar `/auth/**` con next-auth handler (comparte `packages/auth`).
- [ ] Ruta pública `/publico/health` (sin auth).
- [ ] Ruta admin `/admin/ping` (protegida, valida sesión next-auth).
- [ ] `/openapi.json` + `/docs` con Scalar UI.
- [ ] Crear `packages/api-client/` con script de generación desde OpenAPI.
- [ ] Deploy en Vercel Hobby con dominio `api.larokifarm.com`.

**Entrega:** `curl https://api.larokifarm.com/publico/health` responde 200 y `/docs` muestra Scalar con las rutas iniciales.

### Fase 3 · Backoffice base consumiendo api (3-4 días)

- [ ] Crear `apps/backoffice/` con Next.js 16 (solo UI). *(Ya existe la base con mocks; se conecta al api real aquí.)*
- [ ] Login con next-auth server-side (calls internas a `packages/auth`).
- [ ] Middleware que valida sesión via `auth()`.
- [ ] Deploy en Vercel Hobby con dominio `larokifarm.com`.
- [ ] Verificar SSO: hacer login en backoffice → cookie válida al abrir conciliador.

**Entrega:** login funciona, cookie compartida entre backoffice y conciliador.

### Fase 4 · Módulo Farmacias completo (6-8 días)

- [ ] Api: `/admin/businesses/:id` CRUD completo con Zod + OpenAPI (mapea a modelo `Business`).
- [ ] Api: `/admin/media/presign` para subir imágenes a R2 via presigned URL.
- [ ] Api: `/publico/farmacia/:slug` con cache CDN (Cache-Control: s-maxage=3600).
- [ ] Regenerar `packages/api-client`.
- [ ] Backoffice: reemplazar el mock `contentRepository` por llamadas reales al api-client.
- [ ] Editor Tiptap para descripción larga multi-idioma.
- [ ] Upload de imágenes directo del navegador a R2 usando presigned URLs.
- [ ] Roles: `SUPER_ADMIN` ve todas, `BUSINESS_ADMIN` solo el suyo.

**Entrega:** admin crea/edita farmacias desde el backoffice; `curl https://api.larokifarm.com/publico/farmacia/torrents` devuelve JSON; Scalar UI muestra 8+ rutas.

### Fase 5 · Migración Sanity → Neon (2-3 días)

- [ ] Script `scripts/migrate-from-sanity.ts` (Node local):
  - Lee farmacias, servicios, faqs, reseñas via Sanity API con GROQ.
  - Descarga imágenes de `cdn.sanity.io` y las sube a R2.
  - **UPSERT** al `Business` existente (por slug) para no duplicar. Añade `Servicio`/`Faq`/`Resena`/`ContentImage`.
  - Log + summary.
- [ ] Modo `--dry-run`.
- [ ] Verificación visual antes/después.
- [ ] Backup del dataset Sanity en JSON.

**Entrega:** Neon refleja el contenido de Sanity al 100%.

### Fase 6 · Landings Astro consumiendo api-client (2-3 días)

- [ ] `apps/torrents/src/lib/content.ts` (renombrado de `sanity.ts`) usando `@larokifarm/api-client`.
- [ ] Igual en `apps/chamarro/`.
- [ ] Astro SSG llama a `api.larokifarm.com/publico/farmacia/:slug` en build.
- [ ] Webhook desde backoffice → deploy hook Vercel al publicar.
- [ ] Verificar SEO y visual.

**Entrega:** landings sirviendo desde Neon vía api. Sanity ya no se toca en runtime.

### Fase 7 · Scout como módulo del backoffice (4-5 días)

- [ ] Mover `apps/scout/src/core/` a `packages/scout-core/`.
- [ ] Api: `/admin/scout/*` con OpenAPI.
- [ ] Backoffice: página scout consume api-client.
- [ ] Historial en Neon (`ScoutSearch`, `ScoutBatch` — modelos nuevos).
- [ ] Worker `scout-batch-worker` escribe estado en Neon via api.
- [ ] Deprecar `apps/scout/`.

**Entrega:** módulo scout equivalente + historial persistente multi-usuario.

### Fase 8 · Absorber el conciliador dentro del backoffice (5-7 días)

- [ ] Portar UI de `apps/conciliador-albaranes/` a `apps/backoffice/src/app/(dashboard)/albaranes/`.
- [ ] La lógica (Prisma, Gemini, bcryptjs) ya vive en `packages/db` y `packages/auth` — se reutiliza.
- [ ] Api: rutas `/admin/albaranes/*` con OpenAPI si aplica.
- [ ] Redirección `conciliador.larokifarm.com/*` → `larokifarm.com/albaranes/*`.
- [ ] Deprecar `apps/conciliador-albaranes/` (mantener repo archivado 30 días por si acaso).

**Entrega:** conciliador es un módulo más del backoffice. Un solo deploy, un solo dominio user-facing.

### Fase 9 · Inventario + workers reubicados + Sanity apagado (3-4 días)

- [ ] Api: `/publico/inventario` (para widget) + `/admin/inventario/sync-now`.
- [ ] Backoffice: UI de estado del sync + forzar sync manual + historial.
- [ ] Mover `apps/inventory-sync/` a `workers/inventory-sync/`.
- [ ] Widget cima-chat consume `api.larokifarm.com/publico/inventario`.
- [ ] `grep -r "@sanity"` para verificar cero imports vivos.
- [ ] Cancelar plan Sanity (si de pago).
- [ ] `git mv studio/ _archived/studio-2026/`.
- [ ] Borrar `apps/scout/`.
- [ ] Actualizar `README.md` raíz.

**Entrega:** monorepo con solo lo que se usa. Un solo lugar de gestión.

## Variables de entorno

### Shared (Neon URL — misma para todos)

```
DATABASE_URL=postgres://...neon.tech/larokifarm?sslmode=require
DIRECT_DATABASE_URL=...  ← usada solo por migraciones
```

### `apps/api/.env.local`

```
DATABASE_URL=…
AUTH_SECRET=… (openssl rand -hex 32)
AUTH_URL=https://api.larokifarm.com
COOKIE_DOMAIN=.larokifarm.com

R2_ACCOUNT_ID=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=larokifarm-media
R2_PUBLIC_URL=https://cdn.larokifarm.com

WORKER_AUTH_TOKEN=…
RESEND_API_KEY=… (opcional)
```

### `apps/backoffice/.env.local`

```
NEXT_PUBLIC_API_URL=https://api.larokifarm.com
AUTH_SECRET=…  ← MISMO que el api (para verificar tokens JWT localmente)
AUTH_URL=https://larokifarm.com
DATABASE_URL=…  ← solo para middleware SSR que valida sesión
```

### `apps/conciliador-albaranes/.env` (existentes + nada nuevo)

Ninguna variable nueva. Sigue usando su `DATABASE_URL` que ahora coincide con el resto.

### `apps/torrents/.env` y `apps/chamarro/.env`

```
PUBLIC_API_URL=https://api.larokifarm.com
```

## Riesgos y mitigación

| Riesgo | Mitigación |
| --- | --- |
| Migración del schema al package rompe el conciliador | Snapshot previo del schema. Prueba local + preview antes de deploy. Rollback: revertir el commit y `git restore packages/db`, el conciliador vuelve a apuntar a su ubicación anterior |
| Migración `add_landing_content` rompe algo | Todos los nuevos campos son opcionales. `prisma migrate deploy` solo aplica lo pendiente. Rollback: `prisma migrate resolve --rolled-back` + `DROP COLUMN` manual si hace falta |
| Cookie cross-subdomain no viaja | Verificar en Fase 3 con `curl -b`; requiere `credentials: 'include'` en fetch y `domain: .larokifarm.com` en next-auth |
| Auth de next-auth diferente entre backoffice y conciliador | Ambos usan el MISMO `packages/auth` y misma `AUTH_SECRET` → los tokens JWT son intercambiables |
| Vercel Hobby te avisa por uso "comercial" | Plan B: Netlify Free o Vercel Pro ($20/mes). Sin lock-in |
| Api-client desincronizado del OpenAPI | Script `pnpm --filter @larokifarm/api-client generate` en pre-commit hook y CI |
| Migración Sanity → Neon rompe algo | `--dry-run` primero; verificación visual antes/después |
| Landings pierden SEO al cambiar origen | Salida HTML idéntica byte-a-byte porque siguen Astro SSG con mismo template |
| Portable Text de Sanity no mapea 1:1 a Tiptap | Convertidor con test cases; fallback a plain text |
| next-auth v5 sigue en beta | La beta ya está en producción en muchos SaaS. Adapter pattern permite migrar a Auth.js estable cuando salga sin rehacer UI |
| Prisma cold start en Vercel Hobby | Node runtime + `@prisma/adapter-neon` funcionan bien (+150-300ms primera vez, imperceptible) |
| R2 caro si crecen las imágenes | R2 sin egress fee = muy barato incluso con TB. Alertas configurables |
| Downtime durante Fase 6 (landings) | Deploy staged en preview branch, validar, promover a production |
| LaLiga bloquea el conciliador (Cloudflare) | Fase 8 absorbe el conciliador en Vercel, resuelve por diseño |

## Checklist antes de dar por hecho

- [ ] Fase 0: schema movido a `packages/db/`, conciliador sigue funcionando idéntico.
- [ ] Fase 1: nuevos campos y tablas en Neon producción, conciliador intacto.
- [ ] Fase 2: `curl https://api.larokifarm.com/publico/health` responde, `/docs` muestra Scalar.
- [ ] Fase 3: login en backoffice funciona, cookie válida en `.larokifarm.com`, SSO con conciliador verificado.
- [ ] Fase 4: crear/editar `Business` con campos de farmacia, `/publico/farmacia/:slug` sirve JSON.
- [ ] Fase 5: migración Sanity → Neon verificada visualmente.
- [ ] Fase 6: landings torrents/chamarro sirviendo desde Neon vía api en producción.
- [ ] Fase 7: módulo scout en backoffice reemplaza `apps/scout/`.
- [ ] Fase 8: módulo albaranes en backoffice reemplaza `apps/conciliador-albaranes/`.
- [ ] Fase 9: inventario en backoffice, workers reubicados, Sanity apagado.

---

**Duración estimada total**: 5-7 semanas de trabajo neto. Paralelizables Fases 7 y 8 (por equipos distintos si hubiera).

**Coste operativo estable**: **$0/mes** incremental (el conciliador ya paga la Neon; el resto suma cero).

**Próximo paso**: aprobar este plan y arrancar Fase 0. Cuando confirmes, muevo el schema del conciliador a `packages/db/` con snapshot previo y probamos que el conciliador sigue funcionando en local.
