# Backoffice larokifarm — contexto para Claude Code

Este archivo se carga automáticamente cuando el CWD está dentro de
`apps/backoffice`. Léelo primero en cualquier sesión nueva antes de tocar
archivos — evita re-leer las 500-1000 líneas del editor solo para orientarse.

## Stack

- **Next.js 16** (App Router) · **React 19** · **Tailwind v4**
- **pnpm** (nunca npm — dev server: `pnpm --filter backoffice dev` en `:3001`)
- **Radix UI** (Dialog, Popover, Tooltip, DropdownMenu, Tabs, Select, Switch, Slot)
- **Motion 13** (`import { motion, AnimatePresence } from 'motion/react'`)
- **Tiptap 2** para rich text i18n (Portable Text equivalent en storage: HTML por locale)
- **@dnd-kit** para drag-to-reorder
- **@phosphor-icons/react** — todos los iconos van vía `<NavIcon name="..." />`
- **next-auth v5** (adoptado de conciliador-albaranes)
- Login demo: `admin@larokifarm.com` / `demo1234`

## Paleta y DNA visual (Humblytics-inspired)

Todo en `src/app/globals.css` como CSS vars:
- **`--color-bg`**: `#FAF6F1` crema — reemplaza el blanco puro
- **`--color-ink`**: `#1A0F0A` chocolate — nunca negro puro
- **`--color-accent`**: `#F84A00` naranja Humblytics — reservado para
  **acciones de commitment** (Publicar, Publicar cambios, Nueva farmacia,
  Entrar en el login, botones "Añadir servicio", chip activo del pill nav)
- **`--color-hairline`**: `#E8E1D8` warm — todos los bordes 1px
- **`--shadow-focus`**: `0 0 0 3px var(--color-accent-tint)` — halo naranja soft
  al focus
- **Type**: Inter Tight (todo) + Geist Mono (`.font-mono-tabular` para códigos,
  slugs, times, contadores)
- **Motion**: `cubic-bezier(0.32, 0.72, 0, 1)` — 200ms base, 140ms fast

⚠️ **NUNCA** uses botones negros/chocolate para acciones principales — el
mockup dice ink para "Guardar" (que no aparece porque hay autosave) y accent
naranja para todo lo que compromete.

## Arquitectura del editor de farmacia

Todo en `src/features/farmacias/editor/`. Componentes clave:

### Layout raíz
- **`FarmaciaEditor.tsx`** — orquesta todo. Estado `activeSectionKey`, agrupa
  9 secciones en 4 grupos (Datos / Portada / Contenido / Config). Lógica de
  navegación por grupo + subsección.
- **`EditorTopBar.tsx`** — solo título + chip health + botones acción (desktop).
- **`EditorMobileActionBar.tsx`** — sticky bottom fija en móvil (chip health +
  3 botones). `z-40 + will-change:transform + translateZ(0)` para evitar el
  bug de `fixed` en Safari iOS.
- **`EditorFloatingNav.tsx`** — pill flotante con los **4 grupos** (Datos ·
  Portada · Contenido · Config). `motion.span layoutId` desliza el pill activo.
- **`EditorGroupSegmented.tsx`** — pill secundario sticky con las
  sub-secciones del grupo activo (solo aparece si el grupo tiene >1 sección).
- **`EditorSectionTitle.tsx`** — h2 30px sin numeración (el prop `step` existe
  pero no se renderiza — decisión del usuario 22-09-2026).
- **`EditorSectionSwitcher.tsx`** — AnimatePresence mode="wait" con fade+slide+
  blur para transiciones entre secciones.

### Estado i18n (validación al vuelo)
- **`i18nStatus.ts`** — utilities puras:
  - `computeLocaleStatus(value, locale, activeLocales)` → `'filled' | 'missing' | 'empty'`
  - `countLocaleStatus(farmacia, locale)` — total/filled/missing/empty
  - `countBySection(farmacia)` — mismo desglose agrupado por sección
- **`EditorHealthChip.tsx`** — chip 24×24 (solo dot con ring de color,
  **sin texto**) con Popover al click: cabecera con estado guardado + progreso
  por idioma (barras) + lista de secciones con missings clickables
