# Conciliador de Albaranes — Plan de implementación

> Complementa a `conciliador-albaranes-CONTEXT.md`. Define arquitectura, fases y la
> estrategia de **dos modos** (emparejado manual / masivo). Decisiones del cliente ya
> confirmadas se marcan ✅; pendientes ⏳.

## 0. Decisiones confirmadas (11-jun-2026)

- ✅ C.N. del pedido = columna **`CodigoArticulo`**.
- ✅ `%Descuento` viene como **`21`** (no fracción) → comparar directo, sin ×100.
- ✅ `Precio` del Excel = **PVL (base)** → comparar contra `precio_unitario` del albarán.
- ⏳ **Código de proveedor (punto #1):** los PDFs no siempre lo traen (algunos traen
  código de albarán/cliente/pedido). Se consultó al cliente si el **Excel de pedido**
  incluirá nº + nombre de proveedor. **Pendiente de confirmar.**

## 1. Estrategia: dos modos sobre un mismo motor

La comparación, la extracción y la generación de informes son **idénticas** en ambos
modos. Lo único que cambia es **cómo se decide qué albarán va con qué pedido**.

### Modo B — Emparejado manual (réplica mejorada de Drive) — **SE CONSTRUYE YA**
El usuario **empareja él mismo** cada albarán PDF con su pedido Excel (como hacía con
las carpetas por proveedor en Drive). La app **no adivina** nada.
- **No depende del punto #1.** Funciona HOY con el Excel tal cual está.
- Es el flujo actual del cliente, pero sin crear carpetas ni abrir un Excel con botón.

### Modo A — Masivo / auto-emparejado — **SE ENCHUFA DESPUÉS**
El usuario suelta todos los PDFs + todos los Excels y la app empareja sola por
**nombre de proveedor normalizado** (y por nº de proveedor cuando se confirme #1).
- Depende del punto #1 para ser fiable y para resolver ambigüedades (2 albaranes del
  mismo proveedor en un lote).
- Reutiliza el motor entero; solo añade la capa de emparejado + UI de "no emparejados".

