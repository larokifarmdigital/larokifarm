# Plan de implementación · Scout batch masivo (SharePoint)

> Doc de hand-off para retomar el trabajo. Léelo antes de tocar código de la capa batch.

## Qué vamos a hacer, en una frase

Añadir a Scout un botón **"Ejecutar batch"** que lee un Excel de SharePoint (con ~2.500 productos del cliente), compara sus precios en varias farmacias online y devuelve otro Excel descargable con el detalle de precios y farmacias.

## Leyenda de responsables

Cada paso está etiquetado con quién lo hace:

- 👤 **CLIENTE** — lo hace el dueño de la farmacia (o su informático).
- 🛠️ **TÚ (Erick)** — configuración/setup que haces tú una sola vez.
- 🤖 **CÓDIGO** — trabajo de programación (implementación).

---

## Índice de pasos (mapa del plan)

### Parte 1 · Preparar el Excel de entrada (setup inicial)
- 1.1 · 👤 Cliente crea el Excel en SharePoint con columnas `CN | EAN | Nombre`
- 1.2 · 👤 Cliente pulsa "Compartir" y envía el link a Erick
- 1.3 · 🛠️ Erick guarda el link como secret en Cloudflare (`wrangler secret put`)

### Parte 2 · Acceso Azure (ya hecho — se reutiliza cima-chat)
- 2.1 · 👤 Cliente **NO tiene que hacer nada** (admin consent ya está aplicado)
- 2.2 · 🛠️ Erick configura `AZURE_CLIENT_SECRET`

### Parte 3 · Construir la herramienta
- 3.1 · 🤖 Crear el worker `scout-batch-worker`
- 3.2 · 🤖 Endpoints del worker (`/run`, `/jobs/:id`, `/jobs/:id/result`)
- 3.3 · 🤖 Panel batch en Scout (`/batch`)
- 3.4 · 🤖 Autorización de la web con password

### Parte 4 · Contratar ScraperAPI (el mes que se use)
- 4.1 · 👤 Cliente se suscribe al plan Hobby (~46 €/mes) con tarjeta
- 4.2 · 👤 Cliente copia API key y se la envía a Erick
- 4.3 · 🛠️ Erick guarda API key como secret

### Parte 5 · Testing y despliegue
- 5.1 · 🛠️ Erick prueba con 100 productos primero
- 5.2 · 🛠️ Erick ejecuta el batch real (2.500 productos)
- 5.3 · 🛠️ Erick graba Loom explicativo para el cliente

### Parte 6 · Uso normal del cliente (después del setup)
- 6.1 · 👤 Cliente actualiza el Excel si hace falta
- 6.2 · 👤 Cliente reactiva ScraperAPI (46 €)
- 6.3 · 👤 Cliente entra a Scout y lanza el batch
- 6.4 · 👤 Cliente descarga el Excel de resultados
- 6.5 · 👤 Cliente da de baja ScraperAPI hasta el siguiente trimestre

---

## Vista de una tirada · Setup vs Uso trimestral

| Setup inicial (una sola vez) | Uso trimestral (cada 3 meses) |
| --- | --- |
| 👤 Cliente crea el Excel en SharePoint (1.1) | 👤 Cliente actualiza el Excel si hace falta (6.1) |
| 👤 Cliente envía el link a Erick (1.2) | 👤 Cliente reactiva ScraperAPI 46 € (6.2) |
| 🛠️ Erick guarda el link como secret (1.3) | 👤 Cliente entra a Scout y lanza el batch (6.3) |
| 🛠️ Erick configura Azure secret (2.2) | 👤 Cliente descarga el Excel de resultados (6.4) |
| 🤖 Desarrollo del worker + panel (parte 3) | 👤 Cliente da de baja ScraperAPI (6.5) |
| 👤 Cliente contrata ScraperAPI la 1ª vez (4.1) | |
| 🛠️ Erick guarda API key ScraperAPI (4.3) | |
| 🛠️ Erick testing + Loom (parte 5) | |

