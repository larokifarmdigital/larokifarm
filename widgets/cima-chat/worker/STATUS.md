# Estado del feature "Inventario del cliente"

> Doc de hand-off para retomar el trabajo cuando llegue el admin consent. Si vuelves al chat y me dices "continuamos con el inventario" o similar, lee este archivo antes de hacer nada.

## TL;DR

Estamos integrando el Excel de inventario que la farmacia mantiene en SharePoint con el widget `cima-chat`. El widget consulta CIMA (AEMPS) para listar medicamentos; queremos que cuando alguien busque por síntomas, los productos que la farmacia tiene en stock aparezcan **primero** y con un badge "⭐ En stock". Match por **Código Nacional (CN)**.

Arquitectura: Cloudflare Worker con cron cada 6h baja el .xlsx vía Microsoft Graph, lo enriquece llamando a CIMA por cada CN, guarda en KV. El widget hace fetch al endpoint del Worker al cargar y reordena/inyecta los resultados.

## Qué está hecho

### Widget (`/src` en el repo cima-chat) — ✅ código completo, build verde

- `src/api/inventory.ts` — fetch del endpoint del Worker + caché localStorage TTL 30 min + índices `byNregistro / byAtc / byPrincipio`. Si no hay `VITE_INVENTORY_URL` configurada, usa `MOCK_INVENTORY` con 4 productos reales de CIMA para que la UX se pueda validar sin el Worker desplegado.
- `src/lib/inventoryFilter.ts` — `isInStock`, `sortByStock` (estable, stock arriba), `injectMissingByAtc` (hace `getMedicamento` paralelo capped a 5 para los nregistros del cliente que CIMA no devolvió en la búsqueda original).
- `src/components/ChatPanel.tsx` — carga inventario al montar, lo pasa por props a ResultList, SymptomWizard y AlternativesList. También captura el `atc` cuando se abren alternativas para inyectar por ATC.
- `src/components/ResultList.tsx` — sort + badge en búsqueda libre.
- `src/components/SymptomWizard.tsx` — `runQuery` hace `injectMissingByAtc` + `sortByStock` para OTC y Rx en perfiles no pediátricos. **En perfiles pediátricos NO inyecta** (saltaría `verifyPediatric`, sólo reordena). Badge en cada card de OTC y Rx en `ResultsBlock`.
- `src/components/AlternativesList.tsx` — efecto que inyecta por ATC actual, ordena, badge.
- `src/styles/widget.css` — `.cima-badge.stock` (verde) + `.cima-result.in-stock` con borde y degradado (light + dark).

Build: `pnpm typecheck && pnpm build` ✓ (verificado, 70.55 kB IIFE).

### Worker (`/worker`) — ✅ código completo, typecheck verde

- `worker/src/graph.ts` — `getAccessToken` (client_credentials) + `downloadSharedFile` (encoder `u!{base64url(shareUrl)}` + `GET /shares/{enc}/driveItem/content` con Bearer).
- `worker/src/excel.ts` — `parseInventoryXlsx` con SheetJS. Headers detectados: `IdArticu` (CN), `Descripcion`, `ClasificacionABCD`, `StockLaroki`, `StockFarmaciasConso`, `VentasAnualesConso`, `PVP`. **Filtra rows con `ClasificacionABCD === 'Muerto'`** (descatalogados) y CNs inválidos. CN se padea a 6 dígitos.
- `worker/src/enrich.ts` — por cada CN llama `CIMA /medicamentos?cn=` + `CIMA /medicamento?nregistro=` para obtener `nregistro`, `atcs`, `principios`, `labtitular`, `receta`. Chunks de 10 paralelos con 150ms entre chunks. Collecta `notFound[]` para diagnóstico.
- `worker/src/index.ts` — `scheduled` (runs sync, escribe KV), `fetch` con tres endpoints:
  - `GET /inventory` — lo consume el widget. Cache 5 min, CORS abierto.
  - `GET /diagnostics` — meta + sample de notFound. Útil para el cliente.
  - `POST /__sync` — trigger manual con `Authorization: Bearer <AZURE_CLIENT_SECRET>`.
- `worker/wrangler.toml` — cron `0 */6 * * *`, KV binding `INVENTORY_KV`, vars `AZURE_TENANT_ID` + `AZURE_CLIENT_ID`, secrets `AZURE_CLIENT_SECRET` + `SHAREPOINT_SHARE_URL`.
- `worker/README.md` — guía detallada de deploy (más profunda que este STATUS).
- `worker/.dev.vars.example` — template para dev local.

## Datos del cliente (Azure) — ya proporcionados, NO secretos

- `AZURE_TENANT_ID` = `73a2959a-f4d7-4ddb-a9d9-108c0d232707`
- `AZURE_CLIENT_ID` = `9eb2e975-6e30-41f9-91a2-8c9faf5a503c`
- Tenant: `aramersa` (Microsoft 365)
- SharePoint site: `https://aramersa.sharepoint.com/sites/DIGITAL_FARMACIA`
- Share URL del Excel (lleva token `?e=vO2cay`, sensible — mejor regenerar como "people in your organization" antes del deploy):
  `https://aramersa.sharepoint.com/:x:/s/DIGITAL_FARMACIA/IQBqS_3QAcrcR7ADzFMb67LDARzA4_3No4-fM7I9dzdFthQ?e=vO2cay`

Estos valores están repetidos en `worker/.dev.vars.example` para dev local.

## ⛔ Bloqueante actual

**Admin consent en Azure pendiente.** En la página de "API permissions" del App Registration, el permiso `Files.Read.All` aparece como **"No concedido por aramersa"** (i.e., consent no aplicado). Necesita que un admin del tenant Microsoft 365 de aramersa pulse "Grant admin consent for aramersa".

