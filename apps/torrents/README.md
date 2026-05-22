# Landing de farmacia — Larokifarm

Template multi-tenant en Astro 5 + Tailwind 4. **Un único repo sirve varias farmacias** (Torrents, Laguna, …): el slug de la farmacia se inyecta por env var en cada deploy, y el código consulta a Sanity el documento correspondiente.

Contenido editable desde Sanity (proyecto `yovi040n`, dataset `calendario`, schema `farmacia`). El studio centralizado vive en `larokifarm/studio` y soporta todas las farmacias como documentos independientes.

## Stack

- **Astro 5** (output `static`)
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **Nunito** (Google Fonts)
- **@sanity/client** para leer contenido en build time
- **pnpm** como package manager (pinned en `packageManager`)

## Variables de entorno

**Todas son requeridas.** Si falta alguna, el build aborta con un mensaje claro. No hay fallbacks hardcoded — el código exige que estén definidas en `.env` (local) o en las Environment variables del hosting (producción).

| Variable | Para qué sirve |
|---|---|
| `PUBLIC_FARMACIA_SLUG` | Slug del documento Farmacia en Sanity. Define qué farmacia carga este deploy (`torrents`, `laguna`, …). |
| `SITE_URL` | URL pública del sitio (sin barra final). Se usa para canonical, sitemap, Open Graph, JSON-LD. |
| `PUBLIC_SANITY_PROJECT_ID` | Project ID de Sanity. |
| `PUBLIC_SANITY_DATASET` | Dataset de Sanity. |

Para desarrollo local: `cp .env.example .env` y rellena.

## Scripts

```
pnpm install
pnpm dev       # dev server localhost:4321
pnpm build     # genera dist/
pnpm preview   # sirve dist/ localmente
pnpm check     # astro check
```

## Despliegue (Cloudflare Pages)

Cada farmacia es un **proyecto separado en Cloudflare Pages**, conectado al **mismo repo**, diferenciado por env vars.

### Primera farmacia (Torrents)

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → seleccionar este repo.
2. Configuración del build:
   - **Framework preset**: Astro (auto-detectado).
   - **Build command**: `pnpm build`
   - **Output directory**: `dist`
   - **Production branch**: `main`
3. Environment variables (Settings → Environment variables → Production):
   - `NODE_VERSION = 20`
   - `PUBLIC_FARMACIA_SLUG = torrents`
   - `SITE_URL = https://torrentsfarmacia.com`
4. Save and Deploy.
5. Custom domain: Pages → tu proyecto → Custom domains → Add → `torrentsfarmacia.com` y `www.torrentsfarmacia.com`.

### Segunda farmacia (Laguna, etc.)

1. Sanity: crear documento *Farmacia* con `slug = "laguna"` desde el studio (workspace **Contenido editorial**).
2. Cloudflare: nuevo proyecto Pages conectado al **mismo repo** con env vars:
   - `PUBLIC_FARMACIA_SLUG = laguna`
   - `SITE_URL = https://lagunafarmacia.com`
3. Custom domain en su proyecto Pages.

Cada `git push origin main` dispara build de **todos los proyectos Cloudflare** conectados al repo, cada uno con sus env vars → cada landing actualizada con sus datos.

## Rebuild automático al editar en Sanity

Como Cloudflare Pages sirve HTML estático, los cambios en Sanity no se ven hasta que se rebuildea. Para automatizar:

1. Cloudflare Pages → tu proyecto → Settings → Builds & deployments → Deploy hooks → Add (`sanity-rebuild`). Cloudflare te genera una URL.
2. Sanity ([sanity.io/manage](https://sanity.io/manage) → proyecto → API → Webhooks) → Create webhook:
   - URL: la del paso anterior.
   - Dataset: `calendario`.
   - Trigger on: Create, Update, Delete.
   - Filter (recomendado): `_type == "farmacia" && slug.current == "torrents"` (sustituye `"torrents"` por el slug del deploy correspondiente).

Repite por cada deploy con su slug.

## Seguridad de dependencias

`.npmrc` configura `minimum-release-age=4320` (3 días) como mitigación de ataques de supply chain en npm. Excepciones explícitas: `yaml`, `@types/node`.
