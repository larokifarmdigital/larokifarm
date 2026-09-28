# Plan · Backoffice unificado larokifarm

> Doc único de referencia para consolidar backoffice + conciliador + scout, y
> preparar el terreno para las siguientes fases (contenido de landings, backend
> propio, apagar Sanity).
>
> **Última revisión**: 2026-09-28 (rev 3).
> **Reemplaza a**: `BACKOFFICE-UNIFICACION-PLAN.md` (borrado) y a la versión
> anterior de este mismo archivo (2026-09-18).

---

## ⚠ Cambio de estrategia (rev 3 · 2026-09-28)

Después de arrancar Fase 1.C portando UI del conciliador al backoffice
(dropzone + matchFiles + server action) decidimos **pivotar a navegación
simple**: no duplicamos UI ni lógica del conciliador/scout en el backoffice.

**Regla nueva**: el backoffice es un **panel de gestión** (dashboards con KPIs
leídos de Neon). La **ejecución** vive en los standalones (conciliador, scout),
que se abren desde el backoffice con un CTA `target="_blank"` — la cookie SSO
compartida evita el re-login.

**Beneficios**:
- Cero duplicación de lógica (matchFiles, reconcile, extractDeliveryNote…).
- El conciliador y scout siguen siendo la fuente de verdad de su UI.
- Cuando se actualicen, el backoffice ve el cambio inmediatamente.

**Consecuencias en el plan**:
- Fase 1.C.2, 1.C.3, 1.C.4 (portar UI, server action, JWT worker): **canceladas**.
- Fase 1.C.5 (historial completo): **descartada** — el standalone ya tiene `/historial`.
- Fase 1.C.6 (reports SUPER_ADMIN): **descartada** — el standalone ya tiene `/admin/reports`.
- Fase 1.C queda cerrada con **1.C.1** (dashboard `/albaranes` con KPIs + CTA).
- Fase 1.D queda como **dashboard `/scout` mismo patrón** (KPIs cuando estén + CTA al standalone).

Todo lo demás del plan (BD endgame, auth SSO, hosting) sigue igual.

---

## Índice visual (léelo antes de nada)

```
FASE 0 · Preparación                              ┐
  · Aprobar este documento                        │
  · pg_dump Neon (backup pre-cambios)             │  0-2 días
  · Congelar features nuevas en conciliador/scout │
    salvo bugfixes críticos                       ┘

FASE 1 · Backoffice absorbe conciliador + scout   ┐  ← URGENTE cliente
  · Auth del conciliador copiada al backoffice    │
    (SSO real cross-subdomain)                    │
  · Schema Prisma extendido con TODAS las tablas  │
    del endgame (tablas de contenido creadas      │  2-3 semanas
    VACÍAS, para evitar migraciones destructivas) │
  · UI de conciliador dentro del backoffice       │
    con DNA Humblytics                            │
  · UI de scout dentro del backoffice             │
  · Workers (motor conciliador, DO scout) siguen  │
    intactos como APIs pesadas                    ┘

────────────────────────────────────────────────────
              (FRONTERA temporal)
   Fases 2+ arrancan cuando el REPO BACKEND nuevo
   esté navegable — no viven en este repo.
────────────────────────────────────────────────────

FASE 2 · Backend Hono propio (en OTRO repo)       ┐
  · apps/api/ con Hono + Prisma + Zod + OpenAPI   │
  · Dueño único del schema (se hereda del         │  fuera de scope
    conciliador)                                  │  de este doc
  · Auth JWT emitida por el backend               ┘

FASE 3 · Migrar contenido Sanity → Neon           ┐
  · Script upsert por slug                        │  1 semana
  · Landings Astro consumen el backend nuevo      ┘

FASE 4 · Apagar Sanity + retirar Prisma del BO    ┐
  · Backoffice pasa a "frontend puro" via         │
    api-client del backend nuevo                  │  1 semana
  · Sanity workspace archivado                    ┘

FASE 5 · Deprecar apps standalone de conciliador  ┐
  · Redirects 301 conciliador.* → BO/conciliador  │  2-3 días
  · Deprecar apps/scout/ (UI ya vive en el BO)    ┘

FASE 6 · Métricas y cotización unificada          ┐
  · Panel /admin/uso                              │
  · Alertas presupuesto                           │  1 semana
  · Export CSV mensual                            ┘
```

