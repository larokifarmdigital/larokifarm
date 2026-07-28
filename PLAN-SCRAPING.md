# Plan: Probe de extracción de precios

## Objetivo

Aplicación Next.js mínima para **medir el hit rate** de extracción de precios sobre URLs de farmacias online.

Las URLs se definen en una constante en el código. La UI las lista y, con un botón por URL, ejecuta la extracción en el servidor y muestra qué devolvió (precio, EAN, estrategia usada) o por qué falló.

Esto **no es el producto final**. Es un banco de pruebas para responder a una pregunta de negocio: *¿qué porcentaje de URLs se pueden extraer sin escribir un adapter manual?* Ese número decide si el proyecto es viable. No añadas base de datos, auth, cron ni persistencia.

## Restricción crítica

**El fetch a las webs externas SIEMPRE ocurre en el servidor.** Nunca desde el cliente: CORS bloquea las peticiones a dominios de terceros. Por eso la ejecución va en una Server Action.

---

## Stack

- Next.js 16 (App Router) — `npx create-next-app@latest`
- TypeScript estricto
- Tailwind CSS
- `cheerio` para parsear HTML
- `zod` para validar
- Node.js 20.9+ (requisito de Next 16)
- **Sin** TanStack Query, sin axios, sin BD. Server Action + `useActionState` basta.

Notas de Next 16 relevantes:
- Turbopack es el bundler por defecto.
- `params` / `searchParams` son async (no los usamos aquí, pero no los escribas síncronos).
- `middleware.ts` pasó a llamarse `proxy.ts` (no lo necesitamos).

---

## Estructura

Sigue las convenciones del proyecto (feature-first + Clean por feature). Como es un probe, **no crees ceremonia vacía**: no hay repositorio HTTP compartido ni interceptors porque no consumimos una API propia, hacemos fetch a HTML ajeno.

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # renderiza <ProbeView />
│   └── globals.css
├── shared/
│   ├── components/atoms/
│   │   ├── Button/
│   │   └── Badge/
│   └── lib/utils.ts                # cn()
└── features/price-probe/
    ├── config/
    │   └── urls.ts                 # ← LA CONSTANTE QUE EDITO YO
    ├── domain/
    │   ├── models/
    │   │   └── Extraction.ts       # tipos del dominio
    │   └── ports/
    │       └── ExtractionStrategy.ts   # interfaz de estrategia
    ├── application/
    │   └── extractPriceUseCase.ts  # la cascada (lógica de negocio real)
    ├── infrastructure/
    │   ├── fetchHtml.ts
    │   └── strategies/
    │       ├── jsonLdStrategy.ts
    │       ├── ogMetaStrategy.ts
    │       ├── microdataStrategy.ts
    │       ├── shopifyStrategy.ts
    │       ├── prestashopStrategy.ts
    │       └── index.ts            # array ordenado de estrategias
    ├── api/
    │   └── probeAction.ts          # "use server"
    ├── components/
    │   ├── UrlRow/                 # una fila: URL + botón + resultado
    │   └── ResultCard/
    │   └── HitRateSummary/
    ├── views/
    │   └── ProbeView.tsx
    ├── lib/
    │   └── parsePrice.ts
    ├── schema.ts
    └── index.ts
```

---

## 1. La constante de URLs

`src/features/price-probe/config/urls.ts`

```ts
// Edito esto a mano. Una URL de ficha de producto por línea.
export const PROBE_URLS: string[] = [
  'https://www.farmaciasdirect.es/products/ducray-kelual-ds-champu-100ml',
  'https://www.promofarma.com/es/thealoz-duo-10-ml/p-23877',
  // ...
];
```

Nada más. Sin objetos, sin metadata. Un array de strings que yo edito.

---

## 2. Dominio

`domain/models/Extraction.ts`

```ts
export type StrategyName =
  | 'json-ld'
  | 'og-meta'
  | 'microdata'
  | 'shopify-js'
  | 'prestashop-ajax';

export type Extraction = {
  via: StrategyName;
  precio: number;
  precioTachado?: number;
  moneda: string;
  enStock?: boolean;
  ean?: string;
  sku?: string;
  nombre?: string;
};

export type ProbeFailure = {
  kind: 'network' | 'http' | 'antibot' | 'no-data';
  message: string;
  status?: number;
  /** true si había <script ld+json> pero sin Product/price utilizable */
  teniaJsonLd?: boolean;
};

