# Reseñas de Google · Onboarding de farmacias nuevas

Runbook para sincronizar reseñas de Google Business Profile de cualquier farmacia
nueva (Laguna, Broggi, Chamarro, etc.) usando la **misma infraestructura** que
ya está montada para Torrents.

> **TL;DR**: la solicitud de acceso a la Business Profile API que se mandó para
> Torrents cubre **todas** las farmacias futuras. No hay que repetir el
> formulario, ni crear otro proyecto en Google Cloud, ni rehacer OAuth. Sólo
> hace falta (1) invitar como gerente la cuenta de Google del proyecto a la
> ficha del nuevo negocio, (2) localizar el `googleLocationName` de esa ficha y
> (3) pegarlo en el doc `farmacia` correspondiente en Sanity.

---

## Qué se reutiliza vs qué hay que hacer por farmacia

| Recurso | ¿Reutilizable? | Detalle |
|---|---|---|
| Proyecto Google Cloud (`larokifarm-resenas`, número `395886444082`) | ✅ Una vez | Sirve para llamar al API de cualquier location a la que el OAuth user tenga acceso. |
| Aprobación de la Business Profile API (caso `4-0062000040429`) | ✅ Una vez | Es a nivel de proyecto, no por negocio. |
| OAuth Client ID + `refresh_token` | ✅ Una vez | Mismo token funciona para todas las locations donde la cuenta sea manager. |
| Worker Cloudflare en cron | ✅ Una vez | Itera todas las `farmacia` con `googleLocationName` rellenado. |
| Schema `resenaGoogle` y componente `ResenasGoogle.astro` | ✅ Una vez | Cada doc lleva un `farmacia._ref` que aísla las reseñas por negocio. |
| **Invitar la cuenta Google del proyecto como gerente** | ❌ Cada farmacia | El dueño del nuevo negocio debe añadirla desde Google Business Profile. |
| **Localizar `googleLocationName`** | ❌ Cada farmacia | Resource name único de cada ficha. |
| **Rellenar `googleLocationName` y `googleMapsUrl` en Sanity** | ❌ Cada farmacia | El Worker no descubre locations solo, hay que decirle a cuál apuntar. |

---

## Pre-requisitos antes de empezar

Comprobar que la infraestructura base está operativa:

