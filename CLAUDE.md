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
Herramienta interna. NESTLE/PEROX reparten info entre 2-3 PDFs; plan Fase 2
en `conciliador-albaranes-MULTI-PDF.md`.

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

Actualizado automáticamente al hacer commit (2026-09-28T11:42:02Z).

- `b9a3ae9` 2026-09-28 — Feat: paleta blanco+azul Torrents completa + fix menu hamburguesa movil
- `12e47d9` 2026-09-28 — Feat: paleta Torrents (azul) + limpieza de botones muertos en topbar/listado
- `6911dc0` 2026-09-28 — Feat: Fase 1.E dashboard /admin/uso (SUPER_ADMIN)
- `7276c80` 2026-09-28 — Feat: Fase 1.D dashboard /scout con CTA al standalone
- `112fbe6` 2026-09-28 — Chore: eliminar duplicación de UI del conciliador en el backoffice
<!-- auto:recent-commits:end -->