---

## PARTE 1 · Preparar el Excel de entrada (setup inicial)

Antes de que la herramienta pueda funcionar, tiene que existir un Excel en SharePoint que ella pueda leer.

### Paso 1.1 · Crear el Excel en SharePoint

👤 **CLIENTE**

- Entra a SharePoint (parte de Microsoft 365 / Office 365).
- Crea (o usa uno existente) un archivo Excel llamado, por ejemplo, `productos-a-comparar.xlsx`.
- El archivo debe tener **al menos estas 3 columnas** en la primera fila (los nombres son fijos, case-insensitive):

  | CN | EAN | Nombre |
  | --- | --- | --- |
  | 709527 | 8470007095279 | Apiretal 100 mg/ml gotas orales 30 ml |
  | 653285 | 8470006532850 | Dalsy 40 mg/ml suspensión oral 200 ml |
  | ... | ... | ... |

- Cada fila = un producto que quiere comparar.
- Puede tener otras columnas extra (se ignoran).
- Guarda el archivo en una carpeta accesible dentro de SharePoint.

### Paso 1.2 · Obtener el "link de compartir" del Excel

👤 **CLIENTE**

- Con el Excel abierto en SharePoint, pulsa el botón **"Compartir"** (arriba a la derecha).
- Selecciona **"Copiar vínculo"**.
- Ajustes del vínculo: **"Las personas de la organización con el vínculo pueden ver"** (basta con permiso de lectura).
- Envía ese link a Erick por email o mensaje seguro.

> Ejemplo del link:
> `https://laroki.sharepoint.com/:x:/r/personal/erick_laroki_com/Documents/productos-a-comparar.xlsx?d=w1234...&csf=1&web=1&e=abcdef`

### Paso 1.3 · Guardar el link en Cloudflare (secreto)

🛠️ **TÚ (Erick)**

En tu terminal, con `wrangler`:

```bash
cd apps/scout/worker
pnpm exec wrangler secret put SHAREPOINT_INPUT_URL
# pega el link cuando lo pida
```

Con esto la herramienta ya sabe qué Excel leer. Si en el futuro el cliente cambia el archivo o la carpeta, solo repites este paso.

---

## PARTE 2 · Acceso a SharePoint desde el worker (ya hecho, se reutiliza)

Para que un servidor externo (nuestro worker en Cloudflare) pueda leer un Excel privado del SharePoint del cliente, Microsoft exige registrar una "aplicación" en Azure Entra ID y que el administrador del cliente autorice esa aplicación.

**Buenas noticias**: esto ya está hecho para el widget cima-chat. Reutilizamos la misma app.

| Dato | Valor |
| --- | --- |
| Tenant ID | `73a2959a-f4d7-4ddb-a9d9-108c0d232707` |
| Client ID | `9eb2e975-6e30-41f9-91a2-8c9faf5a503c` |
| Permiso | `Files.Read.All` (aplicación, admin-consented) |
| Client Secret | El mismo que usa cima-chat (o crear uno nuevo dedicado) |

### Paso 2.1 · No hacer nada nuevo en Azure

👤 **CLIENTE** — **no tiene que hacer nada**. El admin consent ya se otorgó cuando pusimos en marcha cima-chat.

### Paso 2.2 · Configurar los secretos en el worker

🛠️ **TÚ (Erick)**

```bash
cd apps/scout/worker
pnpm exec wrangler secret put AZURE_CLIENT_SECRET
# pega el client secret existente (o crea uno nuevo desde Azure Portal)
```

Los otros dos (Tenant y Client ID) van en `wrangler.toml` como vars (no son secretos, son identificadores públicos).

---

## PARTE 3 · Construir la herramienta (desarrollo)

Aquí es donde se escribe el código nuevo.

### Paso 3.1 · Crear el worker `scout-batch-worker`