**Fase 1 = urgente cliente** (2-3 semanas). Fases 2+ dependen de que exista el
repo backend nuevo — que se irá construyendo en paralelo poco a poco.

---

## Estado del ecosistema (2026-09-28)

| App | Stack | Auth | BD | Notas |
|-----|-------|------|----|----|
| `apps/backoffice/` | Next 16 / React 19 / Tailwind v4 | next-auth v5 (demo, mocks) | ninguna | DNA Humblytics. Editor farmacia con cobertura Sanity 100%. Falta conectar Sanity y Neon. |
| `apps/conciliador-albaranes/` | Next + OpenNext → Cloudflare Workers | next-auth v5 (Prisma adapter) | Neon Postgres | Multi-tenant. Producción con clientes reales. Dueño del schema Prisma actual. |
| `apps/scout/` | Next + Cloudflare Worker (DO `BATCH_JOB`) | Cookie firmada + `BATCH_PASSWORD` | (Worker aparte, no relacional) | Batch worker en `apps/scout/worker/`. Panel `/batch` con Ethereal Glass Dark. |
| `apps/torrents/` · `apps/chamarro/` | Astro SSG | — | Sanity workspace `farmacias` | Landings con contenido en Sanity. SEO IA + Google. |
| `apps/calendario-vacunas/` · `widgets/cima-chat/` | Astro / Preact | — | Sanity | Contenido editable por cliente farmacia. |

---

## Decisiones tomadas (2026-09-28)

| Decisión | Elegido | Razón |
|---|---|---|
| **Alcance de ESTE repo** | Solo frontend (excepto Prisma temporal en Fase 1 para auth SSO) | El backend Hono va en OTRO repo (aún por crear, tardará) |
| **Backend Hono** | Fuera de este repo, en proyecto separado. NO se crea en Fase 1 | El cliente urge la Fase 1, el backend se hará poco a poco |
| **BD** | Neon Postgres del conciliador — ampliada | Cero duplicación, un solo `User` / `Business` |
| **Dueño del schema Prisma** | `apps/conciliador-albaranes/prisma/schema.prisma` (conciliador) | El backoffice tiene una COPIA idéntica y solo corre `prisma generate` — nunca `prisma migrate` |
| **Auth Fase 1** | next-auth v5 del conciliador copiada al backoffice | Ya en producción, roles ya existen (`SUPER_ADMIN`/`BUSINESS_ADMIN`/`USER`) |
| **Cookie de sesión** | `Domain=.larokifarm.com` para SSO cross-subdomain | Backoffice y conciliador comparten sesión sin doble login |
| **`Business` → `Farmacia`** | NO renombrar. Ampliar `Business` con campos de farmacia (opcionales) | Cero migración destructiva |
| **Contenido de farmacias en Fase 1** | Sigue en Sanity — no se toca | La Fase 2 (que va en OTRO repo) migra Sanity → Neon |
| **Tablas de contenido** (`Servicio`/`Faq`/`Resena`/`ContentImage`) | Se **CREAN VACÍAS** en Fase 1 (schema endgame ready) | Cuando llegue Fase 3 sólo hay que POBLAR, no migrar estructura |
| **Multi-schema Postgres** | NO. Schema único con prefijos (`scout_*`, `content_*`) | Simplicidad; el conciliador nunca usó multi-schema |
| **Motor conciliador y DO scout** | Se quedan en sus Workers | UI se absorbe al backoffice pero la lógica pesada no |
| **Estructura de repo** | `apps/` planas, sin `packages/` | Respeta la convención actual del monorepo |
| **Hosting** | Backoffice = Vercel Hobby. Workers = Cloudflare (donde ya están) | Sin coste incremental |
| **Storage imágenes** | Cloudflare R2 (cuando llegue Fase 3) | Sin egress fee. El conciliador ya usa `@aws-sdk/client-s3` |

---

## Arquitectura Fase 1 (lo que hay que construir YA)

