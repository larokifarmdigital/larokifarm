# google-resenas

Worker Cloudflare que sincroniza reseñas de Google Business Profile → Sanity.

## Qué hace

- **Cron 2x/día** (06:00 y 18:00 UTC): recorre todas las farmacias con
  `googleLocationName` rellenado en Sanity y trae sus reseñas vía GBP API.
- **POST `/sync`** (autenticado con bearer `SYNC_SECRET`): ejecuta el mismo
  sync a demanda. Útil para el primer sync o para forzar refresh.
- **GET `/`**: healthcheck.

Reseñas nuevas o modificadas → `createOrReplace` con `_id` determinista.
Reseñas que ya no están en Google → patch con `eliminadaEnGoogle: true`
(no se borran, por trazabilidad).

## Setup

```sh
cd workers/google-resenas
pnpm install

# Secrets (los públicos van en wrangler.toml [vars])
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REFRESH_TOKEN
wrangler secret put SANITY_WRITE_TOKEN
wrangler secret put SYNC_SECRET   # generar con `openssl rand -hex 32`

wrangler deploy
```

## Probar manualmente

```sh
curl -X POST https://larokifarm-google-resenas.<account>.workers.dev/sync \
  -H "Authorization: Bearer <SYNC_SECRET>"
```

Respuesta: JSON con `{ ok, farmacias: [...], errores: [...] }`.

## Dependencias

- En Sanity debe existir el schema `resenaGoogle` (sí) y al menos una farmacia
  con `googleLocationName` con formato `accounts/X/locations/Y` (paso de
  onboarding documentado en `docs/resenas-google-nuevas-farmacias.md`).
- El `SANITY_WRITE_TOKEN` debe tener permisos de Editor sobre el dataset
  `calendario`. Se genera desde manage.sanity.io → proyecto → API → Tokens.

## Logs

Cloudflare Workers Logs está activado (`[observability] enabled = true`).
Cada sync emite líneas `[sync]`, `[cron]`, `[entry]` legibles desde el
dashboard de Cloudflare → Workers → larokifarm-google-resenas → Logs.
