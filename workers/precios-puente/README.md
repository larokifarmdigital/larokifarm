# Puente del comparador de precios

Cloudflare Worker (cuenta de empresa) por el que el backoffice pide a las
farmacias online que bloquean a los servidores de Vercel. Farmavázquez y
Farmacia Senante están tras Cloudflare y responden **403** a Vercel (centro de
datos); desde un Worker responden bien (comprobado el 25-11-2026).

- `POST /pedir` con `Authorization: Bearer <CLAVE>` y `{ "url", "headers" }`.
- Responde `{ status, location, setCookie, body }` de UNA petición (sin seguir
  redirecciones: las sigue el backoffice, que guarda las cookies).
- Solo https, solo los dominios de `PERMITIDOS` (`src/index.ts`), solo GET y
  solo cabeceras de navegador. Cualquier otra cosa: 401/403/404.
- Coste: plan gratuito de Workers (100.000 peticiones al día).

## Configuración

| Dónde | Variable | Valor |
|---|---|---|
| Worker (secreto) | `CLAVE` | clave larga aleatoria (`wrangler secret put CLAVE`) |
| Backoffice (Vercel y `.env.local`) | `PRECIOS_PUENTE_URL` | `https://larokifarm-precios-puente.<subdominio>.workers.dev/pedir` |
| Backoffice (Vercel y `.env.local`) | `PRECIOS_PUENTE_CLAVE` | la misma clave |

Sin esas dos variables el backoffice pide directo, como antes.

## Desplegar

```bash
cd workers/precios-puente
CLOUDFLARE_ACCOUNT_ID=b541c31a1626d80fb24641caa2ce9d15 pnpm deploy
```

Añadir una farmacia al puente: su dominio en `PERMITIDOS` (aquí) y en
`porPuente` de su `ClienteWeb` en el backoffice.
