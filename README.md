# Larokifarm — Monorepo

Monorepo de Larokifarm: landings de farmacias en Astro, widget de chat Cima, calendario de vacunación compartido y Sanity Studio.

## Estructura

```
larokifarm/
├── apps/
│   ├── calendario-vacunas/   Sitio standalone del calendario (dominio propio)
│   └── torrents/             Landing de Farmacia Torrents
├── packages/
│   └── calendario-vacunas/   Paquete compartido del calendario (Astro components + Sanity + i18n)
├── widgets/
│   └── cima-chat/            Widget IIFE del chat Cima + Worker de sincronización
└── studio/                   Sanity Studio (workspaces calendario + cima-chat)
```

## Requisitos

- Node `>=20`
- pnpm `>=10`

## Comandos

```bash
# Instalar todo
pnpm install

# Dev de un app específico
pnpm --filter @larokifarm/torrents dev
pnpm --filter calendario-vacunas dev

# Build de un app específico (Turbo se encarga del orden de dependencias)
pnpm exec turbo run build --filter=@larokifarm/torrents

# Studio (Sanity panel)
pnpm studio
```

## Despliegue

Cada app es un proyecto independiente en Cloudflare Pages apuntando a la raíz del monorepo, con build command `pnpm exec turbo run build --filter=<paquete>` y output `apps/<app>/dist`.

El widget Cima despliega su IIFE a Cloudflare Pages y su Worker de sync con `wrangler deploy` desde `widgets/cima-chat/worker/`.

El Studio Sanity se despliega con `pnpm --filter studio deploy` a `*.sanity.studio`.

Detalles en el plan de migración (referenciar plan en `~/.claude/plans/`).
