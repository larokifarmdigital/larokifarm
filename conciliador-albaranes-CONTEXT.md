# Conciliador de Albaranes — Contexto del proyecto

> Documento de contexto para construir la aplicación. Autocontenido: contiene el
> problema, las decisiones ya tomadas y toda la lógica técnica ya validada en un
> prototipo previo (Google Apps Script). El objetivo ahora es construir una **web app
> propia** que reemplace ese prototipo.

---

## 1. Objetivo

Web app para un **almacén / farmacia** que automatiza la **conciliación de albaranes**:
comparar el **albarán en PDF** que envía un proveedor contra el **Excel del pedido**
que el almacén le hizo a ese proveedor, y detectar discrepancias (unidades, precio,
descuento) por producto.

El usuario sube **un lote** de PDFs (albaranes) + Excels (pedidos), pulsa un botón y
obtiene un informe de conciliación por cada albarán, más un ZIP con todos.

## 2. Problema que resuelve

Hoy un empleado revisa a mano cada albarán (200–300/mes, 1–4 páginas) y lo compara
con el pedido. Es lento y propenso a errores de tecleo. La app extrae los datos del
PDF automáticamente y los cruza con el pedido, dejando al humano solo la revisión de
las discrepancias.

## 3. Flujo de la aplicación (stateless, SIN base de datos)

```
El usuario sube N PDFs (albaranes) + N Excels (pedidos)  →  pulsa "Comparar"
        │
        ▼  POST /api/conciliar  (multipart/form-data)
  ┌─ por cada PDF (en paralelo): Gemini extrae datos estructurados + nombre de proveedor
  ├─ por cada Excel: leer nº+nombre de proveedor + líneas del pedido
  ├─ EMPAREJAR cada albarán con su pedido por NOMBRE DE PROVEEDOR (normalizado)
  ├─ por cada par emparejado: generar un .xlsx de conciliación
  │      nombrado  "<nºproveedor>_<nombreProveedor>.xlsx"
  └─ empaquetar todos los .xlsx en un ZIP
        │
        ▼
  Respuesta: resumen (1 fila por albarán con su estado) + ZIP descargable
```

No se guarda nada entre peticiones. Es subir → procesar → descargar.

## 4. Decisiones ya tomadas

- **Stack:** Next.js (App Router) + Tailwind. Procesamiento en un Route Handler.
- **Sin base de datos.** Proceso stateless.
- **Despliegue objetivo:** Cloudflare (preferido). Por eso elegir librerías compatibles
  con el runtime de Workers (ver §6). Vercel es alternativa válida sin fricción.
- **Emparejado albarán↔pedido:** por **nº + nombre de proveedor** (ver §8).
- **Salida:** pantalla de resumen con estado por albarán + descarga individual + botón
  "Descargar todo (ZIP)".
- **Producto:** se concibe como producto potencialmente vendible a otros almacenes,
  no solo para un cliente. Cuidar UX y que sea multi-cliente en el futuro.

## 5. Decisiones pendientes / a confirmar

- Nombre definitivo de la app (propuesto: `conciliador-albaranes`).
- Host final: Cloudflare Workers (vía OpenNext) vs Vercel.
- Control de acceso (login Google, clave/PIN compartida, o Cloudflare Access). MVP:
  una clave de acceso simple por env var es suficiente.
- Confirmar nombres EXACTOS de las columnas de proveedor que el cliente añadirá al
  Excel de pedido (ver §8).

## 6. Stack técnico

- **UI:** Next.js App Router + Tailwind. Subida múltiple de archivos, pantalla de
  resultados, descargas.
- **API:** Route Handler `POST /api/conciliar` que recibe los archivos (multipart) y
  devuelve el resumen + ZIP (o un id temporal para descargar el ZIP).
- **IA / extracción:** Google **Gemini** (`gemini-2.5-flash`) vía `fetch` a
  `generativelanguage.googleapis.com`, con **salida estructurada** (responseSchema).
  La API key va como **variable de entorno / secret**, NUNCA en el código.
- **Excel:** **SheetJS (`xlsx`)** para leer y generar. (Funciona en Node y en Workers.)
- **ZIP:** **`fflate`** (ligero, funciona en Workers). Evitar `exceljs` y `archiver`
  porque son solo-Node y romperían en Cloudflare.
- Coste de Gemini a este volumen (~750 págs/mes): céntimos. Se factura por uso.