```
┌────────────────────────────────────────────────────────┐
│  backoffice.larokifarm.com   (Next 16, Vercel Hobby)   │
│  · DNA Humblytics · next-auth v5 (copia del concil.)   │
│                                                        │
│  /farmacias/*     → editor Sanity (ya existe)          │
│  /conciliador/*   → UI nueva + server actions          │
│  /scout/*         → UI nueva + server actions          │
│  /admin/*         → gestión usuarios/roles             │
└──────┬───────────┬──────────────┬────────────┬────────┘
       │           │              │            │
       │ Sanity    │ Prisma       │ HTTP+JWT   │ HTTP+JWT
       │ API       │ (auth+leer)  │            │
       ▼           ▼              ▼            ▼
  ┌────────┐  ┌───────────┐  ┌─────────┐  ┌────────┐
  │ Sanity │  │  Neon     │  │ Worker  │  │ Worker │
  │ WS     │  │  Postgres │◄─┤ concil. │  │ scout  │
  │ farm.  │  │           │  │ (motor) │  │ (DO)   │
  └────────┘  │  users    │  └─────────┘  └────────┘
              │  business │
              │  concil.* │  ← tablas existentes (no se tocan)
              │  scout_*  │  ← NUEVAS Fase 1 (BatchJob, BatchQuery)
              │  content_*│  ← NUEVAS Fase 1 VACÍAS (Servicio, Faq, ...)
              │  billing_*│  ← NUEVAS Fase 1 (UsageEntry)
              └───────────┘
```

**Flujo auth SSO Fase 1**:
- Login en `backoffice.larokifarm.com` → next-auth firma cookie con `Domain=.larokifarm.com`.
- El conciliador (`conciliador.larokifarm.com`) reconoce la misma cookie → SSO sin doble login.
- El worker de scout recibe JWT en `Authorization: Bearer` cuando el backoffice le habla.
- El backoffice y el conciliador **comparten `AUTH_SECRET`** (misma env var, misma Neon).

---

## Arquitectura destino (Fases 2+, para referencia)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Backoffice  │     │  Landings    │     │  Widgets     │
│  (frontend)  │     │  (Astro SSG) │     │  (cima-chat) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │      packages/api-client (autogen OpenAPI)
       │                    │                    │
       └──────────┬─────────┴──────────┬─────────┘
                  ▼                    ▼
              ┌──────────────────────────┐
              │  Backend Hono            │ ← OTRO REPO
              │  api.larokifarm.com      │
              │  Prisma · Zod · OpenAPI  │
              └────────────┬─────────────┘
                           ▼
                  ┌────────────────┐
                  │  Neon Postgres │
                  └────────────────┘
```

En este estado final, este repo (larokifarm) es **solo frontend**: no hay
Prisma, no hay conexión directa a BD, todo pasa por el backend.

**Cómo se llega**: Fase 3 y 4 (en OTRO repo). Cuando el backend esté listo,
el backoffice desconecta Prisma y consume `api-client`. Sanity se apaga.

---

## Reglas de convivencia con el conciliador en producción

El conciliador **ya está con clientes reales** (Farmacia Chamarro, otros). Reglas
duras para Fase 1:

1. **El schema del conciliador es el que manda**. El backoffice **extiende**, nunca
   reemplaza. `apps/conciliador-albaranes/prisma/schema.prisma` es el ÚNICO lugar
   donde se editan modelos y migraciones.
2. **Backoffice tiene copia del schema** en `apps/backoffice/prisma/schema.prisma`
   pero **sólo corre `prisma generate`** — nunca `prisma migrate`.
3. **Regla de sincronización**: cada vez que se cambia el schema del conciliador,
   se copia el archivo al backoffice y se regenera el client. Hay un script para
   automatizar esto (`pnpm --filter backoffice sync-schema`, ver Fase 1 abajo).
4. **Cero migraciones destructivas** en las tablas existentes (`users`,
   `businesses`, `comparisons`, `comparison_files`, `comparison_reports`). Sólo
   `ALTER TABLE ADD COLUMN` con `DEFAULT NULL` u opcionales.
5. **Ampliaciones al `Business`**: campos nuevos de farmacia (opcionales).
6. **Tablas nuevas** (`scout_*`, `content_*`, `billing_*`): se crean en Fase 1
   aunque no se usen todas. Cero riesgo para el conciliador.
7. **Migración se prueba primero en preview branch** de Vercel/CF antes de
   `prisma migrate deploy` en Neon producción.
8. **Todos los envs comparten `DATABASE_URL`** (misma Neon) y `AUTH_SECRET`
   (misma cookie).

---

## Schema Prisma endgame (Fase 1 lo deja listo)

Todo esto vive en `apps/conciliador-albaranes/prisma/schema.prisma` en Fase 1
(dueño único). Cuando nazca el backend Hono, el schema se traslada a ese repo.

### Existente (no se toca)

```prisma
model User        { … }   // ya existe
model Business    { … }   // se AMPLÍA (columnas opcionales, ver abajo)
model Comparison  { … }   // ya existe
model ComparisonFile { … } // ya existe
model ComparisonReport { … } // ya existe

