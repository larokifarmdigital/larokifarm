# Larokifarm — Monorepo

Monorepo de Larokifarm: backoffice de gestión de farmacias, landings públicas de las farmacias, widget de chat Cima y herramientas internas.

## Estructura

```
larokifarm/
├── apps/                              Sitios y herramientas standalone (cada una con dominio o deploy propio)
│   ├── backoffice/                    Next.js: contenido de las webs, albaranes, comparador de precios, usuarios
│   ├── chamarro/                      Landing Astro de Farmacia Chamarro
│   ├── torrents/                      Landing Astro de Farmàcia Pediàtrica Torrents
│   ├── conciliador-albaranes/         Conciliador antiguo (redirige al backoffice; su esquema Prisma es la fuente)
│   └── inventory-sync/                Script (GitHub Actions): inventario de SharePoint → Cloudflare KV
├── packages/                          Código compartido entre apps (sin deploy propio)
│   ├── contenido/                     Helpers de contenido de las landings (i18n de campos, texto enriquecido, horarios, imágenes)
│   └── i18n-utils/                    Primitives de i18n (lookup JSON, interpolación, traductor)
├── widgets/                           Componentes embebibles en sitios externos
│   └── cima-chat/                     Widget IIFE Preact + Workers
├── workers/                           Cloudflare Workers
│   ├── google-resenas/                Reseñas de Google (pendiente de rehacer; ver docs/plan-resenas-google.md)
│   └── precios-puente/                Puente del comparador: pide a las farmacias que bloquean a Vercel
└── docs/                              Documentación transversal (runbooks, integraciones externas)
```

El contenido de las farmacias vive en el **backoffice** (Neon + R2). Las landings lo leen en build de su API pública (`BACKOFFICE_URL`). Sanity se retiró el 24-11-2026.

## Requisitos

- Node `>=20`
- pnpm `>=10` (gestor canónico del repo)

```bash
pnpm install   # instala todo desde la raíz
```

## Comandos día a día

```bash
# Dev de un proyecto concreto
pnpm --filter backoffice dev      # :3001
pnpm --filter torrents dev
pnpm --filter chamarro dev
pnpm --filter cima-chat dev

# Build (Turbo resuelve el orden de dependencias)
pnpm exec turbo run build --filter=torrents
pnpm exec turbo run build              # todos

# Comprobación de tipos en todos los proyectos
pnpm check
```

Los scripts canónicos por proyecto son `dev`, `build`, `check` y `preview` (cuando aplique). Cualquier proyecto nuevo debe respetar esos nombres para que Turbo y los comandos raíz lo enganchen sin configuración extra.

## Despliegue

| Proyecto              | Plataforma        | Notas |
| --------------------- | ----------------- | ----- |
| `apps/backoffice`     | Vercel (`larokifarm`) | Root Directory `apps/backoffice`. Al publicar una web lanza los deploy hooks de su landing. |
| `apps/torrents`       | Vercel (`larokifarm-torrents`) | Build lee del backoffice (`BACKOFFICE_URL`). |
| `apps/chamarro`       | Vercel (`larokifarm-chamarro`) | Igual que Torrents. |
| `widgets/cima-chat`   | Cloudflare Pages (`larokifarm-cima-chat`) | Workflow `.github/workflows/cima-chat-deploy.yml`. |
| `apps/inventory-sync` | GitHub Actions    | Cada 6 h (`.github/workflows/inventory-sync.yml`). |
| Listas del comparador | GitHub Actions    | `.github/workflows/precios-lista.yml`, lo lanza el backoffice. |
| `workers/precios-puente` | Cloudflare Workers (cuenta empresa) | `larokifarm-precios-puente`; `pnpm deploy` con `CLOUDFLARE_ACCOUNT_ID`. Ver su README. |

## Cómo crece el monorepo

Esta sección es el contrato implícito al añadir cualquier proyecto nuevo. Lo importante es elegir bien la carpeta y los scripts; el resto sale solo.

### Árbol de decisión: ¿dónde va?

