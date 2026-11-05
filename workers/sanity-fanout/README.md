# sanity-fanout

Cloudflare Worker que recibe un webhook de Sanity y dispara N deploy hooks en
paralelo. Permite tener **un único webhook** en Sanity (necesario con el plan
free, que solo permite uno) que rebuildea todos los sitios en lote.

Soporta cualquier hosting que acepte un **POST sin auth** como deploy hook:
Cloudflare Pages, Vercel, Netlify, Render, etc. El worker solo hace `fetch(url,
{ method: 'POST' })`, sin headers ni body — los deploy hooks de los 3 grandes
están diseñados exactamente así.

## Dueño

- **Cuenta Cloudflare**: `larokifarmdigital@gmail.com` (cuenta empresa).
- **Account ID**: `b541c31a1626d80fb24641caa2ce9d15`.
- **URL pública**: `https://larokifarm-sanity-fanout.<subdominio-empresa>.workers.dev`
  (mira la URL exacta en el dashboard tras el deploy).

Si tienes que trabajar con este worker desde la CLI, asegúrate de estar
logueado con esa cuenta:

```bash
pnpm exec wrangler whoami
# Email debe ser larokifarmdigital@gmail.com
```

Si tienes una variable de entorno `CLOUDFLARE_ACCOUNT_ID` exportada en tu
shell, puede forzar a wrangler a deployar en otra cuenta y dar
`Authentication error [code: 10000]`. Si pasa:

```bash
unset CLOUDFLARE_ACCOUNT_ID
pnpm exec wrangler deploy
```

O sobrescribe solo para ese comando:

```bash
CLOUDFLARE_ACCOUNT_ID=b541c31a1626d80fb24641caa2ce9d15 pnpm exec wrangler deploy
```

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

## Añadir un sitio nuevo (4ª farmacia, Vercel, etc.)

Funciona con cualquier hosting cuyo deploy hook sea `POST sin auth`:

| Hosting | Dónde obtener el deploy hook URL |
|---|---|
| Cloudflare Pages | Settings → Builds & deployments → Deploy hooks → Add |
| Vercel | Settings → Git → Deploy Hooks → Create Hook |
| Netlify | Site settings → Build & deploy → Build hooks → Add build hook |

Pasos:

1. Crear el proyecto en su hosting (Pages/Vercel/Netlify) que builda ese sitio.
2. Copiar su deploy hook URL.
3. Editar el secret `DEPLOY_HOOKS` **pegando la lista completa actualizada**
   (el comando reemplaza, no añade):
   ```bash
   pnpm exec wrangler secret put DEPLOY_HOOKS
   # pegar la lista COMPLETA, separados por COMA, SIN ESPACIOS:
   # https://api.cloudflare.com/.../hook1,https://api.vercel.com/.../hook2,...
   ```
4. Listo. Sin tocar Sanity ni redeployar el Worker — los secrets se leen en
   cada request.

⚠️ El código hace `env.DEPLOY_HOOKS.split(',')` sin `.trim()` sobre cada URL,
así que **espacios alrededor de las comas rompen** ese hook (se parsea como
URL inválida). Pégualo todo seguido sin espacios.

## Migrar el worker a otra cuenta Cloudflare

Cuando toque mover este worker de la cuenta personal a la empresa, o viceversa:

**Pre-migración** — recopila:

- Lista completa de deploy hook URLs (ve a cada Pages/Vercel/Netlify y
  cópialos) para `DEPLOY_HOOKS`.
- El `SANITY_WEBHOOK_SECRET` actual (si no lo recuerdas, genera uno nuevo con
  `openssl rand -hex 32` — tendrás que actualizarlo también en Sanity).

**Pasos**:

```bash
cd workers/sanity-fanout

# 1. Logout y login con la cuenta destino
pnpm exec wrangler logout
pnpm exec wrangler login            # entra con el email de la cuenta destino
pnpm exec wrangler whoami            # verifica email + account ID

# 2. Si tienes CLOUDFLARE_ACCOUNT_ID en tu shell apuntando a la otra cuenta,
#    desexpórtala (o sobrescribe con la empresa) — ver sección "Dueño" arriba.

# 3. Deploy a la cuenta nueva
pnpm exec wrangler deploy

# 4. Subir los 2 secrets a la cuenta nueva (no se migran solos)
pnpm exec wrangler secret put DEPLOY_HOOKS
# pegar lista completa
pnpm exec wrangler secret put SANITY_WEBHOOK_SECRET
# pegar string HMAC

# 5. Verificar
pnpm exec wrangler secret list

# 6. Smoke test
pnpm exec wrangler tail              # en terminal 1
# en terminal 2:
curl https://larokifarm-sanity-fanout.<nuevo-subdominio>.workers.dev
# debe responder "larokifarm-sanity-fanout · POST a webhook here"
```

**7. Actualizar el webhook en Sanity** — Sanity manage → tu proyecto → API →
Webhooks → editar `cf-pages-fanout` → cambiar **URL** al nuevo y guardar.

**8. Test real** — en Sanity Studio, publica un cambio trivial. En
`wrangler tail` debe aparecer el POST, verificación HMAC OK, y los N hooks
respondiendo 200.

**9. Borrar el worker viejo** (SOLO después de confirmar que el nuevo funciona):

```bash
pnpm exec wrangler logout
pnpm exec wrangler login            # entra con la cuenta ORIGEN (vieja)
pnpm exec wrangler delete           # borra el worker
pnpm exec wrangler logout
pnpm exec wrangler login            # vuelve a entrar con la cuenta nueva
```

O más simple: dashboard Cloudflare de la cuenta vieja → Workers & Pages →
`larokifarm-sanity-fanout` → Settings → Delete.

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