enum Role              { SUPER_ADMIN BUSINESS_ADMIN USER }
enum ComparisonStatus  { OK DISCREPANCIES ERROR }
enum FileKind          { PDF_INPUT XLSX_INPUT REPORT_OUTPUT }
enum ReportStatus      { OPEN RESOLVED }
```

### `Business` extendido (columnas nuevas — todas opcionales)

```prisma
model Business {
  // … campos existentes intactos …

  // Identidad de farmacia
  ciudad             String?
  telefono           String?
  whatsapp           String?
  email              String?
  web                String?
  titular            String?
  numeroColegiado    String?
  logoUrl            String?

  // Multi-idioma (Sanity → JSON)
  descripcionCorta   Json?     // { es, en, ca }
  descripcionLarga   Json?     // HTML por locale (Tiptap) o Portable Text migrado
  direccion          Json?
  horarios           Json?
  redesSociales      Json?
  googleMapsUrl      String?
  idiomasActivos     Json?     // ["es","en","ca"]

  // Publicación
  publishedStatus    String    @default("draft")  // draft | published | archived
  seoConfig          Json?

  // Módulos contratados (para permisos en backoffice)
  modules            Json?     // { conciliador: true, scout: true, chatbot: false }
  plan               String?   // BASIC | PRO | ENTERPRISE

  // Relaciones nuevas
  servicios  Servicio[]
  faqs       Faq[]
  resenas    Resena[]
  imagenes   ContentImage[]
  batchJobs  ScoutBatchJob[]
  usage      UsageEntry[]

  @@map("businesses")
}
```

### Tablas de scout (nuevas Fase 1, se usan ya)

```prisma
enum ScoutBatchStatus { QUEUED RUNNING DONE FAILED }
enum ScoutQueryStatus { PENDING DONE ERROR }

model ScoutBatchJob {
  id            String            @id @default(cuid())
  businessId    String
  userId        String
  status        ScoutBatchStatus  @default(QUEUED)
  totalQueries  Int
  doneQueries   Int               @default(0)
  costUsd       Decimal           @default(0) @db.Decimal(10, 4)
  errorReason   String?
  createdAt     DateTime          @default(now())
  finishedAt    DateTime?

  business Business        @relation(fields: [businessId], references: [id])
  user     User            @relation(fields: [userId], references: [id])
  queries  ScoutBatchQuery[]

  @@index([businessId, createdAt])
  @@index([userId, createdAt])
  @@map("scout_batch_jobs")
}

model ScoutBatchQuery {
  id         String            @id @default(cuid())
  batchJobId String
  query      String
  status     ScoutQueryStatus  @default(PENDING)
  resultJson Json?
  errorMsg   String?

  batchJob   ScoutBatchJob @relation(fields: [batchJobId], references: [id], onDelete: Cascade)

  @@index([batchJobId])
  @@map("scout_batch_queries")
}
```

**Nota**: el Durable Object del worker de scout sigue orquestando la ejecución
en runtime. La BD guarda **snapshots** para que el backoffice pueda mostrar
historial cuando el DO haya sido reciclado.

### Tablas de billing / uso (nuevas Fase 1, se usan ya)

```prisma
enum UsageModule { CONCILIADOR SCOUT CHATBOT }

model UsageEntry {
  id          String       @id @default(cuid())
  businessId  String
  userId      String?
  module      UsageModule
  action      String       // "compare", "batch_query", "chat_turn", ...
  units       Int          @default(1)
  costUsd     Decimal      @default(0) @db.Decimal(10, 6)
  tokensIn    Int          @default(0)
  tokensOut   Int          @default(0)
  createdAt   DateTime     @default(now())

  business Business @relation(fields: [businessId], references: [id])
  user     User?    @relation(fields: [userId], references: [id])

  @@index([businessId, module, createdAt])
  @@index([businessId, createdAt])
  @@map("usage_entries")
}
```

### Tablas de contenido (nuevas Fase 1, se CREAN VACÍAS — se poblan en Fase 3)

```prisma
model Servicio {
  id           String   @id @default(cuid())
  businessId   String
  icono        String?
  nombre       Json     // { es, en, ca }
  descripcion  Json?
  enlace       Json?    // { url, nuevaPestana }
  orden        Int      @default(0)

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId, orden])
  @@map("content_servicios")
}