🤖 **CÓDIGO**

- Nuevo paquete en `apps/scout/worker/` con estructura análoga al de cima-chat.
- Archivos:
  - `graph.ts` — copiado de `apps/inventory-sync/src/graph.ts` (funciones ya probadas: `getAccessToken`, `downloadSharedFile`).
  - `excel-in.ts` — parseo del Excel de entrada, headers `CN, EAN, Nombre`.
  - `excel-out.ts` — generación del Excel resultado (dos hojas: Resumen + Detalle).
  - `scraper.ts` — motor que consulta ScraperAPI (Google Shopping) para cada producto.
  - `job.ts` — persistencia en KV del estado del job y del Excel resultado.
  - `index.ts` — endpoints HTTP + Durable Object para procesamiento largo.
- `wrangler.toml` con:
  - Vars: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`.
  - Secrets: `AZURE_CLIENT_SECRET`, `SHAREPOINT_INPUT_URL`, `SCRAPERAPI_KEY`, `WORKER_AUTH_TOKEN`.
  - KV binding: `SCOUT_JOBS_KV`.
  - Durable Object: `BATCH_JOB`.

### Paso 3.2 · Endpoints del worker

🤖 **CÓDIGO**

| Endpoint | Método | Descripción |
| --- | --- | --- |
| `POST /run` | Dispara un batch. Devuelve `{ jobId }`. Requiere Bearer token. |
| `GET /jobs/:id` | Consulta el estado del job: `pending / running / completed / failed`. |
| `GET /jobs/:id/result` | Descarga el Excel resultado. Solo cuando `status === 'completed'`. |
| `GET /health` | Comprobación de vida. |

### Paso 3.3 · Panel batch en Scout (Next.js)

🤖 **CÓDIGO**

- Nueva ruta `/batch` en Scout.
- Componentes:
  - `core/application/RunBatchUseCase.ts` — coordina la llamada al worker.
  - `core/infrastructure/batch/BatchWorkerClient.ts` — cliente HTTP contra el worker.
  - `ui/features/batch/BatchPanel.tsx` — UI del panel.
- Estados de la UI:
  - **Idle**: botón grande "Ejecutar batch" + aviso "Se procesarán ~2.500 productos, tarda ~2h. Consumo estimado: 46 €".
  - **Confirmando**: modal "¿Confirmas ejecutar el batch? Se contratará el servicio (~46 €)."
  - **Running**: barra de progreso + "1.200 / 2.500 procesados" + tiempo transcurrido.
  - **Completed**: "✓ Terminado en 1h 47min" + botón "Descargar Excel".
  - **Failed**: mensaje de error + botón "Reintentar".
- Polling cada 2s al endpoint `/jobs/:id` mientras esté en running.

### Paso 3.4 · Autorización de la web

🤖 **CÓDIGO**

- La ruta `/batch` va protegida con password (para que no cualquiera pueda lanzar un batch de 46 €).
- MVP: env var `BATCH_PASSWORD` en Vercel + cookie firmada tras el login.

---

## PARTE 4 · Contratar ScraperAPI (el mes que se use)

Cada vez que el cliente quiera lanzar un batch, hay que contratar el servicio de ScraperAPI. Ese servicio es el que consulta los precios en las farmacias online.

### Paso 4.1 · Suscribirse al plan Hobby de ScraperAPI

👤 **CLIENTE**

- Entra a [scraperapi.com](https://www.scraperapi.com).
- Se registra con el email de la farmacia.
- Contrata el plan **Hobby** ($49/mes, 100.000 créditos).
- Paga con tarjeta de la farmacia.

### Paso 4.2 · Copiar la API key

👤 **CLIENTE** → 🛠️ **TÚ (Erick)**

- El cliente entra a su dashboard de ScraperAPI y copia su **API key**.
- Se la pasa a Erick por email o mensaje seguro.

### Paso 4.3 · Guardar la API key en el worker

🛠️ **TÚ (Erick)**

```bash
cd apps/scout/worker
pnpm exec wrangler secret put SCRAPERAPI_KEY
# pega la API key del cliente cuando lo pida
```

---

## PARTE 5 · Testing y despliegue

### Paso 5.1 · Probar con 100 productos primero

🛠️ **TÚ (Erick)**

- El cliente prepara un Excel de prueba con solo 100 productos (o Erick lo hace copiando 100 filas del original).
- Cambias temporalmente el `SHAREPOINT_INPUT_URL` al Excel de prueba.
- Lanzas el batch desde `/batch`.
- Verificas:
  - Tiempo total ≤ 8 min.
  - Créditos consumidos ≈ 2.500 (100 × 25).
  - Excel resultado con dos hojas correctas.
  - Se puede descargar sin problemas.
- Ajustar timing si algo no encaja.

### Paso 5.2 · Ejecutar batch real de 2.500 productos

🛠️ **TÚ (Erick)** (primera vez, luego 👤 **CLIENTE**)

- Cambias el `SHAREPOINT_INPUT_URL` al Excel real del cliente.
- Lanzas el batch.
- Duración esperada: ~2 horas.
- Descargas el Excel resultado y se lo envías al cliente para revisión.

### Paso 5.3 · Capacitar al cliente

🛠️ **TÚ (Erick)**

- Graba un Loom (5 min) explicando:
  - Cómo acceder a `/batch`.
  - Cómo lanzar el batch.
  - Cómo interpretar el Excel resultado (hoja Resumen + hoja Detalle).
  - Qué hacer si algo falla (contactar).

---

## PARTE 6 · Uso normal del cliente (después del setup)

Una vez todo montado, este es el flujo del cliente cada trimestre:

### Paso 6.1 · Actualizar el Excel de productos

👤 **CLIENTE**

- Entra al Excel de SharePoint.
- Añade / quita productos según necesite.
- Guarda. Ya está — no hace falta avisar a nadie, la herramienta lee la versión actualizada cada vez que se lanza.

### Paso 6.2 · Contratar el mes de ScraperAPI

👤 **CLIENTE**

- Entra a scraperapi.com.
- Reactiva la suscripción Hobby (46 €). Solo si estaba dada de baja del trimestre anterior.

### Paso 6.3 · Lanzar el batch en Scout

👤 **CLIENTE**

- Entra a Scout `/batch`.
- Mete la password.
- Pulsa "Ejecutar batch".
- Confirma en el modal.
- Deja la pestaña abierta (o vuelve más tarde — el estado se guarda 7 días).

### Paso 6.4 · Descargar el resultado

👤 **CLIENTE**

- Cuando termina (≈2h), pulsa "Descargar Excel".
- Abre el archivo:
  - **Hoja Resumen**: una fila por producto con precio mín/máx/medio y la mejor farmacia.
  - **Hoja Detalle**: todas las farmacias que venden cada producto, con precio individual y link.
- Usa los datos para ajustar sus precios.

### Paso 6.5 · Cancelar ScraperAPI hasta el siguiente trimestre

👤 **CLIENTE**

- Entra al dashboard de ScraperAPI.
- Da de baja la suscripción.
- No se cobra nada hasta que la reactive.

---

## Anexos técnicos

### Estructura de directorios propuesta

```
apps/scout/
├── src/                              # app Next.js existente
│   ├── app/
│   │   └── batch/                    # NUEVA ruta
│   │       └── page.tsx
│   ├── core/
│   │   ├── application/
│   │   │   └── RunBatchUseCase.ts    # NUEVO
│   │   └── infrastructure/
│   │       └── batch/                 # NUEVO
│   │           └── BatchWorkerClient.ts
│   └── ui/
│       └── features/
│           └── batch/                 # NUEVO
│               └── BatchPanel.tsx
└── worker/                            # NUEVO paquete pnpm workspace
    ├── package.json
    ├── wrangler.toml
    ├── README.md
    └── src/
        ├── graph.ts                   # copia de inventory-sync/graph.ts
        ├── excel-in.ts                # parseo Excel entrada
        ├── excel-out.ts               # generación Excel resultado
        ├── scraper.ts                 # motor batch
        ├── job.ts                     # KV persistence
        └── index.ts                   # handler HTTP + Durable Object
