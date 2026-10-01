# apps/chamarro — contexto para Claude Code

Landing pública de **Farmacia Chamarro** (cliente real). Mismo patrón que
`apps/torrents` pero con identidad propia (verde + blanco en vez de azul).

## Stack

- **Astro** (SSG + islas), Tailwind v4
- **Sanity** workspace `farmacias` (schema compartido con Torrents, source of
  truth en `studio/schemas/farmacias/farmacia.ts`)
- **Vercel** (analytics + hosting)
- **cima-chat** embebido vía `<script src="…pages.dev/cima-chat.iife.js">`
- **i18n**: `es` (defecto), `ca`, `en` — rutas `[...lang]`

## Identidad visual

- **Fuente única**: Manrope 300–800 (via Google Fonts). Los tres vars CSS
  (`--font-sans`, `--font-serif`, `--font-mono`) apuntan todos a Manrope para
  que componentes legados que usan `font-serif`/`font-mono` hereden sin tocar.
- **Paleta**: blanco + 3 verdes del logo:
  - `--brand-deep: #44A460` (CTA, primary, success)
  - `--brand-mid: #6DC261` (accent)
  - `--brand-lime: #C8E845` (highlights, ambient background)
- **Headings**: Manrope 700 con letter-spacing apretado. `<em>` dentro de
  h-display/h-section se pinta con **gradiente verde clipeado al texto**
  (`background-clip: text`) — es el ancla visual al logo.
- **Badges** (`.section-eyebrow` y `.chip`): píldora verde suave con borde,
  punto verde pulsante al inicio, hover magnético. `.section-eyebrow` siempre
  es `fit-content` globalmente (no necesita `self-start` por componente).

## Favicon + PWA

Archivos en `public/`:
- `favicon.svg` — cruz verde con gradiente (vectorial, canónico).
- `favicon-32.png` — fallback 32×32.
- `apple-touch-icon.png` 180×180 — fondo blanco (iOS no admite transparencia).
- `icon-192.png` / `icon-512.png` — PWA Android, transparente.
- `icon-512-maskable.png` — fondo blanco + ~20% safe zone (Android adaptativo).
- `manifest.webmanifest` — `theme_color: #44A460`, 4 íconos declarados.
- `logo.png` 400×400 — **NO es favicon**; es el logo visible en Header/Footer
  cuando Sanity no entrega uno (fallback de `logoUrl` en Header.astro:30 y
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
- `[data-reveal]` — fade + blur + translate on scroll (IntersectionObserver
  global en BaseLayout).
- `[data-reveal-word]` — word-stagger para el hero.
- `.motion-float` — levitación 9s loop.
- `.motion-pulse` — dot pulsante (badges, status).
- `.motion-ambient` — radial gradients verde drift en fondo (`opacity: 0.18`).
- `.spotlight` — border radial cursor-tracked en cards (verde deep).
- `.motion-marquee` — loop infinito horizontal.
- `.motion-magnetic` — lift sutil al hover.

Todo respeta `prefers-reduced-motion: reduce`.