model Faq {
  id           String   @id @default(cuid())
  businessId   String
  pregunta     Json
  respuesta    Json
  orden        Int      @default(0)

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId, orden])
  @@map("content_faqs")
}

model Resena {
  id           String   @id @default(cuid())
  businessId   String
  autor        String
  puntuacion   Int
  texto        String
  fecha        DateTime
  fuente       String   // 'google' | 'manual'
  avatarUrl    String?
  orden        Int      @default(0)

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId, fecha])
  @@map("content_resenas")
}

model ContentImage {
  id           String   @id @default(cuid())
  businessId   String
  role         String   // 'logo' | 'hero' | 'servicio' | 'gallery' | 'og'
  storageKey   String   // R2 key
  publicUrl    String
  alt          Json     // multi-idioma
  width        Int?
  height       Int?
  sizeBytes    Int?
  createdAt    DateTime @default(now())

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId, role])
  @@map("content_images")
}
```

**Regla dura Fase 1**: estas tablas quedan **vacías**. Ni el backoffice ni el
conciliador escriben en ellas. Sanity sigue siendo la fuente de verdad del
contenido. Cuando el backend Hono exista (Fase 3), se poblan con el dump de
Sanity y se apaga el workspace.

---

## Auth: next-auth v5 en el backoffice (copia del conciliador)

### Configuración compartida

Tanto `apps/backoffice/lib/auth.ts` como `apps/conciliador-albaranes/lib/auth.ts`
tienen la MISMA config:

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

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
          id: user.id, email: user.email, name: user.name,
          role: user.role, businessId: user.businessId ?? undefined,
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

Claves:
- **Misma `AUTH_SECRET`** en backoffice y conciliador → los JWT son
  intercambiables entre las dos apps.
- **`domain: .larokifarm.com`** → la cookie viaja a subdominios.
- **`prisma` local en cada app** → cada una carga su cliente Prisma generado
  desde su copia del schema, apuntando ambos al mismo `DATABASE_URL`.

### Rollout auth en Fase 1

1. Copiar `apps/conciliador-albaranes/lib/auth.ts` → `apps/backoffice/lib/auth.ts`.
2. Reemplazar el login demo del backoffice por el login real contra `users`.
3. Verificar en local: login en `localhost:3001` (backoffice) crea cookie que
   `localhost:3000` (conciliador) reconoce (misma cookie, sub-dominio en local
   via `/etc/hosts` con `*.local.larokifarm.com` o similar).
4. Verificar en preview: login en `backoffice-preview.vercel.app` funciona.
5. Verificar en producción: `backoffice.larokifarm.com` login → abrir
   `conciliador.larokifarm.com` sin re-login.
6. Retirar el login demo (`admin@larokifarm.com / demo1234`) del backoffice.

---

## Estructura del repo tras Fase 1

```
larokifarm/
├── apps/
│   ├── backoffice/                     ← Next 16, DNA Humblytics
│   │   ├── prisma/
│   │   │   └── schema.prisma           ← COPIA idéntica del conciliador (sync manual)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── farmacias/      ← ya existe, editor Sanity
│   │   │   │       ├── conciliador/    ← NUEVO Fase 1
│   │   │   │       ├── scout/          ← NUEVO Fase 1
│   │   │   │       └── admin/          ← usuarios, uso, roles
│   │   │   ├── features/
│   │   │   │   ├── farmacias/         ← ya existe
│   │   │   │   ├── conciliador/       ← NUEVO Fase 1 (UI portada del standalone)
│   │   │   │   └── scout/             ← NUEVO Fase 1
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts             ← next-auth v5 (copia del conciliador)
│   │   │   │   ├── prisma.ts           ← cliente Prisma
│   │   │   │   └── clients/
│   │   │   │       ├── conciliadorWorker.ts  ← fetch al worker existente
│   │   │   │       └── scoutWorker.ts        ← fetch al worker de scout
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── conciliador-albaranes/          ← DUEÑO del schema Prisma
│   │   ├── prisma/schema.prisma        ← FUENTE DE VERDAD
│   │   └── ...                         ← standalone sigue funcionando en paralelo
│   │
│   ├── scout/                          ← Worker sigue como API
│   │   ├── worker/                     ← DO BATCH_JOB, motor scraper
│   │   └── src/                        ← UI standalone (se deprecha en Fase 5)
│   │
│   ├── torrents/ · chamarro/           ← Astro, contenido Sanity (Fase 3 migra)
│   ├── calendario-vacunas/
│   └── ...
│
├── widgets/                            ← convención plana original
├── studio/                             ← Sanity (activo hasta Fase 4)
│
├── BACKOFFICE-PLAN.md                  ← este archivo
├── CLAUDE.md
└── pnpm-lock.yaml
```

Sin `packages/`. Estructura plana como la convención del repo.

---

## Fases detalladas

### FASE 0 · Preparación (0-2 días)

- [ ] Este documento aprobado por Erick.
- [ ] `pg_dump` de Neon → `_backups/neon-pre-fase1-2026-09-28.sql` (fuera del
      repo, subir a R2 o guardar local con etiqueta).
- [ ] Congelar features nuevas en `apps/conciliador-albaranes/` y `apps/scout/`
      mientras dure la Fase 1 (excepto bugfixes críticos como el de Bayer
      que acabamos de mergear).
- [ ] Inventario de envs actuales de las 3 apps (Vercel + Cloudflare secrets).
      Documento privado.

### FASE 1 · Backoffice absorbe conciliador y scout (2-3 semanas)

Todo esta fase es en este repo. Sub-fases ordenadas.

#### 1.A · Base de datos y Prisma (2-3 días)

- [ ] Ampliar `apps/conciliador-albaranes/prisma/schema.prisma`:
  - Añadir columnas nuevas opcionales a `Business` (`ciudad`, `descripcionCorta`,
    `modules`, etc. — ver sección **Schema endgame** arriba).
  - Añadir enums nuevos (`ScoutBatchStatus`, `ScoutQueryStatus`, `UsageModule`).
  - Añadir modelos `ScoutBatchJob`, `ScoutBatchQuery`, `UsageEntry`,
    `Servicio`, `Faq`, `Resena`, `ContentImage`.
- [ ] Migración: `pnpm --filter conciliador-albaranes exec prisma migrate dev
      --name endgame_schema_prep`.
- [ ] Verificar que el conciliador local sigue arrancando y funciona idéntico.
- [ ] Aplicar en Neon producción con `prisma migrate deploy` **desde una
      preview branch de Vercel** primero.
- [ ] Aplicar en Neon producción real.

#### 1.B · Backoffice conectado a Neon + auth SSO (3-4 días)

- [ ] Añadir `prisma` a las deps de `apps/backoffice/`.
- [ ] Copiar el schema: `apps/backoffice/prisma/schema.prisma` = copia idéntica
      del conciliador.
- [ ] Script en `apps/backoffice/package.json`:
  ```json
  "sync-schema": "cp ../conciliador-albaranes/prisma/schema.prisma prisma/schema.prisma && prisma generate"
  ```
- [ ] `apps/backoffice/lib/prisma.ts` con singleton Prisma.
- [ ] Copiar `apps/conciliador-albaranes/lib/auth.ts` → `apps/backoffice/lib/auth.ts`.
- [ ] Configurar env `DATABASE_URL`, `AUTH_SECRET` (mismo que conciliador),
      `AUTH_URL=https://backoffice.larokifarm.com`, `COOKIE_DOMAIN=.larokifarm.com`.