## 7. Extracción del PDF (lógica validada)

Cada PDF (puede tener varias páginas) se envía a Gemini junto con este prompt y se
fuerza la salida con un JSON Schema.

**Modelo:** `gemini-2.5-flash`, `temperature: 0`, `response_mime_type: application/json`.

**Prompt:**
```
Eres un extractor de albaranes de proveedores farmacéuticos.
Vienen en muchos formatos; adáptate. Extrae cabecera y TODAS las líneas
(puede haber varias páginas: no te dejes ninguna).
- "cantidad" = unidades servidas (UDS).
- "precio_unitario" = precio base por unidad (ej. PVL/PRECIO).
- "descuento" = porcentaje de la columna DTO (solo el número, ej. 21). Si no hay, 0.
- "codigo_nacional" = columna C.N. si existe; si no, "".
- "proveedor" = nombre del proveedor que emite el albarán (ej. "DENTAID").
- Fechas en formato YYYY-MM-DD.
```

**JSON Schema de salida:**
```json
{
  "type": "object",
  "properties": {
    "numero_albaran": { "type": "string" },
    "proveedor": { "type": "string" },
    "fecha": { "type": "string" },
    "numero_pedido": { "type": "string" },
    "lineas": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "codigo": { "type": "string" },
          "codigo_nacional": { "type": "string" },
          "descripcion": { "type": "string" },
          "cantidad": { "type": "number" },
          "precio_unitario": { "type": "number" },
          "descuento": { "type": "number" }
        },
        "required": ["descripcion", "cantidad", "precio_unitario"]
      }
    }
  },
  "required": ["numero_albaran", "lineas"]
}
```

El PDF se manda como `inline_data` (base64) con `mime_type: application/pdf`.

## 8. Lectura del Excel de pedido + emparejado

El **Excel de pedido lo genera el cliente** desde su ERP. Columnas conocidas (cabecera
en la fila 1):

```
Orden | CodigoArticulo | CodigoAlmacen | UnidadesPedidas | Precio | %Descuento |
ImporteNeto | ImporteLiquido | DescripcionArticulo | FactorConversion_ |
UnidadesPendientes | Estado | FechaNecesaria | FechaRecepcion | FechaTope |
CodigoAgrupacion | UnidadesAgrupacion | AgrupacionesPedidas | Ubicacion |
GrupoTalla_ | GrupoIva | %Iva
```

**Mapeo de columnas usado:**
- Código Nacional → **`CodigoArticulo`** (¡confirmar! podría ser `CodigoAlmacen`; la
  correcta es la que tiene números de 6 dígitos tipo `154054`).
- Unidades → **`UnidadesPedidas`**
- Precio (base) → **`Precio`**
- Descuento (%) → **`%Descuento`**

**Identificación del proveedor:** el cliente **añadirá al Excel** dos columnas con el
**nº de proveedor** y el **nombre de proveedor**. (Confirmar nombres exactos de esas
columnas.) Esas se usan para emparejar y para nombrar el archivo de salida.

**Emparejado albarán ↔ pedido (por proveedor):**
- Del Excel: `nº proveedor` + `nombre proveedor` (explícitos).
- Del PDF: Gemini extrae `proveedor` (nombre, ej. "DENTAID").
- El match real es **por NOMBRE** normalizado: mayúsculas, sin tildes, sin sufijos
  societarios (`S.L.`, `S.A.`, `SL`, `SA`), sin espacios sobrantes. Así "Dentaid S.L."
  empareja con "DENTAID". El nº de proveedor se usa solo para nombrar el `.xlsx`.
- **Casos a manejar explícitamente en la UI (no fallar en silencio):**
  - Albarán sin pedido que empareje → listar como "sin pedido".
  - Pedido sin albarán → listar como "sin albarán".
  - **Dos albaranes del mismo proveedor en un mismo lote** → ambiguo con solo el
    nombre; avisar al usuario para que empareje a mano (limitación conocida del
    emparejado por proveedor).

## 9. Lógica de comparación (validada)

Clave de cruce dentro de un par: el **Código Nacional normalizado a 6 dígitos**.

**Normalización del C.N.** (`limpiarCN`): quitar todo lo no numérico y quedarse con los
**6 primeros dígitos**. Ejemplos: `369694.4` → `369694`; `154054.6` → `154054`.

