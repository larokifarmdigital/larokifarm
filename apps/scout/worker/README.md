# scout-batch-worker

Cloudflare Worker que procesa el batch masivo de comparación de precios de Scout.

**No confundir con la app Next.js de Scout** (`apps/scout/src/`). Este paquete solo contiene el worker que corre el batch en background (2h por 2.500 productos), la app Next.js lo llama vía HTTP.

## Pipeline

```
Scout /batch → POST /run → Worker
                            │
                            ├─ Auth Azure (client_credentials, cliente ya dio consent)
                            ├─ Descarga Excel SharePoint (Graph /shares/{id}/driveItem/content)
                            ├─ Parse xlsx → filas { CN, EAN, Nombre, ClasificacionABCD }
                            ├─ Filtro: ClasificacionABCD === 'Muerto' se descartan
                            ├─ Por cada producto:
                            │     · ScraperAPI Google Shopping (o MOCK)
                            │     · Filtrado estricto por título
                            │     · Recolecta cada farmacia con precio
                            │     · Actualiza progreso en KV cada 20 items
                            ├─ Genera Excel (dos hojas: Resumen + Detalle)
                            └─ Guarda en KV (TTL 7 días)
```

## Endpoints

Todos requieren `Authorization: Bearer $WORKER_AUTH_TOKEN` excepto `/health`.

| Endpoint | Método | Descripción |
| --- | --- | --- |
| `/health` | GET | Comprobación de vida (público) |
| `/run` | POST | Dispara un batch. Devuelve `{ jobId, status: 'pending' }`. Rechaza 409 si otro batch está en curso. |
| `/jobs/:id` | GET | Estado: `pending / running / completed / failed`, `processed / total`, etc. |
| `/jobs/:id/result` | GET | Descarga el Excel resultado. Solo cuando `status === 'completed'`. |

## Setup inicial

### 1. Crear el KV namespace

```bash
wrangler kv namespace create SCOUT_JOBS_KV
wrangler kv namespace create SCOUT_JOBS_KV --preview
```

Pega los IDs en `wrangler.toml` (`REPLACE_WITH_KV_ID` y `REPLACE_WITH_PREVIEW_KV_ID`).

### 2. Secrets

```bash
# Reutilizamos el client secret de Azure ya configurado para cima-chat
wrangler secret put AZURE_CLIENT_SECRET

# Link "Copiar vínculo" del Excel de productos en SharePoint
wrangler secret put SHAREPOINT_INPUT_URL

# ScraperAPI · durante desarrollo poner literal "MOCK" (datos fake sin gastar créditos)
wrangler secret put SCRAPERAPI_KEY

# Password para que Scout llame al worker · invéntala fuerte (openssl rand -hex 32)
wrangler secret put WORKER_AUTH_TOKEN
```

### 3. Deploy

```bash
pnpm deploy
```

Verifica:
```bash
curl https://scout-batch-worker.<account>.workers.dev/health
```

## Dev local

1. Copia `.dev.vars.example` → `.dev.vars` y rellena valores (no se commitea).
2. `pnpm dev` arranca en `http://localhost:8787`.
3. Test manual:
   ```bash
   # dispara batch
   curl -X POST http://localhost:8787/run \
     -H "Authorization: Bearer <tu-WORKER_AUTH_TOKEN>"
   # consulta estado (usa el jobId de la respuesta anterior)
   curl http://localhost:8787/jobs/<jobId> \
     -H "Authorization: Bearer <tu-WORKER_AUTH_TOKEN>"
   # descarga resultado
   curl -o result.xlsx http://localhost:8787/jobs/<jobId>/result \
     -H "Authorization: Bearer <tu-WORKER_AUTH_TOKEN>"
   ```

## Modo MOCK (desarrollo sin gastar ScraperAPI)

Si `SCRAPERAPI_KEY = "MOCK"` (o vacía), el scraper devuelve **datos fake determinísticos** por CN. Permite probar el pipeline entero end-to-end sin gastar ni un crédito.

Cuando el cliente pague la suscripción:
```bash
wrangler secret put SCRAPERAPI_KEY
# pega la API key real
```
No hace falta redeploy — el worker recoge el nuevo secret al vuelo.

## Consideraciones

- **KV size limit**: 25 MB por value. El Excel resultado (2.500 filas resumen + ~15.000 filas detalle) ≈ 500 KB. Muy dentro del límite.
- **TTL**: job state 7 días, Excel resultado 7 días. Después el cliente debe relanzar el batch.
- **Semáforo**: solo un batch a la vez. Si un batch queda colgado, el lock caduca solo a las 4h.
- **Filtro Muerto**: los productos con `ClasificacionABCD === 'Muerto'` se descartan por defecto para no gastar créditos. Cambia `SKIP_MUERTO = "false"` en `wrangler.toml` para procesar todo.
