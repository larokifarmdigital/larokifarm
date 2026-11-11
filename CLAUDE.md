# larokifarm — mapa del monorepo para Claude Code

Este archivo se carga en cualquier sesión con CWD dentro del repo. Da la vista
global. Si trabajas en un subproyecto, además existe un `CLAUDE.md` más
específico en su carpeta (ej. `apps/backoffice/CLAUDE.md`).

## Estructura (convención acordada: NO monorepo estricto)

Carpetas planas independientes según su naturaleza:
- **`apps/`** — apps standalone (Next.js, Astro). Cada una con su package.json.
- **`widgets/`** — widgets embebibles en sitios externos (Preact + Vite library
  + Shadow DOM).
- **`studio/`** — Sanity Studio. Contiene los schemas fuente de verdad.
- **`workers/`** — Cloudflare Workers (cron, APIs).
- **`packages/`** — solo si necesitas código compartido de verdad. Preferimos
  duplicar poco a acoplar mucho.

Cada proyecto tiene su package.json, su README y su CLAUDE.md si aplica.

## Proyectos activos

### `apps/backoffice/`
Backoffice Next.js para gestión de farmacias.
- Stack: Next 16 + Tailwind v4 + Radix + Prisma
- Puerto dev: `:3001` — `pnpm --filter backoffice dev`
- DB Neon compartida con conciliador-albaranes (extiende `Business` a
  `Farmacia`)
- Auth: next-auth v5
- Contexto completo: `apps/backoffice/CLAUDE.md`

### `apps/torrents/`
Landing pública de Farmacia Torrents (Barcelona) en Astro + Sanity workspace
`farmacias`. Sin GA, sin publicidad, sin cookies. Mapa con patrón "click para
cargar" para no requerir consentimiento.

### `apps/chamarro/`
Landing pública de Farmacia Chamarro en Astro + Sanity workspace `farmacias`.
Fuente única Manrope, paleta verde del logo del cliente (#44A460 → #6DC261 →
#C8E845) + blanco. PWA completa (favicon.svg + apple-touch-icon + icon-192/512
+ maskable). Chat widget `cima-chat` embebido. i18n: es, ca, en.
Contexto: `apps/chamarro/CLAUDE.md`.

### `widgets/cima-chat/`
Widget embebible (Preact + Vite library + Shadow DOM). Cliente real:
farmacia en Barcelona. Sin LLM en MVP.

### `widgets/calendario-vacunas/`
Mini-app Astro SSG + Sanity CMS — calendarios de vacunación por CCAA
editables por el cliente farmacia.

### `apps/conciliador-albaranes/`
Herramienta interna. Soporta **N PDFs del proveedor + M Excels del pedido**
por par: multi-PDF (Fase 2, union-find vía `fusionarAlbaranes.ts`) y
multi-Excel (Fase 3, 2026-10-05 — concat de líneas + `agrupar()` del engine).
Casos reales NESTLE/PEROX. Mapeo completo + decisiones en
`apps/conciliador-albaranes/docs/multi-pdf.md`.

## Convenciones globales

- **Package manager**: pnpm. Nunca npm. Si un proyecto usa npm por herencia,
  avisar antes de cualquier comando.
- **Idioma código**: español peninsular en textos UI y comentarios.
- **Commits**: nunca `Co-Authored-By: Claude`. Solo el user aparece como
  autor.
- **Push/merge**: nunca sin permiso explícito.
- **Skills a aplicar**: `git-commit-push`, `naming-conventions`,
  `nextjs-conventions` (para las apps Next), `astro-conventions` (para
  Astro), `tailwind-styling`.

## Contexto Sanity (source of truth de contenido)

El schema real de Farmacia vive en `studio/schemas/farmacias/farmacia.ts`.
10 grupos: Identidad · Hero · Features · Sobre nosotros · Servicios · FAQs
· Reseñas · Contacto · Legal · SEO. El backoffice mapea 1:1 estos campos
(ver `apps/backoffice/CLAUDE.md` para detalle).

**Project ID**: `yovi040n`. Workspaces del studio: `cima-chat` (dataset
`cima`), `farmacias` (dataset `production` o el que tengan en el .env), y
`calendario-vacunas` (dataset `calendario`).

## Infra: alojamiento y deploy

Qué recurso vive en qué cuenta y cómo se redeployan los sitios públicos.