```

### Arquitectura de ejecución

```
Cliente entra a Scout /batch
   │
   ▼
[Ejecutar batch]  ──POST /run──▶  scout-batch-worker (Cloudflare)
                                     │
                                     ├─ 1. Graph: descarga Excel de SharePoint
                                     ├─ 2. Parse xlsx → filas { CN, EAN, Nombre }
                                     ├─ 3. Por cada producto:
                                     │      · ScraperAPI Google Shopping
                                     │      · Filtrado estricto por título
                                     │      · Recolectar cada farmacia con precio
                                     │      · Escribir progreso en KV cada 20 items
                                     ├─ 4. Generar Excel resultado (SheetJS)
                                     │      · Hoja "Resumen"
                                     │      · Hoja "Detalle"
                                     └─ 5. Guardar en KV con TTL 7 días
   ▲
   │  GET /jobs/:id  (polling cada 2s)
   │
Scout muestra: "1.200 / 2.500..."
   │
   ▼
Al terminar → GET /jobs/:id/result → descarga .xlsx
```

### Formato del Excel resultado

**Hoja 1 · "Resumen"** — una fila por producto

| CN | EAN | Nombre | Precio mín | Precio máx | Precio medio | Nº farmacias | Mejor farmacia | URL mejor farmacia | Notas |

**Hoja 2 · "Detalle"** — una fila por (producto × farmacia)

| CN | Nombre producto | Farmacia | Precio | Título encontrado | URL | Fecha |

Ejemplo:

```
709527 | Apiretal 100mg/ml | Atida       | 4.95 € | Apiretal 100 mg/ml solución 30 ml | https://... | 2026-09-16
709527 | Apiretal 100mg/ml | DosFarma    | 5.20 € | APIRETAL Gotas 100 mg/ml Solución | https://... | 2026-09-16
709527 | Apiretal 100mg/ml | Farmacia R. | 4.80 € | Apiretal 100mg/ml solución 30ml   | https://... | 2026-09-16
```

### Riesgos y mitigación

| Riesgo | Mitigación |
| --- | --- |
| ScraperAPI cae mid-batch | Reintentos con backoff exponencial. Si un producto falla 3 veces se marca `Notas: "Timeout"` y se continúa. |
| Cliente lanza batch por error → 46 € | Modal de confirmación obligatoria antes de POST /run. |
| Excel cambia headers | Validar al arranque. Si faltan `CN`, `EAN` o `Nombre` (case-insensitive), abortar con mensaje claro. |
| KV supera límites | Escritura cada 20 productos, ≈125 writes por batch. Muy dentro de límites. |
| Excel resultado grande | Con 2.500 filas resumen + 15.000 filas detalle ≈ 500 KB. Dentro del límite de 25 MB de KV. |
| Cliente pierde la descarga | Excel queda 7 días en KV. Panel `/batch` muestra siempre el último resultado disponible. |

### Estimación de esfuerzo

- Paso 3.1 (worker): 6-8h
- Paso 3.2 (endpoints): incluido en 3.1
- Paso 3.3 (panel Scout): 3-4h
- Paso 3.4 (auth): 1h
- Paso 5.1 (testing 100): 2-3h
- Paso 5.2 (batch real): 1h
- Paso 5.3 (Loom): 30 min

**Total desarrollo: ≈ 13-16h** repartibles en 3 sesiones. Sin dependencias externas bloqueantes.

> El mapa completo de responsabilidades está al principio del documento en las secciones **"Índice de pasos"** y **"Vista de una tirada"**.
