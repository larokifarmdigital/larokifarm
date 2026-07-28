# inventory-sync

Node script que descarga el Excel de inventario de SharePoint, lo parsea, enriquece cada CN contra CIMA (AEMPS) y escribe el snapshot resultante en Cloudflare KV. El Worker `cima-inventory-sync` (en `widgets/cima-chat/worker/`) lee ese KV y lo sirve al widget.

Corre en **GitHub Actions** cada 6 horas — ver `.github/workflows/inventory-sync.yml`.

## Por qué está aquí y no en el Worker

El Excel tiene ~74k filas y ~5.7 MB. Parsearlo con SheetJS supera los límites de CPU del plan Free de Cloudflare Workers (10 ms/request). En un runner de GitHub (7 GB RAM, 2 CPUs, sin límite de CPU) cabe sin problema.

## Uso local

```bash
cp .env.example .env
# rellenar AZURE_CLIENT_SECRET, SHAREPOINT_SHARE_URL, CF_API_TOKEN

pnpm install
pnpm dry-run   # sin CIMA, sin KV — solo mide y muestra sample
pnpm sync      # sync completo
```

## Variables requeridas

| Var | Fuente |
|---|---|
| `AZURE_TENANT_ID` | Fijo (aramersa) |
| `AZURE_CLIENT_ID` | Fijo (App Registration) |
| `AZURE_CLIENT_SECRET` | Portal Entra → App reg → Certificates & secrets |
| `SHAREPOINT_SHARE_URL` | Link "Share" del Excel en SharePoint |
| `CF_ACCOUNT_ID` | Fijo |
| `CF_KV_NAMESPACE_ID` | Fijo (INVENTORY_KV) |
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → **Workers KV Storage : Edit** |

## GitHub secrets

Los mismos nombres que arriba, configurados en el repo (Settings → Secrets and variables → Actions).
