# Conciliador de Albaranes — Soporte Multi-PDF

> Mapeo del problema "información de un mismo envío repartida entre varios PDFs".
> Pendiente de implementar. Complementa a `conciliador-albaranes-CONTEXT.md` y
> `conciliador-albaranes-PLAN.md`.
> Última actualización: 2026-06-23 (reportado por el cliente con casos NESTLÉ y PEROXFARMA).

---

## 1. El problema

Algunos proveedores no mandan **un** PDF con toda la info del envío. Mandan **dos o tres**, con los campos repartidos:

- **Albarán**: cantidades, lote, EAN, a veces C.N., a veces precio neto (sin descuento).
- **Factura**: precio unitario base, descuento(s), importe, a veces C.N., a veces sin EAN.
- **Pedido en PDF** (caso especial): a veces el cliente nos pasa el pedido del cliente como PDF en lugar del Excel.

El flujo actual de la app solo soporta **1 PDF + 1 Excel**. Si el cliente sube solo
el albarán → faltan precios y descuentos. Si sube solo la factura → puede faltar EAN
o C.N. Ninguna línea conciliará bien.

## 2. Casos reales documentados (carpetas en raíz del repo)

### 2.1. NESTLÉ — carpeta `NESTLE/`

3 PDFs del mismo envío (pedido `B2B110468420`, albarán `8116029044`, factura `1390944262`):

| PDF       | Tipo                         | Trae                                                                                         | NO trae                          |
| --------- | ---------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| `B.pdf`   | Albarán                      | EAN UC, EAN UE, código interno Nestlé (`12578223`), descripción, cantidad UC/UE, lote, valor neto | C.N., precio u.c., descuento     |
| `B1.pdf`  | Factura (3 págs)             | EAN UC, código interno, **C.N. a veces** (`CN 183880.3`), precio u.c., descuentos, importe   | (todo cubierto)                  |
| `B2.pdf`  | ⚠️ **Pedido del cliente** (no del proveedor) | C.N., EAN, descripción, unidades, descuento %, precio                                        | —                                |

- B2 **no es complementario** de B/B1 — es el equivalente del Excel del pedido. El usuario confirmó que **los pedidos siempre vendrán en Excel**, así que el caso "pedido en PDF" no hay que soportarlo de momento. Si vuelve a aparecer, B2 sirve de fixture.
- Descuento en la factura B1: viene como **3 líneas** por producto:
  - `Descuento del 20.00%` (descuento principal)
  - `Descuento del 1.50%` (pronto pago / financiero)
  - `Descuento` (sin %) — importe extra que NO debe sumarse
  - **Decisión del cliente**: reportar **21,50%** (20 + 1,5), que es lo que figura en el pedido. El "Descuento" sin % se ignora.

### 2.2. PEROXFARMA — carpeta `PEROX/`

2 PDFs del mismo envío (albarán `ALU-523836`, factura `FA-487169`):

| PDF       | Tipo                  | Trae                                                                          | NO trae                                              |
| --------- | --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `C.pdf`   | Albarán (2 págs)      | GTIN/EAN, **C.N.**, código interno proveedor (`UN14080`), descripción, lote, precio neto, cantidad | descuento explícito (ya viene aplicado)              |
| `C1.PDF`  | Factura (2 págs)      | código interno proveedor (`UN14080`), descripción, IVA, cantidad, Tarifa General, **Descuento de CRM** explícito (`-40,00%`), precio neto, importe | **EAN, C.N.** — solo código interno                  |

**El caso PEROX es el más espinoso**: el cruce entre las líneas del albarán y las de la factura **no se puede hacer ni por EAN ni por C.N.** porque la factura no los trae. La **única clave** común es el código interno del proveedor (`UN14080`, `100000941`, `102032003`, etc.).

Esto implica que `comparar.ts` necesita una **3ª clave de cruce** además de C.N. y EAN: el código interno del proveedor, **sin truncar** (mismo aprendizaje que el caso Perrigo / Marvis — ver sección 5).

## 3. Plan acordado (Fase 2)

Recomendado al cliente y aprobado por él. Espera más casos antes de arrancar.

### 3.1. Cambios en el flujo