Sin consent, las llamadas a `GET /shares/{enc}/driveItem/content` devuelven 403.

## Cuando llegue el consent: pasos para desplegar

Suponiendo CWD = `/worker`.

### 1. Generar el client secret en Azure
- Portal Entra → App registrations → la app → **Certificates & secrets** → **+ New client secret**.
- Descripción: `worker-prod`, expira: 24 meses.
- **Copiar el "Value"** ya (sólo se ve una vez). No me lo pegues por chat; lo metes directo en el Worker en el paso 4.

### 2. Crear KV namespaces y pegar IDs
```bash
wrangler login
wrangler kv namespace create INVENTORY_KV
wrangler kv namespace create INVENTORY_KV --preview
```
Editar `worker/wrangler.toml` y reemplazar:
- `id = "REPLACE_WITH_KV_ID"` con el id del primer comando.
- `preview_id = "REPLACE_WITH_PREVIEW_KV_ID"` con el del segundo.

### 3. Completar variables no-secretas en wrangler.toml
```toml
[vars]
AZURE_TENANT_ID = "73a2959a-f4d7-4ddb-a9d9-108c0d232707"
AZURE_CLIENT_ID = "9eb2e975-6e30-41f9-91a2-8c9faf5a503c"
```

### 4. Meter los dos secrets
```bash
wrangler secret put AZURE_CLIENT_SECRET
# pegar el "Value" del paso 1

wrangler secret put SHAREPOINT_SHARE_URL
# pegar el link del Excel. Antes idealmente regenéralo en SharePoint como
# "People in your organization with the link" para que no caduque ni sea
# accesible por anyone-with-link.
```

### 5. (Opcional) Probar en local antes de deploy
```bash
cp .dev.vars.example .dev.vars
# editar .dev.vars con el secret y el share URL reales
pnpm dev
# en otra terminal:
curl -X POST http://localhost:8787/__sync \
  -H "Authorization: Bearer <AZURE_CLIENT_SECRET>"
curl http://localhost:8787/inventory | jq '.itemsCount, .items[0]'
curl http://localhost:8787/diagnostics | jq .
```

Espera ver `itemsCount > 0`, un `item` con `cn`, `nregistro`, `atcs[]`, `principios[]`. En `/diagnostics`, `meta.skippedMuerto` debe coincidir con la cantidad de filas marcadas "Muerto" en el Excel, y `notFoundCount` recoge parafarmacia / homeopatía no presente en CIMA.

### 6. Deploy a Cloudflare
```bash
pnpm deploy
```
Anotar la URL de prod (algo como `https://cima-inventory-sync.<account>.workers.dev`).

### 7. Forzar primer sync (no esperar al cron)
```bash
curl -X POST https://cima-inventory-sync.<account>.workers.dev/__sync \
  -H "Authorization: Bearer <AZURE_CLIENT_SECRET>"
```

### 8. Wire-up del widget
En el repo raíz `cima-chat`:
```bash
echo 'VITE_INVENTORY_URL=https://cima-inventory-sync.<account>.workers.dev/inventory' > .env.production
pnpm build
```
El widget detecta la URL automáticamente y desactiva `MOCK_INVENTORY`.

### 9. Verificación end-to-end
- Abre `index.html` con el widget cargado.
- Búsqueda libre por "ibuprofeno": un ibuprofeno que la farmacia tenga en stock debe aparecer arriba con badge "⭐ En stock".
- Wizard "dolor de cabeza" → adulto: el ibuprofeno en stock arriba en OTC.
- Detalle → "Alternativas con Ibuprofeno": en stock arriba.
- Si CIMA NO devolvió un producto del cliente en los 60 primeros: aparece **inyectado** al inicio (función `injectMissingByAtc`).

## Decisiones tomadas (para que no las reabramos)

- **`IdArticu` ES el CN** (confirmado por usuario; no esperar a una columna nueva).
- **`ClasificacionABCD === 'Muerto'` se filtra** antes de llamar a CIMA. No mostramos descatalogados como "en stock".
- **No inyectamos stock en perfiles pediátricos** (saltaría `verifyPediatric` que valida FT 4.1/4.2/4.3). Solo reordenamos lo que ya pasó esas comprobaciones.
- **Cron cada 6h** (`0 */6 * * *`). Suficiente para inventario de farmacia.
- **`SHAREPOINT_SHARE_URL` como secret** (no var) porque lleva un token de acceso al archivo.
- **`POST /__sync` autentica con el mismo `AZURE_CLIENT_SECRET`** por simplicidad. Si más adelante incomoda, se añade un `SYNC_SECRET` separado.
- **Chunks de 10 paralelos + 150ms delay** al enriquecer contra CIMA, conservador por si el Excel tiene cientos de CNs.
- **`MOCK_INVENTORY` con 4 productos reales** se mantiene cuando no hay `VITE_INVENTORY_URL` configurada, para que cualquier dev pueda levantar el widget y ver la feature sin Worker.
- **Worker como subcarpeta `/worker` del mismo repo** (no repo aparte), para que cambios de schema (p.ej. añadir campo a `InventoryItem`) queden en un commit cross-cutting.

## Lo que NO está hecho y queda fuera del scope actual

- **Webhook desde SharePoint** para sync inmediato cuando el cliente actualice el Excel. Esperamos al cron de 6h.
- **Dashboard para que el cliente vea `notFound`** (CNs del Excel que no matchearon contra CIMA). El endpoint `/diagnostics` lo expone, pero no hay UI.
- **Mostrar stock numérico o PVP en el badge**. Por ahora sólo señalamos disponibilidad binaria.
- **Filtro "ver sólo productos en stock"** como opción del usuario.
- **`SYNC_SECRET` separado** del Azure client secret para autenticar `/__sync`.