**Parseo de números** (`num`): soporta coma decimal y `%`. Si es número, se usa tal
cual; si es texto tipo `"2,45"` → `2.45`, `"1.234,56"` → `1234.56`, `"21,00%"` → `21`.

**Comparación por cada C.N.** (unión de los C.N. del pedido y del albarán):
- En pedido **y** albarán:
  - unidades: diferencia > 0.001 → discrepancia "unidades"
  - precio: |dif| > **0.01** → discrepancia "precio"
  - descuento: |dif| > **0.01** → discrepancia "descuento"
  - sin diferencias → `OK`; con diferencias → `DISCREPANCIA: <campos>`
- Solo en pedido → `FALTA EN ALBARÁN` (pedido pero no servido)
- Solo en albarán → `SOBRA EN ALBARÁN (no pedido)` (servido pero no pedido)

> Nota sobre el descuento: confirmar si el Excel guarda `21` o `0,21`. El albarán da
> `21`. Si el Excel usa fracción, normalizar (×100) antes de comparar.

> Nota sobre el precio: se asume que `Precio` del Excel es el **precio base** (sin
> descuento), comparable con el `precio_unitario` (PVL) del albarán. Si fuera el precio
> neto, habría que extraer también el precio neto del albarán y comparar contra ese.

## 10. Informe de conciliación (salida por albarán)

Un `.xlsx` por albarán con:
- Cabecera: nº albarán, proveedor, resultado ("TODO COINCIDE" o "N discrepancias").
- Tabla con una fila por C.N. y columnas:
  `C.N. | descripción | uds pedido | uds albarán | precio pedido | precio albarán |
   dto pedido % | dto albarán % | estado`
- Filas con estado distinto de `OK` resaltadas (fondo rojo claro).

Nombre del archivo: `<nºproveedor>_<nombreProveedor>.xlsx`.

Todos los `.xlsx` se empaquetan en un **ZIP** descargable. Además, la **pantalla de
resultados** muestra una fila por albarán: proveedor · estado (✅ todo coincide /
⚠️ N discrepancias) · enlace de descarga individual, y los no emparejados aparte.

## 11. Seguridad

- **Gemini API key**: como variable de entorno / secret. Nunca en el repo ni en el
  cliente. (En el prototipo previo se filtró una clave; regenerarla.)
- Acceso a la app: MVP con una clave compartida por env var; a futuro login/Cloudflare
  Access.
- Privacidad: Gemini (API) no entrena con los datos enviados. Relevante para farmacia.

## 12. Estructura del proyecto

Convención del repo: apps standalone independientes en `apps/`. Esta app vive en
`apps/conciliador-albaranes/` (Next.js + Tailwind). Seguir las convenciones de Next
(estructura por feature, design system, etc.).

## 13. Casos borde / robustez

- PDFs multipágina: extraer TODAS las líneas (la tabla continúa entre páginas).
- PDFs escaneados (baja calidad): fase posterior; el MVP asume PDFs digitales.
- Lotes grandes: paralelizar las llamadas a Gemini. Si el lote es muy grande y se
  topan límites de CPU/tiempo del runtime, considerar trocear o una cola (a futuro).
- No emparejados y ambigüedades: siempre visibles en la UI, nunca descartados en
  silencio.

## 14. Anexo — ejemplo real de albarán (proveedor DENTAID)

Formato típico (PDF digital, 5 páginas). Columnas de la tabla del albarán:
`CÓDIGO | C.N. | DESCRIPCIÓN | PVL | UDS | IMPORTE PVL | DTO. | BONIF. | PRECIO NETO |
 IMPORTE NETO | IVA | RE | PRECIO FINAL | IMPORTE FINAL`.

- El **C.N.** es el código nacional (ej. `154054.6`) → se normaliza a `154054`.
- **PVL** = precio base unitario → mapea a `precio_unitario`.
- **UDS** = unidades → `cantidad`.
- **DTO.** = descuento % → `descuento`.
- Este formato **no trae lote ni caducidad** (otros proveedores podrían traerlos; el
  esquema es flexible, no farmacéutico-rígido).
- Pie del albarán: "Total uds. sin muestras" (útil como checksum del nº de líneas).

> Existen ~120 formatos de albarán distintos según el proveedor. Por eso la extracción
> es con un LLM (se adapta a cualquier layout), no con plantillas fijas.