1. **Dropzone**: aceptar **N PDFs** del proveedor (1, 2 o 3) + 1 Excel del pedido.
2. **API** (`/api/conciliar`): recibir array de PDFs.
3. **Extracción**: **una llamada Gemini por PDF**, cada una con su prompt (albarán vs factura). Más cara que una sola llamada con todos los PDFs juntos, pero **trazable y testeable**.
4. **Detección de rol** (albarán vs factura): heurística simple por keyword en la 1ª página (`ALBARÁN` vs `FACTURA`).
5. **Fusión** en código puro (`fusionarAlbaranes.ts` nuevo):
   - Clave de fusión por línea: **C.N. → EAN → código interno proveedor**.
   - Prioridad por fuente:
     - `cantidad`, `lote`, `EAN`, `C.N.`: del **albarán**.
     - `precio_unitario`, `descuento`: de la **factura**.
   - **Composición de descuento**: suma de los **% explícitos** (20 + 1,5 = 21,5). Las líneas "Descuento" sin % se ignoran.
6. **Conciliación**: el `AlbaranData` fusionado entra al `conciliar()` actual sin cambios estructurales (sí necesita la 3ª clave — ver sección 4).

### 3.2. Por qué Fase 2 y no Fase 1

Fase 1 = "un único request a Gemini con los N PDFs adjuntos". Se descartó porque:

1. **Composición de descuentos**: pedirle a un LLM con visión que sume porcentajes selectivos por línea es donde más alucina. La composición debe hacerse en código.
2. **Cruce por código interno**: en PEROX no hay otra clave. Si Gemini confunde un código numérico cercano, se cruzan líneas mal y el cliente solo lo ve al final. Mejor cruce determinista.
3. **Trazabilidad**: cuando una factura del mes que viene salga mal (que pasará), con Fase 2 sabes "este precio salió de la factura, este EAN del albarán". Con Fase 1 no.

### 3.3. Estimación

~1-2 días de trabajo bien hecho. Deja una base sólida para añadir formatos nuevos con cambios pequeños en prompts/reglas.

## 4. Cambio independiente que hay que hacer SÍ o SÍ

Aunque no toquemos multi-PDF, el caso PEROX revela que **`comparar.ts` necesita un cruce por código interno proveedor sin truncar**, como 3ª clave después de C.N. y EAN.

Hoy `agrupar()` solo agrupa por C.N. o EAN. Si llega un albarán PEROX-like con solo código interno y el pedido lleva C.N., no cruzaría aunque la extracción fuera perfecta.

Cuando se haga, añadir un test que use el código interno (`UN14080`) como clave y verifique el cruce.

## 5. Lecciones aprendidas relevantes (ya aplicadas en código)

### 5.1. Bug del Marvis / Perrigo (Junio 2026)

`comparar.ts:149` tenía `cnRaw: l.codigo_nacional || l.codigo || ''` como fallback. Cuando el albarán no traía C.N. español (caso Marvis en factura Perrigo), Gemini ponía el código interno largo del proveedor (`5000036689`) en el campo `codigo`. `limpiarCN` truncaba a 6 dígitos (`500003`) y los 4 productos Marvis colapsaban a la misma clave → `agrupar()` sumaba unidades: `36 + 24 + 12 + 24 = 96`.

**Fix aplicado**:
- Quitado el fallback `|| l.codigo` en `cnRaw`.
- Añadido `l.codigo` como fallback en `altRaw` (sin truncar) → no colapsa.
- Comentario explicando el porqué, para que nadie reintroduzca el fallback.

**Implicación para multi-PDF**: el `codigo` interno **nunca** se debe truncar como C.N. Si pasa a ser clave principal de cruce (caso PEROX), va en una rama nueva que lo conserve intacto.

### 5.2. Prompt Gemini reforzado para tablas raras

Añadido bloque "FORMATOS DE TABLA" en `extraerAlbaran.ts` para manejar:
- Cabeceras y filas apiladas en 2 líneas (Perrigo y similares).
- Notaciones de envase `2X6`, `1X12` en la descripción → ignorar para cantidad.
- Cantidad va antes de `ST` / `UN` / `UDS`.
- Sanity check: `cantidad × precio_neto ≈ importe`.

## 6. Estado actual (2026-06-23)

