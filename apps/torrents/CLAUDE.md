# apps/torrents — contexto para Claude Code

Landing pública de **Farmàcia Pediàtrica Torrents** (Astro SSG + Tailwind v4).
Contenido desde el backoffice (`CONTENT_SOURCE=backoffice`) o Sanity. Se
despliega en Cloudflare Pages (dominio personal) y Vercel (dominio del
cliente). Mismo patrón que `apps/chamarro` (ver su CLAUDE.md).

## Idiomas (catálogo cerrado, 21-11-2026)

- Catálogo en `src/lib/i18n.ts` (`LOCALES_DISPONIBLES`): es, en, ca, fr, de,
  it, pt, eu, gl — el mismo que el backoffice (`core/shared/domain/i18n.ts`).
  Textos fijos en `src/i18n/<código>.json` (mismas claves que `es.json`;
  comprobarlo al añadir claves). El castellano es la raíz (`/`) y la reserva.
- Solo se generan las rutas `[...lang]` de los idiomas ACTIVOS de la farmacia
  (`idiomasActivos` de la API). `localesActivos()` alimenta el selector de
  idioma del Header y los `hreflang` / `og:locale:alternate` del BaseLayout
  (prop `idiomas`).
- Idiomas del catálogo NO activos (p. ej. uno desactivado en el backoffice):
  `integraciones/redirecciones-idiomas.mjs` (hook `astro:build:done`) escribe
  `_redirects` con 301 a la raíz (Cloudflare Pages) y una página HTML con meta
  refresh + canonical + noindex por ruta (Vercel y cualquier hosting estático).
  No entran en el sitemap.
- `DIAS_POR_IDIOMA` / `CERRADO_POR_IDIOMA` (en `src/lib/i18n.ts`) para los
  horarios; textos legales por defecto solo en es/en/ca, el resto cae al
  castellano (`legalPorDefecto`).