- **`LangTabs.tsx`** — pestañas de idioma con badge `N/M` + dot rojo mini
  superpuesto cuando hay missing (sin texto "N faltan")
- **`LocaleChip.tsx`** — chip inline al lado de labels multilang, 3 estados
  visuales (filled naranja / missing rojo con dot / empty gris)

### Inputs multilang
- **`MultilangInput.tsx`** / **`MultilangTextarea.tsx`** — computan status
  automáticamente y pasan al LocaleChip. Casi todos los campos i18n del
  editor pasan por aquí.
- **`TiptapField.tsx`** — para descripcionLarga, avisoLegal, politicaPrivacidad.
- **`TextosCabeceraFields.tsx`** — trío `chip / titulo / subtitulo` i18n
  reutilizable para Servicios/FAQs/Reseñas.

### Componentes UI reutilizables (en `src/components/ui/`)
- **`Button.tsx`** — variantes `primary` (ink), `secondary` (blanco+border),
  `ghost`, **`accent`** (naranja — LA importante), `danger`, `link`.
- **`IconInput.tsx`** — input con icono adornment a la izquierda. **Focus
  arreglado** con `focus-within:!border-accent focus-within:[box-shadow:...]`
  para que gane a hover, y `style={{ outline: 'none' }}` en el input hijo para
  cancelar el `:focus-visible` global. NO tocar sin entender esto.
- **`TimePicker.tsx`** — popover con 2 columnas Hora/Min scrollables (steps
  de 15 min por defecto). Custom, sin librería. Usa `.scrollbar-thin` de
  globals.css (3px webkit, thin firefox).
- **`SectionHeader.tsx`** — h3 15px 600 + hint muted 12.5px, no eyebrow
  numérico. Puede recibir `actions` a la derecha.
- **`LabelHelpIcon.tsx`** — reemplaza los `<p class="help">…</p>` por icono ⓘ
  con tooltip Radix. Se usa dentro del `hint` prop de `Label`.
- **`Label.tsx`** — required se marca con `*` naranja pequeño (no chip mono).
- **`Modal.tsx`** — 560px centrado (patrón lista+modal para Servicios, FAQs,
  Hero tarjetas, Features).
- **`IconPicker.tsx`** — grid de iconos por categorías para Servicios/Hero/Features.

### Tabs del editor (todos en `tabs/`)
| Grupo | Tab | Sanity fields cubiertos |
|---|---|---|
| Datos | `GeneralTab` | nombre, slug, logo, titular, colegiado, contacto, redes, direccion, googleMapsUrl, mapaUrl, horarios (via `HorarioSemanal`) |
| Portada | `HeroTab` | heroChip, heroSubtitulo, descripcionCorta, heroImages, heroTarjetasFlotantes |
| Portada | `FeaturesTab` | featuresLista (max 6, icono "reloj"→autohorario) |
| Contenido | `SobreTab` | sobreNosotros (chip/titulo/anyosExperiencia/puntos), descripcionLarga, imagenesSobre |
| Contenido | `ServiciosTab` | textosServicios + servicios[] con enlace {url, nuevaPestana} |
| Contenido | `FaqsTab` | textosFaqs + faqs[] |
| Contenido | `ResenasTab` | textosResenas + googleLocationName + googleMapsUrl + preview read-only. **NO CRUD** — las reseñas vienen de Google via Worker |
| Config | `LegalTab` | avisoLegal + politicaPrivacidad (Tiptap i18n con FallbackNote) |
| Config | `SeoTab` | seo.title, seo.description, seo.ogImage + preview Google |

### Horario semanal
- **`HorarioSemanal.tsx`** — fila compacta por día con expand inline. Cada
  tramo es una card con label "TRAMO N", duración calculada (`4h 30min`),
  Abre/Cierra + TimePicker, botón Eliminar textual. Botón "Añadir tramo"
  dashed. Menú "Copiar de…" con dropdown de días con horarios.
- Constante `HORARIO_TIPICO` en `GeneralTab.tsx` para el botón "Plantilla
  típica" (rellena L-V 9-14/17-20:30, Sáb 9:30-14, Dom cerrado).

## Cobertura Sanity actual: 100%

