# Larokifarm — Monorepo

Monorepo de Larokifarm: landings de farmacias, calendario de vacunación compartido, widget de chat Cima, herramientas internas (conciliador de albaranes) y Sanity Studio.

## Estructura

```
larokifarm/
├── apps/                              Sitios y herramientas standalone (cada una con dominio o deploy propio)
│   ├── calendario-vacunas/            Sitio Astro del calendario por CCAA
│   ├── conciliador-albaranes/         Herramienta interna Next.js (PDF + Excel)
│   └── torrents/                      Landing Astro de Farmacia Torrents
├── packages/                          Código compartido entre apps (sin deploy propio)
│   ├── calendario-vacunas/            Componentes Astro + Sanity del calendario reusables
│   ├── i18n-utils/                    Primitives de i18n (lookup JSON, interpolación, traductor)
│   └── sanity-client/                 Cliente Sanity + helpers (i18n de campos, Portable Text, horarios, imágenes)
├── widgets/                           Componentes embebibles en sitios externos
│   └── cima-chat/                     Widget IIFE Preact + Worker de sync
├── workers/                           Cloudflare Workers
│   └── sanity-fanout/                 Webhook fanout de Sanity hacia varios Pages
├── studio/                            Sanity Studio (workspaces: cima-chat, calendario-vacunas, farmacias)
└── docs/                              Documentación transversal (runbooks, integraciones externas)
```

## Requisitos

- Node `>=20`
- pnpm `>=10` (gestor canónico del repo)

```bash
pnpm install   # instala todo desde la raíz
```

## Comandos día a día

```bash
# Dev de un proyecto concreto
pnpm --filter torrents dev
pnpm --filter calendario-vacunas dev
pnpm --filter conciliador-albaranes dev
pnpm --filter cima-chat dev

# Build (Turbo resuelve el orden de dependencias)
pnpm exec turbo run build --filter=torrents
pnpm exec turbo run build              # todos

# Comprobación de tipos en todos los proyectos
pnpm check

# Sanity Studio
pnpm studio
```

Los scripts canónicos por proyecto son `dev`, `build`, `check` y `preview` (cuando aplique). Cualquier proyecto nuevo debe respetar esos nombres para que Turbo y los comandos raíz lo enganchen sin configuración extra.

## Despliegue

| Proyecto                       | Plataforma           | Build command                                                         | Output             |
| ------------------------------ | -------------------- | --------------------------------------------------------------------- | ------------------ |
| `apps/torrents`                | Cloudflare Pages     | `pnpm exec turbo run build --filter=torrents`                         | `apps/torrents/dist` |
| `apps/calendario-vacunas`      | Cloudflare Pages     | `pnpm exec turbo run build --filter=calendario-vacunas`               | `apps/calendario-vacunas/dist` |
| `apps/conciliador-albaranes`   | Cloudflare (OpenNext) | `pnpm --filter conciliador-albaranes cf:deploy`                       | (Wrangler)         |
| `widgets/cima-chat`            | Cloudflare Pages     | `pnpm --filter cima-chat build`                                       | `widgets/cima-chat/dist` |
| `workers/sanity-fanout`        | Cloudflare Workers   | `pnpm --filter @larokifarm/sanity-fanout deploy`                      | (Wrangler)         |
| `studio`                       | Sanity (`*.sanity.studio`) | `pnpm --filter larokifarm-studio deploy`                        | —                  |

Cada Pages apunta a la raíz del monorepo con el build command de la tabla; los Workers y el Studio se despliegan con `wrangler` / `sanity deploy` desde su carpeta.

## Cómo crece el monorepo

Esta sección es el contrato implícito al añadir cualquier proyecto nuevo. Lo importante es elegir bien la carpeta y los scripts; el resto sale solo.

### Árbol de decisión: ¿dónde va?

1. **¿Tiene dominio o URL propia (sitio público, app interna, panel)?** → `apps/`
2. **¿Se embebe en sitios externos (script en HTML de terceros)?** → `widgets/`
3. **¿Es un Cloudflare Worker (cron, webhook, edge handler)?** → `workers/`
4. **¿Lo importan ≥2 proyectos del repo y no se deploya por sí solo?** → `packages/`
5. **¿Es Sanity Studio?** → `studio/` (un solo Studio con varios workspaces; no se crean studios paralelos)

