# apps/chamarro — contexto para Claude Code

Landing pública de **Farmacia Chamarro** (cliente real). Mismo patrón que
`apps/torrents` pero con identidad propia (verde + blanco en vez de azul).

## Stack

- **Astro** (SSG + islas), Tailwind v4
- **Backoffice**: contenido en build desde su API pública (`BACKOFFICE_URL`;
  `src/lib/contenido.ts` → `src/lib/backoffice.ts`). Sanity retirado 24-11-2026.
- **Vercel** (analytics + hosting)
- **cima-chat** embebido vía `<script src="…pages.dev/cima-chat.iife.js">`
- **i18n**: catálogo de 9 idiomas, `es` por defecto; solo los activos de la farmacia generan rutas `[...lang]` (ver «Idiomas»)

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

## Identidad visual — "Moderna y clínica" (rediseño 19-11-2026)

Tokens en `src/styles/global.css`. (La alternativa "Con historia" —serif,
crema, arcos— quedó guardada en la rama local `diseno/chamarro-con-historia`.)

- **Fuente única**: Manrope; títulos 800 con tracking muy apretado. `<em>` en
  títulos = verde `--primary` (lima `--brand-lime` sobre bloques verdes).
- **Paleta**: blanco + gris frío `--canvas-alt #F2F6F3`; bloques en verde
  intenso `--green #0F6B3C`; footer `--ink #0B1510`; CTA `--primary #12804A`
  (AA). Lima del logo `--brand-lime` como acento sobre verde/oscuro.
- **Bento**: `.tile` (tarjeta base), `.tile-soft` (gris), `.tile-green`
  (bloque verde, ajusta títulos/eyebrow), `.tile-ink`. Botones `.btn-light` /
  `.btn-outline-light` para fondos verdes.
- **Hero**: bloque verde grande con titular + ventajas; a la derecha foto
  (carrusel) y tarjeta con estado "Abierto ahora / Cerrado" REAL calculado en
  el navegador con la hora de Madrid a partir de `horarios`.
- **Servicios**: el 1º va destacado en verde (2 filas en escritorio).
- **FAQs**: `<details>` nativo (funciona sin JS) + JS que anima apertura y
  CIERRE (`data-expanded`) y fija `min-height` de la lista con la respuesta
  más larga: abrir/cerrar no desplaza el resto de la página.
- **Fotos sin recorte**: `FotoMarco.astro` muestra la foto entera (contain) y
  rellena el hueco con la misma foto desenfocada. Úsalo para cualquier foto
  subida desde el backoffice (proporciones variables).
- **About**: usa la ÚLTIMA foto de "imágenes sobre" como principal para no
  repetir la que abre la portada; tarjeta verde con los años.
- **Ritmo**: Hero/Ventajas (blanco) → Servicios (gris) → La farmacia (blanco)
  → FAQs (gris) → Contacto (blanco) → Footer (ink).

## Favicon + PWA

Archivos en `public/`:
- `favicon.svg` — cruz verde con gradiente (vectorial, canónico).
- `favicon-32.png` — fallback 32×32.
- `apple-touch-icon.png` 180×180 — fondo blanco (iOS no admite transparencia).
- `icon-192.png` / `icon-512.png` — PWA Android, transparente.
- `icon-512-maskable.png` — fondo blanco + ~20% safe zone (Android adaptativo).
- `manifest.webmanifest` — `theme_color: #44A460`, 4 íconos declarados.
- `logo.png` 400×400 — **NO es favicon**; es el logo visible en Header/Footer
  cuando el backoffice no entrega uno (fallback de `logoUrl` en Header.astro:30 y
  Footer.astro:31).

El `BaseLayout.astro` enlaza: `favicon.svg`, `favicon-32.png`,
`apple-touch-icon.png`, `manifest.webmanifest`, `theme-color #44a460`.

## Componentes

- `Hero.astro` — carrusel 6 imágenes, word-by-word reveal, kickers flotantes
  (pastilla "Abierto ahora" con dot pulsante + chip Manrope italic).
- `About.astro` — grid imagen + texto, badge años experiencia flotante.
- `Servicios.astro`, `Features.astro`, `Contacto.astro`, `Faqs.astro`,
  `ResenasGoogle.astro` — bloques editoriales con reveal en scroll.