Todos los campos editables del schema `studio/schemas/farmacias/farmacia.ts`
tienen UI en el backoffice. Tipos en `src/types/content.ts`.

Diferencias schema vs UI documentadas:
- **Redes sociales** — backoffice tiene `x` y `youtube` extra (Sanity solo
  ig/fb/tiktok). Mantener por si el cliente las quiere en el futuro.
- **Horarios** — backoffice permite 2 tramos por día (Sanity 1). El
  backoffice es más rico; al mapear a Sanity flatten al primer tramo o
  ampliar el schema.

## Decisiones UI/UX acordadas (usar en cualquier iteración)

1. **Naranja = commitment**. Nunca botones negros para publicar/entrar/crear.
2. **Section title sin numeración** (`01 · General` fue quitado 22-09-2026).
3. **Nav: pill flotante bottom con 4 grupos** (no single-scroll, no sidebar).
4. **En móvil: 3 stickies apilables** — TopBar → segmented sub-nav (si aplica)
   → LangTabs (si es multilang). Action bar bottom SIEMPRE fija (`z-40 +
   will-change`).
5. **Chip health = solo dot con anillo de color**. Popover con detalle.
6. **LangTabs con dot rojo mini** cuando hay missing, sin texto "N faltan".
7. **Required = asterisco `*` naranja**, no chip `OBLIGATORIO`.
8. **`<p class="help">` → `LabelHelpIcon` con tooltip** — la ayuda pesa cero
   cuando no la necesitas.
9. **Screenshots evitados** por consumo de tokens. Verificar con
   `browser_snapshot` (accessibility tree, text) o `browser_evaluate`.

## Fases del roadmap

- **Fase 1**: Hero + Features ✅
- **Fase 2**: Sobre nosotros estructurado + Legal ✅
- **Fase 3**: Textos cabecera Servicios/FAQs + mapaUrl + imagenOg ✅
- **Fase 4 (parcial)**: Validación i18n visible (Health chip + LocaleChip por
  estado + LangTabs con dot rojo mini superpuesto) ✅
- **Extras 22-09-2026**: TimePicker custom, HorarioSemanal rediseñado (card
  por tramo + duración calculada), IconInput con focus arreglado, Label con
  asterisco naranja para required, `.scrollbar-thin` utility ✅
- **Infra de contexto**: hook `PostToolUse` en `.claude/settings.json` que
  actualiza sección `## Cambios recientes` al hacer commit + skill global
  `/handoff` para cerrar sesiones con contexto persistido ✅
- **Pendientes**:
  - Persistencia real en Neon (server actions ya están, falta conectar el
    save) — se comparte DB con conciliador-albaranes, el `Business` del
    conciliador se **extiende** a `Farmacia`, NO se renombra
  - Wizard `Nueva farmacia` en `/farmacias/nueva` (nombre + slug + idiomas
    activos + ciudad, mínimo viable antes de mandar al editor completo)
  - Bloquear/confirmar "Publicar cambios" si `totalMissing > 0`
  - Worker de sincronización de reseñas Google (fuera del backoffice)

## Cómo trabajar en este proyecto

1. **Al empezar sesión** en el backoffice: leer este archivo. NO re-leer los
   tabs enteros para orientarse.
2. **Cambios de UI**: revisar la sección "Decisiones UI/UX acordadas" antes.
3. **Añadir componente nuevo**: preferir extender los reutilizables de
   `components/ui/` antes de crear otro.
4. **Verificación visual**: `browser_snapshot` (barato) > `browser_evaluate`
   (barato) > screenshots (caro, evitar).
5. **Al terminar cambios significativos**: actualizar este archivo (sección
   correspondiente + añadir a "Fases del roadmap" si aplica).

## Convenciones código

- pnpm siempre. Nunca npm.
- Nunca `Co-Authored-By: Claude` en commits (regla `git-commit-push`).
- Nunca commit/push sin permiso explícito del user.
- Español peninsular (no rioplatense).
- Comentarios: por defecto NO. Solo cuando el WHY es no obvio.
- Types en `src/types/content.ts` — hay que mantenerlos sincronizados con
  el schema Sanity real (`studio/schemas/farmacias/farmacia.ts`).
