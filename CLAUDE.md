# larokifarm — mapa del monorepo para Claude Code

Este archivo se carga en cualquier sesión con CWD dentro del repo. Da la vista
global. Si trabajas en un subproyecto, además existe un `CLAUDE.md` más
específico en su carpeta (ej. `apps/backoffice/CLAUDE.md`).

## Estructura (convención acordada: NO monorepo estricto)

Carpetas planas independientes según su naturaleza:
- **`apps/`** — apps standalone (Next.js, Astro). Cada una con su package.json.
- **`widgets/`** — widgets embebibles en sitios externos (Preact + Vite library
  + Shadow DOM).
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
Landing pública de Farmacia Torrents (Barcelona) en Astro. Contenido en build
desde la API pública del backoffice. Sin GA, sin publicidad, sin cookies. Mapa con patrón "click para
cargar" para no requerir consentimiento.

### `apps/chamarro/`
Landing pública de Farmacia Chamarro en Astro (contenido del backoffice).
Fuente única Manrope, paleta verde del logo del cliente (#44A460 → #6DC261 →
#C8E845) + blanco. PWA completa (favicon.svg + apple-touch-icon + icon-192/512
+ maskable). Chat widget `cima-chat` embebido. i18n: es, ca, en.
Contexto: `apps/chamarro/CLAUDE.md`.

### `widgets/cima-chat/`
Widget embebible (Preact + Vite library + Shadow DOM). Cliente real:
farmacia en Barcelona. Sin LLM en MVP. Catálogo de síntomas/perfiles en el
propio código (`src/lib/symptoms.ts`, `profiles.ts`); su configuración por
farmacia sale del backoffice.

### `apps/inventory-sync/`
Script (GitHub Actions cada 6 h) que lee el inventario de SharePoint y lo deja
en Cloudflare KV para el «Disponible» del chat.

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

## Contenido de las farmacias (fuente de verdad)

Todo el contenido vive en el **backoffice** (Neon + R2). El modelo de Farmacia
es `apps/backoffice/src/core/farmacias/domain/models/Farmacia.ts` y las landings
lo leen en build de `GET /api/public/farmacias/:slug` (`BACKOFFICE_URL`).
Utilidades compartidas de las landings en `packages/contenido` (i18n de campos,
texto enriquecido, horarios, URL de imagen).

**Sanity retirado (24-11-2026)**: se borraron `studio/`,
`workers/sanity-fanout` y el camino Sanity de las landings y del chat. La base
de datos ya no referencia nada de Sanity. Queda borrar el proyecto `yovi040n`
en sanity.io (cuenta del usuario).

## Infra: alojamiento y deploy

Qué recurso vive en qué cuenta y cómo se redeployan los sitios públicos.

| Recurso | Hosting | Cuenta | Notas |
|---|---|---|---|
| `apps/torrents/` | Vercel | `larokifarm-torrents` | www.farmaciapediatrica.com (la copia antigua en Cloudflare Pages con `torrentsfarmacia.com` ya no responde) |
| `apps/backoffice/` | Vercel | `larokifarm` (larokifarm.vercel.app) | Next 16 |
| `apps/chamarro/` | Vercel | `larokifarm-chamarro` | farmaciachamarro.es |
| `widgets/cima-chat/` | Cloudflare Pages | **Cuenta empresa** (`larokifarmdigital@gmail.com`, account ID `b541c31a1626d80fb24641caa2ce9d15`) | `larokifarm-cima-chat` |
| `workers/google-resenas/` | Cloudflare Workers | — | Pendiente: rehacer para escribir en Neon (ver Reseñas Google) |

### Flujo de deploy al publicar

El backoffice publica (`PublishFarmaciaUseCase`) y lanza directamente los
deploy hooks de la farmacia (`DEPLOY_HOOKS_<SLUG>`, varias URLs separadas por
coma). Cada hosting re-builda su landing en ~1-2 min leyendo del backoffice.

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
- Las reseñas viven en Neon (`content_resenas`, copiadas una vez de Sanity) y
  las fotos de autores ya están re-alojadas en R2 ("cero cookies").
- Pendiente: sincronización periódica desde la Google Business Profile API →
  Neon (Torrents ahora, Chamarro cuando se active). Plan en
  `docs/plan-resenas-google.md`.

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

Actualizado automáticamente al hacer commit (2026-11-24T12:29:09Z).

- `c5303de` 2026-11-24 — Chore: remove Sanity, content now comes only from the backoffice
- `ef70a1b` 2026-11-24 — Feat(backoffice): simpler user permissions and calmer modals
- `7c50572` 2026-11-24 — Fix(backoffice): simpler list flow, upload and compare in one step
- `004a350` 2026-11-24 — Chore: remove the old standalone Scout app and its worker
- `9039329` 2026-11-24 — Feat(backoffice): bulk price comparison from Excel lists
<!-- auto:recent-commits:end -->