> Orden de construcción: **Motor → Modo B → (cuando llegue #1) Modo A.**
> En la UI serán dos pestañas: «Emparejar a mano» y «Masivo».

## 2. Arquitectura

```
apps/conciliador-albaranes/
├─ src/
│  ├─ core/                      ← MOTOR puro, sin Next, compatible con Workers
│  │  ├─ extraerAlbaran.ts       ← PDF (base64) → Gemini → AlbaranData
│  │  ├─ leerPedido.ts           ← xlsx (SheetJS) → PedidoData
│  │  ├─ comparar.ts             ← §9 del CONTEXT (limpiarCN, num, comparación por C.N.)
│  │  ├─ generarInforme.ts       ← Conciliacion → .xlsx (SheetJS) §10
│  │  ├─ proveedor.ts            ← normalizarProveedor() (solo Modo A)
│  │  └─ tipos.ts                ← AlbaranData, PedidoData, LineaConciliada, etc.
│  ├─ app/
│  │  ├─ (gate)/login/           ← clave de acceso MVP (env var)
│  │  ├─ page.tsx                ← UI con 2 pestañas (Modo B / Modo A)
│  │  └─ api/conciliar/route.ts  ← Route Handler (recibe archivos, llama al motor)
│  └─ features/conciliador/      ← componentes UI (pares, resultados, dropzone)
└─ (config OpenNext + Cloudflare)
```

**Clave de diseño:** el `core/` no sabe nada de Next ni de HTTP. Se prueba con tests
unitarios usando un PDF real (DENTAID) y un Excel de ejemplo. Es donde vive el riesgo,
así que se valida primero y aislado.

## 3. API — `POST /api/conciliar`

Stateless, sin BD. Recibe `multipart/form-data`:
- **Modo B:** lista de pares; cada par = 1 PDF + 1 Excel (+ etiqueta opcional).
- **Modo A:** bolsa de PDFs + bolsa de Excels.

Procesa en paralelo (límite de concurrencia ~5–8 para no saturar Gemini ni CPU), con
**manejo de error por archivo** (un PDF ilegible no tumba el lote).

**Respuesta (JSON):**
```jsonc
{
  "resumen": [
    { "id", "proveedor", "estado": "OK|DISCREPANCIAS|SIN_PEDIDO|SIN_ALBARAN|AMBIGUO|ERROR",
      "nDiscrepancias", "nombreArchivo", "informeBase64" }
  ],
  "noEmparejados": [ /* solo Modo A */ ]
}
```
- **Descargas:** cada informe va como base64 en el JSON → descarga individual en cliente.
- **"Descargar todo (ZIP)":** se construye **en el navegador con `fflate`** a partir de
  los base64. Así el servidor sigue 100% stateless y no duplica payload (no hace falta
  guardar el ZIP ni un id temporal).

## 4. UX del Modo B (mejor que Drive)

**Antes (Drive):** crear carpeta por proveedor → meter 2 archivos → abrir Excel → botón
→ ir a `/conciliacion` a buscar resultados. Muchos clics y navegación.

**Ahora (web), 1 sola pantalla:**
1. **Suelta todos los archivos de golpe** en una zona de drop.
2. La app **auto-empareja** PDF↔Excel por **nombre de archivo normalizado** (ej.
   `DENTAID_albaran.pdf` ↔ `DENTAID_pedido.xlsx`). Cada par aparece como una **tarjeta**
   con su chip de PDF + chip de Excel.
3. Los que no casen quedan en una **bandeja "sueltos"** para arrastrarlos a un par a
   mano (o crear par con «+»). Cero carpetas.
4. Botón **«Comparar»** (uno solo para todo el lote).
5. **Resultados en la misma pantalla:** una fila por par → proveedor · ✅ todo coincide /
   ⚠️ N discrepancias · descarga individual. Botón **«Descargar todo (ZIP)»**.

Mejoras de accesibilidad / menos clics:
- Drop masivo + auto-emparejado por nombre (si nombran los archivos de forma mínima,
  casi no tocan nada).
- Arrastrar para corregir, teclado para todo, foco visible.
- Sin navegar carpetas: subir → comparar → descargar, en una vista.

## 5. Fases

- **Fase 0 — Scaffold.** `apps/conciliador-albaranes/` (Next App Router + Tailwind),
  config OpenNext/Cloudflare, env `GEMINI_API_KEY` y `ACCESO_CLAVE`, gate de acceso.
- **Fase 1 — Motor (sin UI).** `core/` + tests con PDF real DENTAID + Excel ejemplo.
  Validar la lógica §9 (limpiarCN, num, tolerancias 0.01) contra resultados conocidos.
- **Fase 2 — API `/api/conciliar` (modo pares).** Cablear el motor; paralelizar; errores
  por archivo.
- **Fase 3 — UI Modo B.** Dropzone + auto-emparejado + tarjetas de par + resultados +
  descargas + ZIP en cliente. **Entregable usable que reemplaza el flujo de Drive.**
- **Fase 4 — Acceso + deploy.** Clave por env, pulido, deploy a Cloudflare.
- **Fase 5 — Modo A (masivo).** Cuando se confirme #1: `normalizarProveedor`,
  auto-emparejado, UI de no emparejados/ambiguos. Añadir match por nº de proveedor
  cuando el Excel traiga las columnas.

## 6. Riesgos / notas

- **CPU en Workers** con lotes enormes (mucho base64 + muchos xlsx): para uso normal
  (~10–15/día) sobra; para 200 de golpe, trocear o Queue (Fase futura, ya en §13 CONTEXT).
- **Gemini key**: solo secret; regenerar la que se filtró en el prototipo.
- **Nombre de salida** sin nº de proveedor fiable: cae a `<nombreProveedor>.xlsx`
  (proveedor extraído por Gemini). Se mejora a `<nº>_<nombre>.xlsx` con #1.
- **Modo B no necesita** las columnas nuevas de proveedor en el Excel → desbloqueado.
```