- [ ] Reemplazar login demo por login real contra `users`.
- [ ] E2E: login en backoffice → cookie válida al abrir el conciliador (dev y
      preview).

#### 1.C · Módulo conciliador en el backoffice (5-7 días)

- [ ] Rutas `/conciliador`, `/conciliador/historial`, `/conciliador/reports` en
      `apps/backoffice/src/app/(dashboard)/conciliador/`.
- [ ] UI portada desde `apps/conciliador-albaranes/src/app/` con DNA Humblytics
      (Button/Modal/IconInput/TimePicker del backoffice).
- [ ] Server action `runComparison` que POSTea al Worker conciliador con JWT.
- [ ] Worker conciliador extendido: aceptar `Authorization: Bearer <JWT>` con
      `AUTH_SECRET` compartido, además de su login propio (fallback).
- [ ] Panel de reports para SUPER_ADMIN (portar UI del standalone).
- [ ] Escrituras en `comparisons`, `comparison_files`, `comparison_reports`:
      decidir si las hace el worker (como ahora) o el backoffice. **Recomendado**:
      seguir haciéndolas en el worker; el backoffice solo lee.

#### 1.D · Módulo scout en el backoffice (5-7 días, paralelizable con 1.C)

- [ ] Rutas `/scout`, `/scout/batch`, `/scout/batch/[jobId]` en el backoffice.
- [ ] UI de subida de queries + resultados con DNA Humblytics.
- [ ] Server actions llaman al Worker de scout via `BatchWorkerClient` (ya
      existe en `apps/scout/src/core/infrastructure/batch/`).
