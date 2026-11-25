# Pendiente fuera del código (limpieza tras retirar Sanity y el Scout antiguo)

El código ya no usa Sanity ni `apps/scout` (24-11-2026). Esto es lo que queda en
servicios externos. Ninguno rompe nada si se deja, pero conviene borrarlo para
no pagar ni mantener cosas sin uso. Marca cada casilla al hacerlo.

Comprobado el 24-11-2026: la base de datos **no** referencia nada de Sanity
(ni imágenes en `cdn.sanity.io` ni claves `sanity:`), así que se puede borrar
sin perder contenido. No se guarda copia de Sanity (decisión del usuario).

## 1. Cloudflare (cuenta empresa `larokifarmdigital@gmail.com`)

- [ ] **Worker `larokifarm-sanity-fanout`** → Workers & Pages → el worker →
  Settings → Delete. Recibía el webhook de Sanity; el backoffice ya lanza los
  despliegues directamente. Sus secretos se borran con él.
- [x] Worker `scout-batch-worker` + KV `SCOUT_JOBS_KV` (y `_preview`): borrados
  el 24-11-2026.
- [ ] Si existe en tu cuenta **personal** de Cloudflare un proyecto Pages de
  Torrents con el dominio `torrentsfarmacia.com` (ya no responde): borrarlo y,
  si el dominio no se usa, no renovarlo.

## 2. Sanity (sanity.io/manage, proyecto `yovi040n`)

Después de que estén desplegadas las landings sin Sanity (ya subidas a `main`):

- [ ] **API → Webhooks**: borrar el webhook que apuntaba a `sanity-fanout`.
- [ ] **API → Tokens**: borrar los tokens (el del antiguo worker de reseñas, etc.).
- [ ] **Proyecto `yovi040n`** → Settings → Delete project. Borra los datasets
  (`farmacias`/`production`, `cima`, `calendario`) y el Studio publicado en
  `*.sanity.studio`.

## 3. Vercel

- [ ] **Urgente — `larokifarm`** (backoffice): copiar `GEMINI_API_KEY` y
  `ENCRYPTION_KEY` desde el proyecto `larokifarm-conciliador-albaranes`
  (mismos valores; la `ENCRYPTION_KEY` tiene que ser la misma) → Production →
  Redeploy. Sin ellas no funcionan en producción la conciliación, «Sugerir
  traducción» ni las claves propias de «Uso de IA».

- [ ] **Web3Forms** (avisos de "Ayuda y soporte" y de errores reportados):
  crear la clave en web3forms.com con el correo donde quieres recibirlos y
  añadir `NEXT_PUBLIC_WEB3FORMS_KEY` en **`larokifarm`** (Production) +
  Redeploy. En local, en `apps/backoffice/.env.local` y reiniciar `pnpm dev`.
- [ ] **`larokifarm-torrents`** y **`larokifarm-chamarro`** → Settings →
  Environment Variables: borrar `CONTENT_SOURCE`, `PUBLIC_SANITY_PROJECT_ID` y
  `PUBLIC_SANITY_DATASET` (ya no se leen).
- [ ] **`larokifarm`** (backoffice): borrar `SCOUT_STANDALONE_URL` y
  `CONCILIADOR_STANDALONE_URL` (ya no se leen).
- [x] Proyecto `scout` / dominio `scout.larokifarm.com`: nunca existió.

## 4. Suscripciones y claves

- [ ] **ScraperAPI**: dar de baja la suscripción (solo la usaba el Scout antiguo).
- [ ] **Clave de Gemini del Scout antiguo**, si era una clave propia (no la
  `GEMINI_API_KEY` del backoffice/conciliador): revocarla en Google AI Studio.
- [ ] **NO** revocar el secreto de Azure (`AZURE_CLIENT_SECRET`): es la misma
  aplicación que usa `inventory-sync` para leer el inventario de SharePoint.

## 5. En tu ordenador

- [ ] `apps/backoffice/CUENTAS.md` (contraseñas de prueba; está en `.gitignore`):
  borrarlo cuando ya no lo necesites.
- [ ] `test.md` en la raíz del repo (lista de CN sin seguimiento): borrarlo si ya
  no sirve.

## Siguiente: reseñas de Google

Ver `docs/plan-resenas-google.md`. Lo primero (Fase A) es generar la llave de
Google con la cuenta propietaria y guardarla en Vercel.