- `IconoServicio.astro` — set de iconos SVG inline.

## Reglas que ya se rompieron una vez

- **Falsa señal de clic**: nada que NO sea enlace/botón puede tener hover de
  tarjeta (levantar, borde de color) ni forma de píldora/botón. Pasó con las
  ventajas, las cajitas del hero y los puntos de About (19-11-2026).
- **Accesibilidad verificada con axe** (wcag2a/aa + best-practice): 0
  incidencias en `/`, `/ca/`, `/en/` y páginas legales. Mantener: texto tenue
  sobre verde ≥ `--on-green-muted` (0.88), `--whatsapp #15803D` (el oficial
  #1FAF38 con texto blanco no llega a 4,5:1), anillo de foco lima sobre fondos
  verdes/oscuros, logos con `alt=''` (el nombre va al lado), zonas táctiles ≥24px.

- **CSS fuera de `@layer`**: una regla sin capa pisa a las utilidades de
  Tailwind. `.link-anim` tenía `color: inherit` fuera de capa y los enlaces del
  footer salían oscuros sobre fondo oscuro (contraste 1,1:1). Las clases de
  componente van dentro de `@layer components`.

- **Sticky headers en secciones**: NO poner `sticky top-X` en el `<header>` de
  una sección si el contenido lateral es scrollable (ej. FAQs). Se ve raro al
  hacer scroll porque el título se queda clavado mientras la lista sigue.
  Removido en Faqs.astro.
- **Badges estirados en flex-col**: cuando un `section-eyebrow` va dentro de
  un flex column sin `self-start`, se estira. Ya está arreglado globalmente
  con `align-self: flex-start` + `width: fit-content` en `.section-eyebrow`
  — no hay que añadir `self-start` por componente.

## Motion system

Toda la motion vive en `src/styles/global.css`:
- `[data-reveal]` — fade + translate on scroll (sin blur) (IntersectionObserver
  global en BaseLayout).
- `[data-reveal-word]` — word-stagger para el hero.
- `.motion-float` — levitación 9s loop.
- `.motion-pulse` — dot pulsante (badges, status).
- `.spotlight` — border radial cursor-tracked en cards (verde deep).
- `.motion-marquee` — loop infinito horizontal.
- `.motion-magnetic` — lift sutil al hover.

Todo respeta `prefers-reduced-motion: reduce`.

## Navegación, páginas legales y pie (22-11-2026)

- **Transición entre páginas**: View Transitions entre documentos solo con CSS
  (`@view-transition { navigation: auto }` en `global.css`), sin ClientRouter.
  La cabecera tiene `view-transition-name`; el footer NO (cambia de posición
  entre páginas y "volaría"). Desactivada con `prefers-reduced-motion`.
- **`LegalPage.astro`**: componente común de aviso legal y privacidad. Quita el
  `<h1>` del CMS (el título sale de i18n), da id a cada `<h2>` y monta el
  índice "En esta página" (sticky ≥960px, `<details>` en móvil). Sin fecha de
  actualización (no hay dato fiable). Funciona sin JS.
- **Horario compartido**: `src/lib/estadoHorario.ts` (cálculo en navegador,
  hora de Madrid) + `estadoHorarioDatos.ts` (datos del build). Lo usan Hero y
  Footer; no duplicar la lógica.
- **Footer** (22-11-2026, misma distribución que el de Torrents con la
  identidad de Chamarro): fondo `--ink`, texto blanco / `--on-green-muted`,
  líneas `--green-line`, lima de acento, títulos de columna en mono pequeño.
  4 columnas (1.1fr 1.3fr 1fr 1fr ≥1024px; 2 columnas ≥768px; apiladas en
  móvil): Marca (logo, nombre, descripción corta, redes si hay) · Horario
  (pastilla "Abierto ahora" con `estadoHorario.ts` + días ↔ horas con línea
  discontinua) · Dónde estamos (dirección sin repetir ciudad/provincia +
  botón píldora "Cómo llegar") · Contacto (teléfono, WhatsApp, email con
  iconos; el email solo se parte tras la @) → línea "Explora la web" →
  barra inferior (©, titular · nº col., legales). SIN "Web sin cookies"
  (Chamarro usa Vercel Analytics y el chat). Sin URL de la propia web.
  Foco lima por `.footer :focus-visible` en `global.css`.