- [ ] Worker de scout: aceptar JWT compartido, mantener `BATCH_PASSWORD` como
      fallback 1 sprint.
- [ ] `ScoutBatchJob` y `ScoutBatchQuery` escritos como snapshot desde el
      Worker (el DO sigue mandando en runtime).
- [ ] Historial en el backoffice leído desde `scout_batch_jobs`.

#### 1.E · Métricas mínimas (2 días)

- [ ] Los tres módulos escriben en `usage_entries` cuando hay una acción
      contabilizable (comparar, batch, chat).
- [ ] Panel `/admin/uso` (versión mínima: tabla con filtros farmacia + módulo
      + rango).

#### 1.F · Deploy + verificación (1-2 días)

- [ ] Vercel Hobby: proyecto `backoffice-larokifarm`.
- [ ] Dominio: `backoffice.larokifarm.com`.
- [ ] Envs de producción configuradas.
- [ ] Verificación con cliente: hacer 3 conciliaciones y 1 batch de scout desde
      el backoffice.

**Entrega Fase 1**: cliente puede loguearse en `backoffice.larokifarm.com` y
usar conciliador + scout desde ahí con el DNA Humblytics. Las apps standalone
(`conciliador.larokifarm.com`, `scout.larokifarm.com`) siguen vivas en
paralelo como fallback.

---

### FASES 2+ (fuera del scope de este repo — resumen para tenerlas en mente)

**FASE 2 — Backend Hono en OTRO repo** (mientras tanto)
- Repo nuevo `larokifarm-api/` con Hono + Prisma + Zod + `@hono/zod-openapi`.
- Se hereda el schema del conciliador (dueño se traslada aquí).
- `packages/api-client/` autogenerado desde el OpenAPI del api.
- El backoffice empieza a consumir el api para módulos nuevos.

**FASE 3 — Migrar contenido Sanity → Neon**
- Script `migrate-from-sanity.ts` que puebla `content_servicios`, `content_faqs`,
  `content_resenas`, `content_images` por slug de business.
- Descarga imágenes de `cdn.sanity.io` y las sube a R2.
- Dry-run + verificación visual antes/después.

**FASE 4 — Apagar Sanity + retirar Prisma del backoffice**
- Backoffice pasa a "frontend puro": Prisma fuera, todo por api-client.
- Landings Astro (torrents, chamarro) consumen api-client.
- Sanity workspace archivado. `git mv studio/ _archived/studio-YYYY/`.

**FASE 5 — Deprecar apps standalone**
- Redirects 301 en `conciliador.larokifarm.com` → `backoffice.larokifarm.com/conciliador`.
- Retirar UIs viejas de `apps/conciliador-albaranes/` y `apps/scout/` (los
  Workers pueden seguir como APIs si el api Hono no los ha absorbido aún).

**FASE 6 — Métricas y cotización unificada**
- Panel completo `/admin/uso` con export CSV mensual.
- Alertas presupuesto (`monthlyBudgetUsd` del Business).
- Rollup mensual `usage_monthly_aggregate` si crece `usage_entries`.

---

## Variables de entorno (Fase 1)

### `apps/conciliador-albaranes/` (existentes, sin cambios)

```
DATABASE_URL=postgres://…neon.tech/larokifarm?sslmode=require
DIRECT_DATABASE_URL=…
AUTH_SECRET=…
GEMINI_API_KEY=…
ACCESO_CLAVE=…
```

### `apps/backoffice/.env.local` (Fase 1 nuevo)