Si dudas entre `apps/` y `packages/`: si sirve tráfico, es app; si solo aporta código, es package.

### Stack permitido por categoría

| Categoría    | Stack por defecto                                  | Cuándo desviarse |
| ------------ | -------------------------------------------------- | ---------------- |
| `apps/` (landing, sitio de contenido) | Astro 5 + Tailwind 4                      | No desviarse — Astro es la elección estándar para SSG/contenido. |
| `apps/` (webapp con lógica fuerte, dashboard, herramienta interna) | Next.js 15 (App Router) + Tailwind 4 | Solo si el caso es claramente SPA/SSR no factible en Astro. |
| `widgets/`   | Preact + Vite (library mode) + Shadow DOM          | Modelo de referencia: `widgets/cima-chat`. Mantener el bundle pequeño y aislado. |
| `packages/`  | TypeScript puro o Astro components, sin build step si es posible | Solo añadir build si el consumo lo exige. |
| `workers/`   | Cloudflare Workers + Wrangler                      | — |
| `studio/`    | Sanity 5 con workspaces                            | No crear nuevos studios — añade un workspace al existente. |

Versiones: TypeScript `^5.9.2` y Tailwind `^4.3.0` en todos los proyectos (mantener el repo alineado).

### Convención de naming

- **Carpeta**: kebab-case (`apps/nueva-farmacia`, `widgets/buscador-medicamentos`).
- **`package.json#name`**:
  - Apps no compartibles: nombre plano (`torrents`, `calendario-vacunas`, `conciliador-albaranes`).
  - Packages, widgets compartibles y workers reusables: `@larokifarm/<nombre>` (`@larokifarm/sanity-client`, `@larokifarm/i18n-utils`, `@larokifarm/sanity-fanout`).
- **Filtros pnpm**: `pnpm --filter <name>` usa el `name` del `package.json`, no la carpeta.

### Checklist al añadir un proyecto

1. Elegir la carpeta correcta según el árbol de decisión.
2. `package.json` con scripts canónicos: `dev`, `build`, `check`, `preview` (si aplica). Mismo nombre de script en todos los proyectos para que Turbo lo agrupe.
3. `README.md` propio en la carpeta del proyecto: qué hace, cómo arrancar en dev, cómo desplegar.
4. Si toca Sanity: reusar `@larokifarm/sanity-client` (cliente + Portable Text + horarios + i18n de campos). No crear un cliente paralelo.
5. Si toca i18n de UI: reusar `@larokifarm/i18n-utils` con un factory `crearTraductor()`. Los JSON de strings viven en `src/i18n/` del propio proyecto.
6. Si necesita un workspace de Sanity propio: añadirlo a `studio/sanity.config.ts` (no crear un studio paralelo).
7. Si necesita env vars: añadir `.env.example` y documentarlas en el README del proyecto.
8. Si despliega a Cloudflare Pages/Workers: añadir su fila a la tabla de despliegue de este README.
9. Si genera artefactos en una carpeta nueva (`build/`, `out/`, etc.): añadirla a `outputs` en `turbo.json` y a `.gitignore`.

### Qué NO va en el monorepo

- Documentos personales de planificación, contextos o notas (van en `~/.claude/plans/` o equivalente, fuera del repo).
- Fixtures grandes con datos del cliente (PDFs, exports, imágenes de producción). Si hacen falta para reproducir un bug, vivien en disco local; si se necesitan en CI, en un bucket externo.
- Capturas sueltas en la raíz (`WhatsApp Image *.jpeg`, etc.). Si una imagen es parte del proyecto, va dentro de `apps/<x>/public/` o `apps/<x>/src/assets/`.
- Estudios de Sanity paralelos. Hay uno solo en `studio/` con varios workspaces.

## Documentación adicional

- [`docs/`](./docs/) — runbooks y guías transversales (integraciones externas, procesos manuales).
- READMEs propios de cada proyecto dentro de su carpeta.