- [ ] La API Business Profile fue aprobada para el proyecto `larokifarm-resenas`
      (caso `4-0062000040429`). Verifícalo entrando a
      [console.cloud.google.com](https://console.cloud.google.com/), seleccionando
      el proyecto y buscando en "APIs y servicios > Biblioteca" que la
      **"Google My Business API"** aparezca como **Habilitada**.
- [ ] El Worker de sincronización (`workers/google-resenas/`) está desplegado y
      con los secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y
      `GOOGLE_REFRESH_TOKEN` configurados.
- [ ] Tienes en Sanity un documento `farmacia` para el nuevo negocio (creado
      manualmente desde el Studio, con sus campos básicos: `nombre`, `slug`,
      `direccion.ciudad`, etc.).

Si algo de lo anterior NO está, ese paso es bloqueante y hay que resolverlo
primero. Mira [`memory/reference_google_business_profile_api.md`](./.claude/projects/-Users-erick-Documents-proyects-zpj-larokifarm/memory/reference_google_business_profile_api.md)
para el estado actual de la aprobación.

---

## Paso 1 · Invitar como gerente la cuenta del proyecto a la nueva ficha

La cuenta Google que generó el `refresh_token` (la cuenta admin del proyecto
`larokifarm-resenas`) tiene que aparecer como **manager** en el Google Business
Profile de la nueva farmacia. Sin esto el API devuelve `403 Permission denied`
al pedir las reseñas de esa location.

**Quién lo hace**: el propietario actual del negocio en Google Maps (Laguna,
Broggi, Chamarro…). Es operación manual desde su sesión.

**Cómo**:

1. El propietario inicia sesión en
   [business.google.com](https://business.google.com/) con la cuenta que ya
   tiene admin/owner del perfil de su farmacia.
2. Selecciona el negocio.
3. Menú **⚙ Configuración → Usuarios → Añadir usuarios**.
4. Introduce el email de la cuenta Google del proyecto larokifarm-resenas.
5. Asigna rol **"Gerente"** (es suficiente para leer reseñas; no hace falta
   "Propietario").
6. Click **Invitar**.

**Aceptación**:

1. La cuenta invitada recibe un email "te han invitado a gestionar X".
2. Abrir email → click "Aceptar invitación" → confirmar.
3. Listo. En business.google.com debería aparecer el nuevo negocio en el listado.

**Verificación rápida**: con la cuenta del proyecto, ir a business.google.com
y comprobar que el negocio aparece. Si no, el dueño envió la invitación a un
email distinto o aún no la aceptaste.

---

## Paso 2 · Obtener el `googleLocationName`

Resource name con formato `accounts/{accountId}/locations/{locationId}`. Se
descubre llamando al endpoint `accounts.locations.list` del API.

Para esto hay dos opciones:

### Opción A · Usando el script `listar-locations.ts` del studio (recomendado)

> Este script se añadirá cuando el Worker esté implementado (#16/#17). Lo
> documentamos aquí para que la rutina quede completa. Cuando se cree,
> actualizar este apartado con el comando exacto.

```sh
cd studio
pnpm exec sanity exec scripts/listar-locations.ts --with-user-token
```

Salida esperada:

```
Cuentas accesibles:
  · accounts/111222333  ("Cuenta personal — Erick")

Locations en accounts/111222333:
  · accounts/111222333/locations/123456789  "Farmàcia Torrents · Barcelona"
  · accounts/111222333/locations/987654321  "Farmàcia Laguna · Barcelona"   ← NUEVA
  · accounts/111222333/locations/555555555  "Farmàcia Broggi · Barcelona"   ← NUEVA
```

Anota el resource name de la nueva farmacia (ej.
`accounts/111222333/locations/987654321` para Laguna).

### Opción B · Llamada manual al API con curl

Si el script aún no existe, hazlo manualmente.

1. Obtén un access token fresco a partir del refresh_token (válido 1h):

   ```sh
   curl -s https://oauth2.googleapis.com/token \
     -d client_id=<CLIENT_ID> \
     -d client_secret=<CLIENT_SECRET> \
     -d refresh_token=<REFRESH_TOKEN> \
     -d grant_type=refresh_token | jq -r .access_token
   ```

2. Lista las cuentas accesibles:

   ```sh
   curl -s -H "Authorization: Bearer <ACCESS_TOKEN>" \
     https://mybusinessaccountmanagement.googleapis.com/v1/accounts | jq
   ```

3. Por cada `accounts/{id}`, lista las locations:

   ```sh
   curl -s -H "Authorization: Bearer <ACCESS_TOKEN>" \
     "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{ID}/locations?readMask=name,title" | jq
   ```

Busca el `name` cuyo `title` sea el de la nueva farmacia.

---

## Paso 3 · Configurar el doc `farmacia` en Sanity

1. Abre el Sanity Studio en el workspace **"Contenido editorial"**
   (`/calendario`).
2. Navega a **Farmacia → la nueva farmacia → Ficha**.
3. Rellena los dos campos de Google Business Profile:
   - **Google Business Profile · Resource name**: pega el `googleLocationName`
     del paso 2 (formato `accounts/X/locations/Y`).
   - **Google Maps · URL pública**: ve a maps.google.com, busca la farmacia,
     click "Compartir" → "Copiar enlace". Pega esa URL aquí.
4. Click **Publicar**.

---

## Paso 4 · Probar la sincronización

### Opción A · Esperar al cron

El Worker corre 1-2 veces al día. En la siguiente ejecución detectará la nueva
`farmacia` con `googleLocationName` rellenado, hará la llamada al API y creará
los docs `resenaGoogle` con `farmacia._ref` apuntando a la nueva farmacia.

### Opción B · Disparar manualmente

Para no esperar, llamar al Worker con un trigger HTTP (cuando esté implementado
en #17 expondremos un endpoint `/sync` protegido por secret).

```sh
curl -X POST https://worker.dominio/sync \
  -H "Authorization: Bearer <SYNC_SECRET>"
```

### Verificar el resultado

En el Sanity Studio:

1. Abre la nueva farmacia en el menú "Farmacia → su nombre".
2. Click en el panel hijo **⭐ Sus reseñas**.
3. Deberían listarse las reseñas que Google tiene de esa farmacia.

En el sitio público (si la nueva farmacia tiene su propia landing desplegada):

1. Visita `https://<dominio-de-esa-farmacia>/`.
2. El bloque de reseñas debería aparecer entre About y FAQs.
3. Visita `/resenas` para ver el listado completo con filtros por estrellas.

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| API responde `403 PERMISSION_DENIED` para la nueva location | La cuenta del proyecto no es manager todavía o la invitación no se aceptó | Reabrir invitación desde business.google.com → aceptarla con la cuenta del proyecto. |
| API responde `404 NOT_FOUND` para `accounts/X/locations/Y` | `googleLocationName` mal copiado | Volver al paso 2 y verificar el resource name exacto. |
| No aparecen reseñas en Sanity tras el cron | El `googleLocationName` está vacío en el doc farmacia | Comprobar en Studio → Farmacia → Ficha que el campo está rellenado y publicado. |
| Aparecen pero la landing no las muestra | El slug de la farmacia en `PUBLIC_FARMACIA_SLUG` del build no coincide | Verificar que el `.env` de la app (Cloudflare Pages / local) tiene el `PUBLIC_FARMACIA_SLUG` correcto. |
| Cuota de Google API agotada | El API tiene rate limits por proyecto | Reducir frecuencia del cron o solicitar a Google ampliación de cuota desde la consola. |
| Reseñas "desaparecen" en la landing | El editor marcó `oculta = true` en la reseña en Sanity (o Google las borró y el Worker las marcó `eliminadaEnGoogle = true`) | Revisar los flags en el doc `resenaGoogle`. |

---

## Resumen visual del flujo

```
  ┌─ Una vez (ya hecho para Torrents) ──────────────────────┐
  │  Google Cloud project + APIs + form approval + OAuth    │
  │  refresh_token + Worker desplegado en Cloudflare        │
  └─────────────────────────────────────────────────────────┘
                          │
                          ▼
  ┌─ Por cada farmacia nueva ───────────────────────────────┐
  │  1. Su dueño invita la cuenta del proyecto como manager │
  │     desde business.google.com                           │
  │  2. listar-locations.ts → copiar el resource name       │
  │  3. Pegar resource name + URL de Maps en Sanity         │
  │  4. Esperar al cron (o dispararlo) y verificar          │
  └─────────────────────────────────────────────────────────┘
```

---

## Recursos relacionados

- `studio/schemas/farmacias/farmacia.ts` — schema con los campos
  `googleLocationName` y `googleMapsUrl`.
- `studio/schemas/farmacias/resenaGoogle.ts` — schema de cada reseña.
- `apps/torrents/src/lib/sanity.ts` — funciones `obtenerResenasGoogle` y
  `listarResenasGoogle` que consumen los datos.
- `apps/torrents/src/components/ResenasGoogle.astro` — slider auto-rotativo en
  la landing.
- `apps/torrents/src/pages/[...lang]/resenas.astro` — página dedicada con
  listado completo y filtros.

Para el estado actual de la solicitud original a Google ver
[`reference_google_business_profile_api.md`](./.claude/projects/-Users-erick-Documents-proyects-zpj-larokifarm/memory/reference_google_business_profile_api.md).