```
DATABASE_URL=…                     ← MISMO que el conciliador
DIRECT_DATABASE_URL=…              ← MISMO que el conciliador
AUTH_SECRET=…                      ← MISMO que el conciliador (para JWT compatibles)
AUTH_URL=https://backoffice.larokifarm.com
COOKIE_DOMAIN=.larokifarm.com

# Comunicación con workers
CONCILIADOR_WORKER_URL=https://conciliador.larokifarm.com
CONCILIADOR_WORKER_TOKEN=…         ← token server-to-server
SCOUT_WORKER_URL=https://scout-batch-worker.workers.dev
SCOUT_WORKER_TOKEN=…               ← WORKER_AUTH_TOKEN de scout worker

# Sanity (ya se usa en el editor de farmacias)
SANITY_PROJECT_ID=…
SANITY_DATASET=production
SANITY_TOKEN=…
```

### `apps/scout/worker/` (existente, se añade)

```
# Además del existente:
AUTH_SECRET=…                      ← MISMO que backoffice/conciliador para validar JWTs
```

---

## Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Migración `endgame_schema_prep` rompe el conciliador en producción | Alto (clientes reales) | Todos los campos nuevos son opcionales. Migración probada primero en preview branch. Rollback: `prisma migrate resolve --rolled-back` + `DROP` manual. |
| Schema del backoffice se desincroniza del conciliador | Medio | Script `sync-schema` documentado. Regla dura: cualquier cambio al schema pasa por el conciliador y se copia. Idealmente un pre-push hook que compare los dos archivos. |
| Cookie cross-subdomain no viaja | Medio | Probar en Fase 1.B con `curl -b/-c` y con navegador real. `credentials: 'include'` en fetch. |
| next-auth v5 sigue en beta | Bajo | Ya está en producción en el conciliador desde hace meses. |
| Vercel Hobby avisa por uso "comercial" | Bajo | Plan B: Netlify Free o Vercel Pro ($20/mes). |
| UI del conciliador portada al backoffice pierde features del standalone | Medio | Checklist de features del standalone antes de deprecarlo. Mantener el standalone vivo en paralelo hasta Fase 5. |
| Worker de scout no valida JWT correctamente | Medio | Test manual + `BATCH_PASSWORD` como fallback durante 1 sprint. |
| El cliente ve tablas de contenido vacías y se preocupa | Bajo | Documentar en README interno: "tablas creadas para Fase 3, contenido sigue en Sanity". |
| Bugs del refactor tumban el conciliador o scout | Alto | Deploy staged (preview → prod). Botón rollback en Vercel. Workers de conciliador/scout mantienen su UI standalone como salida de emergencia. |
| Doble mantenimiento (standalone + backoffice) durante Fase 1 | Medio | Comunicar al cliente que use el backoffice; el standalone es fallback silencioso. Retirar en Fase 5. |
| LaLiga bloquea el conciliador (CF Workers) | Bajo (ya vive así) | El motor sigue en CF Workers, no cambia en Fase 1. Migración futura (Fase 2 en otro repo) puede resolver. |

---

## Checklist antes de dar por hecho Fase 1

- [ ] `apps/conciliador-albaranes/prisma/schema.prisma` extendido, migración
      aplicada en Neon prod sin romper nada.
- [ ] `apps/backoffice/prisma/schema.prisma` es copia idéntica y `prisma generate`
      corre limpio.
- [ ] Login en `backoffice.larokifarm.com` funciona con usuario real de la
      tabla `users`.
- [ ] SSO verificado: abrir `conciliador.larokifarm.com` desde el backoffice no
      pide re-login.
- [ ] `/conciliador/*` en el backoffice ejecuta una comparación real y muestra
      resultado.
- [ ] `/scout/*` en el backoffice lanza un batch y muestra progreso + resultado.
- [ ] `usage_entries` se rellena con las acciones de los 3 módulos.
- [ ] Panel `/admin/uso` muestra las entradas.
- [ ] Cliente ha probado y aceptado.
- [ ] Standalone de conciliador y scout siguen vivos como fallback.

---

## Próximo paso

Aprobar este documento → arrancar **Fase 0** (pg_dump + congelar features) y
después la Fase 1.A (ampliar el schema del conciliador). Cuando confirmes, me
pongo con la migración `endgame_schema_prep` en el conciliador — es el paso
que desbloquea todo lo demás.
