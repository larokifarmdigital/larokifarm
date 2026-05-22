# sanity-fanout

Cloudflare Worker que recibe un webhook de Sanity y dispara N deploy hooks de
Cloudflare Pages en paralelo. Permite tener **un único webhook** en Sanity que
rebuildea todos los sitios (standalone calendario + landings de farmacia).

## Configuración

### 1. Despliegue

```bash
cd workers/sanity-fanout
pnpm install
pnpm exec wrangler login       # primera vez
pnpm exec wrangler deploy
```

Tras el deploy, Wrangler imprime la URL pública del Worker, algo como:
`https://larokifarm-sanity-fanout.<cuenta>.workers.dev`

### 2. Secrets

```bash
# Lista de deploy hooks separados por coma (sin espacios alrededor):
pnpm exec wrangler secret put DEPLOY_HOOKS
# pegar: https://api.cloudflare.com/.../torrents-v2,https://api.cloudflare.com/.../calendario-vacunas

# Secret compartido con Sanity para verificar firma:
pnpm exec wrangler secret put SANITY_WEBHOOK_SECRET
# pegar un string aleatorio largo (p.ej. `openssl rand -hex 32`)
```

### 3. Configurar el webhook en Sanity

En Sanity manage → tu proyecto → API → Webhooks → Create webhook:

- **Name**: `cf-pages-fanout`
- **URL**: `https://larokifarm-sanity-fanout.<cuenta>.workers.dev`
- **Dataset**: `calendario`
- **Trigger on**: Create, Update, Delete
- **HTTP method**: POST
- **Secret**: el mismo valor que usaste en `SANITY_WEBHOOK_SECRET`
- **Filter**: `_type in ["comunidad", "vacuna", "dosis", "enfermedad", "grupoEdad", "farmacia", "farmaciaPartner"]`

## Añadir un sitio nuevo (4ª farmacia, etc.)

1. Crear el proyecto CF Pages que builda esa farmacia.
2. Copiar su Deploy hook URL.
3. Editar el secret `DEPLOY_HOOKS` añadiendo la URL al final tras una coma:
   ```bash
   pnpm exec wrangler secret put DEPLOY_HOOKS
   # pegar la lista completa actualizada
   ```
4. Listo. Sin tocar Sanity ni redeployar el Worker.

## Comportamiento

- Verifica la firma HMAC-SHA256 del webhook (header `sanity-webhook-signature`)
  con tolerancia de 5 minutos para replay.
- Dispara los deploy hooks en paralelo, no bloquea.
- Responde 200 si todos los deploy hooks devolvieron 2xx; 502 si alguno falló.
- Loguea los hooks llamados (con token enmascarado) para debug en CF dashboard.

## Verificar el secret rota / falló

Logs en tiempo real:

```bash
pnpm exec wrangler tail
```
