# Conciliador de Albaranes

Web app que compara **albaranes PDF** contra el **Excel del pedido** y detecta
discrepancias (unidades, precio, descuento) por producto.

Ver el contexto y el plan en la raíz del repo:
`conciliador-albaranes-CONTEXT.md` y `conciliador-albaranes-PLAN.md`.

## Stack

Next.js (App Router) + Tailwind v4. Procesamiento **stateless** en un Route Handler.
Extracción del PDF con **Google Gemini** (`gemini-2.5-flash`, salida estructurada).
Excel con **SheetJS (`xlsx`)**. ZIP con **`fflate`** (en el navegador). Deploy a
**Cloudflare** vía OpenNext.

## Desarrollo

```bash
pnpm install
cp .env.example .env      # rellena GEMINI_API_KEY
pnpm test                 # tests del motor (Fase 1)
pnpm dev                  # http://localhost:3000
```

## Estructura

```
src/
├─ app/                         # routing + API
│  └─ api/conciliar/route.ts    # POST /api/conciliar (Modo B: pares)
├─ shared/lib/env.ts            # acceso a secrets (Node y Cloudflare)
└─ features/conciliador/
   ├─ core/                     # MOTOR puro (sin Next), con tests
   │  ├─ numeros.ts             # limpiarCN, num
   │  ├─ comparar.ts            # conciliar() — lógica §9
   │  ├─ proveedor.ts           # normalización para Modo masivo
   │  ├─ extraerAlbaran.ts      # PDF → Gemini → AlbaranData
   │  ├─ leerPedido.ts          # xlsx → PedidoData
   │  └─ generarInforme.ts      # Conciliacion → .xlsx
   └─ index.ts                  # API pública de la feature
```

## Estado

- ✅ **Fase 0** scaffold (Next + Tailwind + OpenNext).
- ✅ **Fase 1** motor + tests (`pnpm test`).
- ✅ **Fase 2** API `POST /api/conciliar` (Modo B · pares).
- ⏳ **Fase 3** UI de emparejado manual (réplica mejorada del flujo de Drive).
- ⏳ **Fase 5** Modo masivo (tras confirmar el código de proveedor, punto #1).

## Pendiente conocido

- **Resaltado rojo** de filas con discrepancia en el `.xlsx`: la versión community de
  SheetJS no escribe estilos de celda. Cambiar el escritor de `generarInforme` a
  `xlsx-js-style` (mismo AOA) cuando se quiera el color. Hoy el estado va en columna.
- **Código de proveedor (punto #1):** pendiente de confirmar con el cliente; habilita
  el Modo masivo y el nombre `<nº>_<proveedor>.xlsx`.

## Deploy (Cloudflare)

```bash
pnpm dlx wrangler secret put GEMINI_API_KEY
pnpm dlx wrangler secret put ACCESO_CLAVE
pnpm cf:deploy
```
