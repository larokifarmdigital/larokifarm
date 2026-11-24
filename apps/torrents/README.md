# Landing de farmacia — Larokifarm

Template multi-tenant en Astro 5 + Tailwind 4. **Un único código sirve varias farmacias** (Torrents, Laguna, …): el slug de la farmacia se inyecta por env var en cada deploy y el build lee su contenido de la API pública del backoffice (`GET /api/public/farmacias/:slug`, solo farmacias publicadas).

## Stack

- **Astro 5** (output `static`)
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **Nunito** (Google Fonts)
- **Backoffice** como fuente de contenido (`src/lib/contenido.ts` → `src/lib/backoffice.ts`) y `@larokifarm/contenido` para i18n de campos, horarios y texto enriquecido
- **pnpm** como package manager (pinned en `packageManager`)

## Variables de entorno

**Todas son requeridas.** Si falta alguna, el build aborta con un mensaje claro. No hay fallbacks hardcoded — el código exige que estén definidas en `.env` (local) o en las Environment variables del hosting (producción).

| Variable | Para qué sirve |
|---|---|
| `PUBLIC_FARMACIA_SLUG` | Identificador de la farmacia en el backoffice. Define qué farmacia carga este deploy (`torrents`, `laguna`, …). |
| `SITE_URL` | URL pública del sitio (sin barra final). Se usa para canonical, sitemap, Open Graph, JSON-LD. |
| `BACKOFFICE_URL` | Backoffice del que se lee el contenido en build (en producción, el de Vercel). |

Para desarrollo local: `cp .env.example .env` y rellena.

## Scripts

```
pnpm install
pnpm dev       # dev server localhost:4321
pnpm build     # genera dist/
pnpm preview   # sirve dist/ localmente
pnpm check     # astro check
```

## Despliegue

Cada farmacia es un **proyecto separado en Vercel** (hoy `larokifarm-torrents`, www.farmaciapediatrica.com) conectado al mismo repo y diferenciado por env vars (`PUBLIC_FARMACIA_SLUG`, `SITE_URL`, `BACKOFFICE_URL`). Root Directory `apps/torrents`, build `pnpm build`, output `dist`.

### Nueva farmacia con este template

1. Backoffice: crear la farmacia (identificador `laguna`, etc.), rellenarla y publicarla.
2. Vercel: nuevo proyecto conectado al repo con sus env vars y su dominio.
3. Backoffice: añadir su deploy hook en `DEPLOY_HOOKS_<SLUG>` (Vercel del backoffice) para que «Publicar cambios» redespliegue la web.

## Rebuild al publicar

El HTML es estático: los cambios no se ven hasta el siguiente build. Al pulsar «Publicar cambios» en el backoffice se lanzan los deploy hooks de esa farmacia (`DEPLOY_HOOKS_<SLUG>`, varias URLs separadas por coma) y cada hosting re-builda en 1-2 min.

## Seguridad de dependencias

`.npmrc` configura `minimum-release-age=4320` (3 días) como mitigación de ataques de supply chain en npm. Excepciones explícitas: `yaml`, `@types/node`.
