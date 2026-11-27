# apps/torrents — contexto para Claude Code

Landing pública de **Farmàcia Pediàtrica Torrents** (Astro SSG + Tailwind v4).
Contenido en build desde la API pública del backoffice (`BACKOFFICE_URL`;
`src/lib/contenido.ts` → `src/lib/backoffice.ts`). Se despliega en Vercel
(`larokifarm-torrents`, www.farmaciapediatrica.com). Mismo patrón que `apps/chamarro` (ver su CLAUDE.md).

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

## Navegación, páginas legales y pie (22-11-2026)

- **Transición entre páginas**: View Transitions entre documentos solo con CSS
  (`@view-transition` en `global.css`, sin ClientRouter ni JS). El contenido se
  funde y sube; la cabecera (`view-transition-name: cabecera`) no se mueve. El
  pie NO lleva nombre: cambia de posición entre páginas y "volaría". Sin
  animación con `prefers-reduced-motion`.
- **Páginas legales**: `components/LegalPage.astro` (las dos rutas son finas).
  Cabecera con miga de pan + título traducido; el `<h1>` del CMS se quita
  (`prepararTextoLegal` en `lib/legal.ts`, que también pone `id` a los `<h2>`
  para el índice: fijo en escritorio, `<details>` en móvil). Al final, tarjeta
  al otro texto legal, "Volver al inicio" y "Volver arriba". Sin JS.
- **Pie**: marca + "Web sin cookies ni rastreadores", horario con estado
  "Abierto ahora / Cerrado" (hora de Madrid, en el navegador; oculto sin JS),
  dirección con "Cómo llegar" (enlace externo a `googleMapsUrl` o búsqueda por
  dirección: nada de mapas incrustados), contacto, enlaces de la web y barra
  inferior con titular, nº colegiado y textos legales. Columnas sin datos no se
  pintan. Prop `mapsUrl`.

## Accesibilidad: patrones fijados (auditoría 22-11-2026)

- **Reveal sin JS**: las reglas `[data-reveal]` / `[data-reveal-word]` de
  `global.css` van dentro de `@media (scripting: enabled)`; sin JS todo se ve.
- **Movimiento automático (WCAG 2.2.2)**: todo carrusel o cinta que se mueve
  solo tiene botón de pausa (Slider del hero/About, Servicios móvil, cinta de
  reseñas en escritorio). Si la persona interactúa (punto, arrastre, pausa) el
  autoplay NO se reanuda solo. Con `prefers-reduced-motion` no hay autoplay ni
  botón de pausa.
- **Carruseles**: el clon del bucle infinito lleva `inert` + `aria-hidden`; en
  móvil solo la tarjeta visible es enfocable; en escritorio, el foco por Tab
  mueve el carrusel a la tarjeta y anula el scroll nativo del contenedor.
- **FAQs**: con movimiento reducido se cierran sin esperar `transitionend`.
- **Cabecera**: Escape cierra menú móvil e idioma y devuelve el foco al botón;
  las etiquetas abrir/cerrar salen de i18n (`data-label-*`).
- **Mapa clic-para-cargar**: aviso de cookies enlazado con `aria-describedby`,
  foco al iframe tras cargarlo y `<noscript>` con enlace a Google Maps.
- **Textos de la UI**: nada fijo en castellano en componentes (skip link,
  CTAs, puntos del slider); todo por `t()`. Reseñas con `lang` por comentario
  cuando la API trae `comentarioIdioma`.

## Vista previa del editor (27-11-2026)

- `src/pages/vista-previa.astro` (`prerender = false`, adaptador
  `@astrojs/vercel`; el resto de la web sigue siendo estática): la página de
  inicio con lo GUARDADO en el backoffice, aunque no esté publicado.
- Solo con `?t=<enlace firmado>` que pone el editor; lo comprueba el backoffice
  (`/api/vista-previa/farmacias/:slug`). La landing no guarda ningún secreto.
- Solo se ve dentro de un iframe del backoffice: `frame-ancestors` con el origen
  de `BACKOFFICE_URL` (cabecera de la página) y en `vercel.json` la ruta va sin
  `X-Frame-Options`. `noindex`, `no-store`, fuera del sitemap, sin analítica ni
  chat. Los enlaces no navegan.
- `PaginaInicio.astro` es la página de inicio compartida por `[...lang]/index`
  y la vista previa. Ajustes puros (reseñas sí/no, chat) en `lib/ajustes.ts`:
  `feature-flags.ts` y `chat.ts` leen lo PUBLICADO al cargarse, la vista
  previa no los importa.
- Resaltado: `?seccion=<clave del editor>&etiqueta=<nombre>` o postMessage
  `{ tipo: 'larokifarm:seccion', seccion, etiqueta }` desde el origen del
  backoffice; al cargar avisa `{ tipo: 'larokifarm:lista' }`. Mapa clave →
  sección (`#inicio`, `#puntos-fuertes`, `#servicios`, `#sobre`, `#resenas`,
  `#faqs`, `#contacto`, pie) en el script de la página.
- `?pagina=aviso-legal|politica-privacidad` pinta `LegalPage` (props
  `mostrarResenas` y `vistaPrevia`) en vez del inicio; la sección `legal`
  resalta `main.legal`.
