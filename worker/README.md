# cima-inventory-sync

Cloudflare Worker que sincroniza el inventario del cliente (Excel en SharePoint) con CIMA y expone el resultado al widget `cima-chat`.

## Pipeline

```
SharePoint Excel  ──(Microsoft Graph)──▶  Worker
                                            │  parse xlsx
                                            │  filter ClasificacionABCD === 'Muerto'
                                            │  para cada CN llama CIMA /medicamentos?cn=
                                            │  + CIMA /medicamento para ATCs y pactivos
                                            ▼
                                           KV (snapshot enriquecido)
                                            │
                                            ▼
                                       GET /inventory  (consumido por el widget)
```

## Endpoints

- `GET /inventory` — JSON con `{ updatedAt, itemsCount, items: InventoryItem[] }`. Cacheado 5 min. CORS abierto.
- `GET /diagnostics` — meta del último sync + muestra de CNs que no matchearon contra CIMA.
- `POST /__sync` — trigger manual del pipeline (header `Authorization: Bearer <AZURE_CLIENT_SECRET>`).
- Cron: cada 6h (`0 */6 * * *`).

## Setup inicial (uno solo)

1. **Cloudflare KV**: crear namespace y pegar los IDs en `wrangler.toml`.
   ```bash
   wrangler login
   wrangler kv namespace create INVENTORY_KV
   wrangler kv namespace create INVENTORY_KV --preview
   ```
   Reemplaza `REPLACE_WITH_KV_ID` y `REPLACE_WITH_PREVIEW_KV_ID` en `wrangler.toml`.

2. **Variables no-secretas**: editar `[vars]` en `wrangler.toml` con los IDs de Azure:
   ```toml
   [vars]
   AZURE_TENANT_ID = "73a2959a-f4d7-4ddb-a9d9-108c0d232707"
   AZURE_CLIENT_ID = "9eb2e975-6e30-41f9-91a2-8c9faf5a503c"
   ```

3. **Secrets** (no van en git, los guarda Cloudflare cifrados):
   ```bash
   wrangler secret put AZURE_CLIENT_SECRET
   # pega el valor cuando lo pida
   wrangler secret put SHAREPOINT_SHARE_URL
   # pega el link "Copiar vínculo" del Excel
   ```

4. **Permisos en Azure**: App Registration con permiso de aplicación `Files.Read.All` en Microsoft Graph y admin consent aplicado.

## Dev local

1. Copia `.dev.vars.example` → `.dev.vars` y rellena valores reales (no se commitea).
2. `pnpm dev` arranca el Worker en `http://localhost:8787`.
3. Para disparar el sync manual:
   ```bash
   curl -X POST http://localhost:8787/__sync \
     -H "Authorization: Bearer <tu-AZURE_CLIENT_SECRET>"
   ```
4. Verifica el resultado:
   ```bash
   curl http://localhost:8787/inventory | jq '.itemsCount, .items[0]'
   curl http://localhost:8787/diagnostics | jq .
   ```
5. Para simular el cron: `pnpm test-scheduled` y luego
   ```bash
   curl 'http://localhost:8787/__scheduled?cron=*+*+*+*+*'
   ```

## Deploy

```bash
pnpm deploy
```

Tras el primer deploy, fuerza un sync inicial (sin esperar al cron):
```bash
curl -X POST https://cima-inventory-sync.<account>.workers.dev/__sync \
  -H "Authorization: Bearer <AZURE_CLIENT_SECRET>"
```

## Wire-up del widget

Una vez la URL de prod del Worker esté lista, en el repo raíz del widget:

```bash
# .env.production (o .env.local)
VITE_INVENTORY_URL=https://cima-inventory-sync.<account>.workers.dev/inventory
```

Y rebuild (`pnpm build` en la raíz). El widget detecta automáticamente la URL y desactiva el `MOCK_INVENTORY`.