1. **¿Tiene dominio o URL propia (sitio público, app interna, panel)?** → `apps/`
2. **¿Se embebe en sitios externos (script en HTML de terceros)?** → `widgets/`
3. **¿Es un Cloudflare Worker (cron, webhook, edge handler)?** → `workers/`
4. **¿Lo importan ≥2 proyectos del repo y no se deploya por sí solo?** → `packages/`

Si dudas entre `apps/` y `packages/`: si sirve tráfico, es app; si solo aporta código, es package.

### Stack permitido por categoría

| Categoría    | Stack por defecto                                  | Cuándo desviarse |
| ------------ | -------------------------------------------------- | ---------------- |
| `apps/` (landing, sitio de contenido) | Astro 5 + Tailwind 4                      | No desviarse — Astro es la elección estándar para SSG/contenido. |
| `apps/` (webapp con lógica fuerte, dashboard, herramienta interna) | Next.js (App Router) + Tailwind 4 | Solo si el caso es claramente SPA/SSR no factible en Astro. |
| `widgets/`   | Preact + Vite (library mode) + Shadow DOM          | Modelo de referencia: `widgets/cima-chat`. Mantener el bundle pequeño y aislado. |
| `packages/`  | TypeScript puro o Astro components, sin build step si es posible | Solo añadir build si el consumo lo exige. |
| `workers/`   | Cloudflare Workers + Wrangler                      | — |

Versiones: TypeScript `^5.9.2` y Tailwind `^4.3.0` en todos los proyectos (mantener el repo alineado).

### Convención de naming

- **Carpeta**: kebab-case (`apps/nueva-farmacia`, `widgets/buscador-medicamentos`).
- **`package.json#name`**:
  - Apps no compartibles: nombre plano (`torrents`, `backoffice`, `conciliador-albaranes`).
  - Packages, widgets compartibles y workers reusables: `@larokifarm/<nombre>` (`@larokifarm/contenido`, `@larokifarm/i18n-utils`).
- **Filtros pnpm**: `pnpm --filter <name>` usa el `name` del `package.json`, no la carpeta.

### Checklist al añadir un proyecto

1. Elegir la carpeta correcta según el árbol de decisión.
2. `package.json` con scripts canónicos: `dev`, `build`, `check`, `preview` (si aplica). Mismo nombre de script en todos los proyectos para que Turbo lo agrupe.
3. `README.md` propio en la carpeta del proyecto: qué hace, cómo arrancar en dev, cómo desplegar.
4. Si es una landing de farmacia: leer el contenido del backoffice y reusar `@larokifarm/contenido` (i18n de campos, texto enriquecido, horarios). No crear helpers paralelos.
5. Si toca i18n de UI: reusar `@larokifarm/i18n-utils` con un factory `crearTraductor()`. Los JSON de strings viven en `src/i18n/` del propio proyecto.
6. Si necesita env vars: añadir `.env.example` y documentarlas en el README del proyecto.
7. Si despliega: añadir su fila a la tabla de despliegue de este README.
8. Si genera artefactos en una carpeta nueva (`build/`, `out/`, etc.): añadirla a `outputs` en `turbo.json` y a `.gitignore`.

### Qué NO va en el monorepo

- Documentos personales de planificación, contextos o notas (van en `~/.claude/plans/` o equivalente, fuera del repo).
- Fixtures grandes con datos del cliente (PDFs, exports, imágenes de producción). Si hacen falta para reproducir un bug, viven en disco local; si se necesitan en CI, en un bucket externo.
- Capturas sueltas en la raíz (`WhatsApp Image *.jpeg`, etc.). Si una imagen es parte del proyecto, va dentro de `apps/<x>/public/` o `apps/<x>/src/assets/`.
- Contraseñas, claves o tokens: el repo es público.

## Documentación adicional

- [`docs/`](./docs/) — runbooks y guías transversales (integraciones externas, procesos manuales).
- READMEs propios de cada proyecto dentro de su carpeta.