export type ProbeResult =
  | { ok: true; url: string; ms: number; data: Extraction }
  | { ok: false; url: string; ms: number; error: ProbeFailure };
```

`domain/ports/ExtractionStrategy.ts`

```ts
import type { CheerioAPI } from 'cheerio';
import type { Extraction } from '../models/Extraction';

export type StrategyContext = {
  url: string;
  html: string;
  $: CheerioAPI;
};

export interface ExtractionStrategy {
  name: string;
  /** Devuelve null si esta estrategia no aplica; el use case pasa a la siguiente. */
  run(ctx: StrategyContext): Promise<Extraction | null> | Extraction | null;
}
```

Esto sí es un port legítimo: hay 5 implementaciones intercambiables. No es ceremonia.

---

## 3. Parseo de precio (importante, no lo simplifiques)

`lib/parsePrice.ts` — las farmacias españolas mezclan formatos: `"12,70 €"`, `"1.234,56"`, `"12.70"`, `1270` (Shopify da céntimos).

```ts
export function parsePrice(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  let s = String(v).trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;

  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');

  if (coma > -1 && punto > -1) {
    // el separador decimal es el que va más a la derecha
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma > -1) {
    // ",dd" al final = decimal; si no, separador de miles
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
```

Incluye tests unitarios de esta función (es donde más bugs silenciosos hay).

---

## 4. Estrategias

Orden de la cascada: **json-ld → og-meta → microdata → shopify → prestashop**.

### jsonLdStrategy (la que más importa)

Es el plan A porque casi todo ecommerce serio publica `schema.org/Product` para que Google muestre el precio en resultados. Detalles que no puedes saltarte:

- Puede haber **varios** `<script type="application/ld+json">`.
- El JSON puede venir envuelto en `@graph`, ser un array, o anidar.
- `@type` puede ser un **array** (`["Product", "Thing"]`), no solo string.
- `offers` puede ser objeto, array, o `AggregateOffer` (ahí usa `lowPrice`).
- Un `JSON.parse` que falle **no debe romper** la estrategia: try/catch y sigue con el siguiente bloque.

```ts
function flattenJsonLd(raw: unknown): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    out.push(n);
    if (n['@graph']) walk(n['@graph']);
  };
  walk(raw);
  return out;
}

const isType = (node: any, type: string) => {
  const t = node?.['@type'];
  return Array.isArray(t) ? t.includes(type) : t === type;
};
```

Extrae: `price`, `priceCurrency`, `availability` (regex `/InStock|LimitedAvailability/i`), y como identificador `gtin13 ?? gtin14 ?? gtin ?? sku`.

### ogMetaStrategy

`meta[property="product:price:amount"]`, `meta[property="og:price:amount"]`, `meta[itemprop="price"]`.

### microdataStrategy

`[itemprop="price"]` → `content` attr o texto. Moneda de `[itemprop="priceCurrency"]`.

### shopifyStrategy

Detecta Shopify por `cdn/shop/` o `shopify` en el HTML. Si la URL matchea `/products/{handle}`, hace fetch a `{url sin query}.js` y lee `variants[0]`.

**Ojo: Shopify devuelve el precio en céntimos.** `variants[0].price / 100`. `barcode` suele traer el EAN → oro.

### prestashopStrategy

Detecta PrestaShop en el HTML. Reintenta la URL con `?ajax=1`; si responde JSON, lee `product.price_amount`.

---

## 5. Use case: la cascada

`application/extractPriceUseCase.ts`

```ts
export async function extractPriceUseCase(url: string): Promise<ProbeResult> {
  const t0 = Date.now();

  const fetched = await fetchHtml(url);
  if (!fetched.ok) return { ok: false, url, ms: Date.now() - t0, error: fetched.error };

  const $ = cheerio.load(fetched.html);
  const ctx = { url, html: fetched.html, $ };

  for (const strategy of STRATEGIES) {
    try {
      const hit = await strategy.run(ctx);
      if (hit) return { ok: true, url, ms: Date.now() - t0, data: hit };
    } catch {
      // una estrategia que peta no debe tumbar la cascada
    }
  }

  return {
    ok: false,
    url,
    ms: Date.now() - t0,
    error: {
      kind: 'no-data',
      message: 'Sin datos estructurados → requiere adapter manual',
      teniaJsonLd: $('script[type="application/ld+json"]').length > 0,
    },
  };
}
```

`teniaJsonLd` es un dato de diagnóstico valioso: distingue "no tiene JSON-LD" de "lo tiene pero no supimos leerlo" (esto último es un bug mío, no una web imposible).

### fetchHtml

```ts
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
```

- Headers: `User-Agent` (el de arriba), `Accept: text/html,...`, `Accept-Language: es-ES,es;q=0.9`.
- `redirect: 'follow'`.
- Timeout de 15s con `AbortSignal.timeout(15000)`.
- Si el status es **403, 429 o 503** → `kind: 'antibot'` (no un error genérico). Esa distinción importa: significa "esta web necesita Playwright/proxy", no "esta web no publica precios".

---

## 6. Server Action

`api/probeAction.ts`

```ts
'use server';