| Recurso | Hosting | Cuenta | Notas |
|---|---|---|---|
| `apps/torrents/` | Cloudflare Pages | Cuenta empresa | Dominio personal (de Erick) |
| `apps/torrents/` | Vercel | Cuenta cliente | Dominio del cliente |
| `apps/backoffice/` | — | — | Local todavía, pendiente deploy |
| `workers/sanity-fanout/` | Cloudflare Workers | **Cuenta empresa** (`larokifarmdigital@gmail.com`, account ID `b541c31a1626d80fb24641caa2ce9d15`) | Recibe el único webhook de Sanity y hace fan-out a N deploy hooks en paralelo |
| `workers/google-resenas/` | Cloudflare Workers | — | Pendiente de activar cuando Google apruebe la API |

### Flujo de deploy al editar Sanity

```
Cliente publica en Sanity Studio
         ↓
Sanity webhook (único, plan free) → POST a workers/sanity-fanout
         ↓
Worker verifica firma HMAC-SHA256 + hace fan-out en paralelo a:
  ├─ Cloudflare Pages Torrents (dominio Erick)
  ├─ Vercel Torrents (dominio cliente)
  └─ Cloudflare Pages Calendario-vacunas
         ↓
Cada hosting re-builda su sitio en ~1-2 min
```

Para añadir un nuevo sitio al fan-out: `workers/sanity-fanout/README.md` →
sección "Añadir un sitio nuevo". Soporta cualquier hosting con deploy hook
tipo `POST sin auth` (CF Pages, Vercel, Netlify).

### `CLOUDFLARE_ACCOUNT_ID` en tu shell

Si tienes esa env var exportada (desde cuando trabajabas con la cuenta
personal), wrangler la respeta por encima del `whoami` y puede dar
`Authentication error [code: 10000]` al deployar. Si pasa:
- `unset CLOUDFLARE_ACCOUNT_ID` para la sesión actual, o
- `CLOUDFLARE_ACCOUNT_ID=b541c31a1626d80fb24641caa2ce9d15 pnpm exec wrangler deploy`
  solo para ese comando.

Mira `~/.zshrc` para ver si está exportada permanentemente.

## Reseñas Google (Fase pendiente)

- Solicitud a Google Business Profile API rechazada 2026-06-15 por usar
  rol admin + Gmail personal. Al reintentar: cuenta Propietario + email
  de dominio.
- Worker de sincronización → Sanity (planificado en `project_torrents_resenas`
  de memoria auto).
- Al montarlo: re-alojar fotos de autores en Sanity para no romper el
  "cero cookies" de Torrents (`project_torrents_avatares_reseñas`).

## Al empezar una sesión nueva

1. Lee este archivo + el `CLAUDE.md` del subproyecto (si aplica).
2. Revisa `MEMORY.md` de tu memoria auto — ahí están las decisiones y
   referencias que se han acumulado.
3. NO leas archivos completos "para orientarte" — usa grep, ls y snapshots.
   Los CLAUDE.md ya te dicen qué hay.
4. Si el user pide algo específico, busca el archivo concreto que necesitas
   y léelo puntualmente (Read con `offset`/`limit`).

## Al terminar cambios significativos

- Si tocaste UX/UI del backoffice: actualizar `apps/backoffice/CLAUDE.md`
  (sección "Decisiones UI/UX acordadas" o "Fases del roadmap").
- Si añadiste componente reutilizable: documentarlo en el CLAUDE.md
  correspondiente.
- Si cambiaste convención o descubriste bug conocido: memoria auto
  (`feedback_*` o `project_*`).

<!-- auto:recent-commits:start -->
## Cambios recientes

Actualizado automáticamente al hacer commit (2026-11-11T09:07:55Z).

- `2e7d262` 2026-11-11 — Feat(backoffice): ImageGalleryField mode=single + jubilar ImageUploader + ServiciosTab modal
- `522eb88` 2026-11-11 — Feat(backoffice): revamp UX del editor de farmacias (Gilroy, modales, galería compacta)
- `4b84a3e` 2026-11-11 — Fix(backoffice): migración Sanity → mapear language (no _key) + traducir días Mo→lun
- `205fbfb` 2026-11-11 — Feat(backoffice): integrar ImageUploader en HeroTab/SobreTab/GeneralTab
- `79f5b68` 2026-11-10 — Feat(backoffice): Fase C — imágenes a R2 (storage + server actions + proxy + uploader)
<!-- auto:recent-commits:end -->
