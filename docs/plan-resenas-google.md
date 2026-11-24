# Plan: reseñas de Google → base de datos (Torrents y Chamarro)

Estado al 24-11-2026: las reseñas se muestran desde Neon (`content_resenas`):
171 de Torrents, copiadas una vez de Sanity, con las fotos de los autores ya en
R2 ("cero cookies"). La más reciente es del 24-06-2026: **no se actualizan**.
Torrents tiene su ficha (`googleLocationName`); Chamarro, todavía no. El acceso a
la Google Business Profile API está **aprobado** para el proyecto de Google Cloud
`larokifarm-resenas` y vale para todas las farmacias del grupo.

## Qué queremos

- Que cada farmacia con ficha de Google tenga sus reseñas **al día sin tocar nada**
  (nuevas, editadas, respuestas del propietario y borradas en Google).
- Respetar lo que se decide en el backoffice: **ocultar**, **destacar** y el orden.
- Mantener "cero cookies": las fotos de los autores se guardan en R2, nunca se
  enlazan a Google.
- Que la web se actualice sola cuando hay cambios.
- Activar Chamarro (u otra farmacia) en minutos, sin código.

## Cómo funcionará

```
Cada día (Vercel Cron, 06:00)  ──┐
Botón «Sincronizar ahora»       ─┼─► sincronizarResenas(farmacia)
(backoffice, solo admin)         │     1. Google: reviews.list (paginado)
                                 │     2. Neon: alta / cambios / "eliminada en Google"
                                 │     3. R2: foto nueva o cambiada del autor
                                 │     4. Si hubo cambios y la web está publicada:
                                 │        deploy hooks de su landing
                                 └─► Registro: fecha, nuevas, cambiadas, error
```

- **Dónde corre**: en el propio backoffice (Vercel), no en un worker aparte.
  Reutiliza Prisma, el almacenamiento R2 y los deploy hooks que ya existen, y
  cabe de sobra en una petición: son unas pocas llamadas a Google y menos de
  200 reseñas por farmacia.
- **Se retira** `workers/google-resenas` (escribía en Sanity y nunca se activó).
  De él se reaprovecha la lógica de Google: OAuth con refresh token, paginación
  y separar el texto original del "(Traducido por Google)".

### Reglas de la sincronización

| Caso | Qué se hace |
|---|---|
| Reseña nueva en Google | Se crea (`fuente = google`), visible, sin destacar |
| Reseña editada (texto, estrellas o respuesta) | Se actualiza el contenido; se conservan `oculta`, `destacada` y `orden` |
| Ya no está en Google | `eliminadaEnGoogle = true` (no se borra; la web no la enseña) |
| Vuelve a aparecer | `eliminadaEnGoogle = false` |
| Foto del autor nueva o cambiada | Se descarga y se sube a R2; la web la sirve desde el backoffice |
| Reseñas manuales (`fuente = manual`) | No se tocan |
| Error de Google (token caducado, cuota…) | No se toca nada de la BD; se guarda el error y se ve en el backoffice |

## Fases

### Fase A — Llave de acceso (la haces tú, 15 min, una vez)
1. Google Cloud → proyecto `larokifarm-resenas` → **Credenciales** → crear un
   **ID de cliente OAuth** (tipo "Aplicación web") con la URI de redirección
   `https://developers.google.com/oauthplayground`.
2. **Pantalla de consentimiento OAuth** → publicar la app ("En producción").
   Importante: en modo "Prueba" el refresh token caduca a los 7 días.
3. **OAuth Playground** (developers.google.com/oauthplayground) → ⚙️ "Use your
   own OAuth credentials" → scope `https://www.googleapis.com/auth/business.manage`
   → iniciar sesión con la **cuenta Propietaria** de la ficha (la del dominio
   farmaciapediatrica.com) → "Exchange authorization code for tokens" → copiar el
   **refresh token**.
4. Vercel (proyecto del backoffice) → variables `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` y `CRON_SECRET`. Nunca en el
   repo (es público).

### Fase B — Sincronización (código, backoffice)
- `core/farmacias/application/sincronizarResenas.ts` (reglas de arriba) +
  adaptador de Google (`infrastructure/googleResenas.ts`).
- Columnas nuevas en `businesses` (migración aditiva, la ejecutas tú en Neon):
  `resenasSyncAt` (última sincronización correcta) y `resenasSyncError`.
- Ruta `GET /api/cron/resenas` protegida con `CRON_SECRET` + Vercel Cron diario
  (`vercel.json`). Sincroniza todas las farmacias con ficha.
- Tras sincronizar, si hubo cambios y la farmacia está publicada con «Mostrar
  reseñas»: lanza sus deploy hooks.
- Pruebas: con la ficha real de Torrents (solo lectura en Google) y escritura en
  Neon solo de Torrents; comparar antes/después; nada de datos de prueba.

### Fase C — Pantalla (backoffice, sección Reseñas del editor)
- Línea de estado: "Última sincronización: hoy 06:00 · 3 nuevas, 1 cambiada" o
  el error en lenguaje llano ("Google ha rechazado la llave: hay que renovarla").
- Botón **«Sincronizar ahora»** (solo administrador).
- Para el administrador, **«Elegir ficha de Google»**: lista las fichas a las
  que tiene acceso la cuenta (`accounts.list` + `accounts.locations.list`) y
  guarda `googleLocationName`. Ya no hay que copiar identificadores a mano.

### Fase D — Activar Chamarro (sin código)
1. El propietario de la ficha de Chamarro invita a la cuenta del proyecto como
   **administrador** en business.google.com.
2. Backoffice → Chamarro → Reseñas → «Elegir ficha de Google» → Chamarro.
3. «Sincronizar ahora» → revisar, ocultar o destacar → activar «Mostrar reseñas
   en la web» → «Publicar cambios».

Lo mismo para cualquier farmacia nueva del grupo.

### Fase E — Limpieza
- Borrar `workers/google-resenas` (y su worker en Cloudflare, si llegó a
  desplegarse).
- Actualizar `docs/resenas-google-nuevas-farmacias.md` (todavía habla de Sanity).

## Coste y límites
- La API de Google Business Profile es gratuita. Uso previsto: unas pocas
  llamadas al día por farmacia, muy por debajo de la cuota.
- Vercel Cron (plan Hobby): una ejecución al día; el botón cubre el resto.

## Riesgos
- **Refresh token caducado o revocado** (p. ej. si cambian la contraseña de la
  cuenta propietaria): la sincronización se para sin romper nada y el backoffice
  lo enseña. Solución: repetir la Fase A, paso 3.
- **La API v4 de reseñas** sigue siendo la única que las expone; si Google la
  cambia, solo hay que tocar el adaptador.