- ✅ **Cambio independiente sección 4** aplicado: 3ª clave de cruce por código interno proveedor en `comparar.ts`. Cubierto por 3 tests nuevos (PEROX simulado, no-colapso Marvis).
- ✅ **Multi-PDF Fase 2** implementado:
  - `tipos.ts`: añadido `tipo_documento` a `AlbaranData` (`'albaran' | 'factura' | 'otro'`).
  - `extraerAlbaran.ts`: prompt actualizado para clasificar el PDF y sumar descuentos % compuestos (caso NESTLE 20% + 1.5% = 21.5%).
  - `fusionarAlbaranes.ts`: función pura que mergea N `AlbaranData` en 1, con **union-find** sobre C.N./EAN/código interno (necesario para PEROX donde la factura solo trae código interno). Prioridad por campo: cantidad/bonif/EAN ← albarán; precio/descuento ← factura.
  - `fusionarAlbaranes.test.ts`: 7 tests cubriendo NESTLE, PEROX, union-find transitivo, descuento 0 de factura, fallback de fuente.
  - `route.ts` (API): acepta `pdfs_i` multivaluado, extrae cada PDF en paralelo, fusiona y concilia.
  - `conciliar.ts` (cliente API): envía `pdfs: File[]`.
  - `emparejar.ts`: agrupa N PDFs con misma clave en un solo par. Nuevo test cubre `NESTLE_albaran.pdf` + `NESTLE_factura.pdf` + `NESTLE_pedido.xlsx`.
  - `ConciliadorView.tsx`: `Par.pdfs: Cargado[]`, UI con N chips PDF + × individual, asignación desde sueltos a cualquier par existente, mensaje informativo cuando un par tiene >1 PDF. Conveniencia: si quedan N PDFs + 1 Excel sueltos sin pareja por nombre, se agrupan en un solo par.
- **Tests totales**: 53/53 verdes.
- **Pendiente real (validación)**: probar contra los PDFs reales de `NESTLE/` y `PEROX/` levantando la app y subiendo los archivos. La extracción de Gemini puede necesitar afinar el prompt al ver los outputs reales.

## 7. Decisiones tomadas durante la implementación

- **Union-find por cualquier identificador compartido** (no solo por clave primaria). Necesario para PEROX: la factura solo trae código interno, el albarán trae C.N. + EAN + código interno; sin union-find no habría forma de cruzarlas.
- **Descuento 0 explícito de la factura se respeta** (no se cae al del albarán). Razonamiento: si la factura dice "sin descuento", manda; si el campo no está informado en la factura, sí buscamos en el albarán.
- **`tipo_documento` lo clasifica Gemini** (en el JSON Schema con enum). Si Gemini devuelve `'otro'`, en la fusión se trata como una fuente más sin preferencia especial.
- **Conveniencia 1-Excel-N-PDFs** para casos donde los nombres no comparten clave: si tras emparejar por nombre queda exactamente 1 Excel suelto + ≥1 PDFs sueltos, se bundlean en un solo par.

## 8. Cómo validar end-to-end

1. `cd apps/conciliador-albaranes && pnpm dev`.
2. Subir los 2 PDFs de `PEROX/` (`C.pdf` + `C1.PDF`) + un Excel con las líneas Perox.
3. Verificar:
   - Se forma **un solo par** con 2 PDFs.
   - Tras "Comparar", precio = tarifa (37,18 €), descuento = 40%, cantidad = 200 — todo coincide con el pedido.
4. Repetir con `NESTLE/B.pdf + B1.pdf` (ignorar `B2.pdf` que es el pedido) + Excel del pedido.
5. Verificar descuento = 21,5% (20 + 1,5 sumados), no el descuento extra.

## 9. Si surgen incidencias

- Si Gemini no clasifica bien (`tipo_documento`): puede que el PDF no tenga las palabras claras. Mirar `lineasCrudas` en el debug de la UI. Ajustar prompt si hace falta.
- Si Gemini no suma bien los descuentos compuestos: refinar el ejemplo del prompt con el caso real visto.
- Si las líneas no se cruzan entre PDFs: comprobar que Gemini extrae `codigo` con el código interno del proveedor (no con el C.N. o EAN). El campo es la "ancla" para PEROX.