import { z } from 'zod';
import { PROBE_URLS } from '../config/urls';

const inputSchema = z.object({ url: z.string().url() });

export async function probeAction(_prev: unknown, formData: FormData) {
  const parsed = inputSchema.safeParse({ url: formData.get('url') });
  if (!parsed.success) return { ok: false as const, error: 'URL inválida' };

  // Solo permitimos URLs de la constante: evita convertir esto en un SSRF abierto.
  if (!PROBE_URLS.includes(parsed.data.url)) {
    return { ok: false as const, error: 'URL no está en PROBE_URLS' };
  }

  const result = await extractPriceUseCase(parsed.data.url);
  return { ok: true as const, result };
}
```

Devuelve siempre un resultado tipado y serializable. Nunca lances el error crudo al cliente.

**Añade también `probeAllAction()`** que recorre `PROBE_URLS` en **serie** (no `Promise.all`) con una pausa de 2000ms entre peticiones. Es cortesía básica y evita que nos bloqueen. Un botón "Probar todas" en la UI.

---

## 7. UI

Una sola pantalla. Server Component (`page.tsx`) que renderiza `<ProbeView />`.

```
┌─────────────────────────────────────────────────┐
│  Probe de precios          [ Probar todas ]     │
│  Hit rate: 7/10 (70%)                           │
│  json-ld 5 · shopify-js 2                       │
│  Con EAN/SKU: 6/7                               │
├─────────────────────────────────────────────────┤
│ ✅ farmaciasdirect.es              [Probar]     │
│    12,70 € (antes 14,90 €)   [json-ld]  412ms   │
│    EAN 3282770076790                            │
│    Ducray Kelual DS Champú Caspa 100ml          │
│    https://...                                  │
├─────────────────────────────────────────────────┤
│ ❌ farma-vazquez.com               [Probar]     │
│    HTTP 403 (anti-bot)                  89ms    │
│    https://...                                  │
└─────────────────────────────────────────────────┘
```

- `ProbeView` es `"use client"` (necesita estado). Empuja el `"use client"` lo más abajo posible.
- Cada `UrlRow` mantiene su propio estado con `useActionState` + `useFormStatus`. Botón deshabilitado mientras corre.
- Tres estados siempre: **cargando, error y vacío**. El vacío (aún no probado) es parte del diseño.
- `HitRateSummary` calcula: total ok/total, desglose por estrategia, y **cuántos traen EAN o SKU**.

Ese último número es tan importante como el hit rate: sin identificador común no se pueden cruzar farmacias, y un precio que no puedes casar con el de la competencia no sirve para comparar.

---

## 8. Criterio de terminado

- [ ] `npm run dev` levanta sin errores.
- [ ] Edito `PROBE_URLS`, recargo, y veo las URLs listadas.
- [ ] Botón por URL → muestra precio + estrategia + EAN, o el motivo del fallo.
- [ ] "Probar todas" recorre en serie con pausa de 2s.
- [ ] El resumen muestra hit rate, desglose por estrategia y cobertura de EAN/SKU.
- [ ] Un 403 se etiqueta como anti-bot, no como error genérico.
- [ ] `parsePrice` tiene tests y pasa con `"12,70 €"`, `"1.234,56 €"`, `"12.70"`, `1270`.
- [ ] TypeScript estricto, cero `any` sin justificar.

## Fuera de alcance (no lo hagas)

Base de datos, auth, cron, Playwright, proxies, histórico de precios, selectores CSS manuales por dominio, multi-usuario. Todo eso viene después, y solo si el hit rate justifica el proyecto.