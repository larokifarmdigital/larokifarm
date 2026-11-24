# Comparador de precios — Fase 0 (prueba de concepto, 24-11-2026)

Prueba para decidir si el comparador nuevo puede dar precios **verificados**:
buscar cada producto en el buscador de la propia farmacia online y aceptar el
precio solo si la **ficha** muestra el mismo CN o EAN. Si no, "No encontrado".

Es la base de los adaptadores de la Fase 2 (`/scout` en el backoffice). No es
código de la app: no se importa desde ningún sitio.

## Resultado (30 productos: 20 parafarmacia + 10 sin receta)

| Farmacia | Verificados | Cómo busca | Código en la ficha |
|---|---|---|---|
| Farmacia Barata | 30/30 | ajax `/module/is_searchbar/ajaxSearch?s=<CN>` (la página `/busqueda` tiene reto de Cloudflare) | JSON-LD `sku` = CN, `gtin13` = EAN |
| Farmavázquez | 30/30 | API pública de Doofinder por CN (cookie de reto inicial) | "Ref:" y JSON-LD `sku` = CN |
| Farmaciasdirect | 29/30 | API pública de Empathy por EAN o CN | JSON-LD `sku` = CN, `gtin13` = EAN |
| Farmacia en Casa Online | 19/30 (no vende sin receta) | `/busqueda?controller=search&s=<CN>` | "Código:" y JSON-LD `sku` = CN |
| Farmacia Jiménez | 17/30 | `/busqueda/catalogo?q=<CN>&c=parafarmacia\|msr` (JSON) | JSON-LD `sku` = CN |

Descartadas: PromoFarma (bloquea siempre, también con navegador real),
Farmaconfianza (tienda cerrada), Atida y DosFarma (la ficha no muestra el CN;
DosFarma pone captcha tras ~165 peticiones), Arenal (perfumería). Sin
ScraperAPI por decisión de gestión.

Ningún precio equivocado. Los pares parecidos (Frenadol Complex/Forte,
Voltadol 50/100 g, Ricola limón/arándano, Grintuss pediátrico/adulto,
ProFaes4 10/30) se distinguen. Gestión revisó 10 enlaces a mano: correctos.

## Trampas a tener en cuenta en la Fase 2

- **Packs**: fichas con `sku` `CN-N` (Hylo x6, NAN x4). No cuentan como el CN.
- **Precio por cantidad**: en JSON-LD `AggregateOffer`, `lowPrice` es el precio
  de 3+ unidades. Hay que tomar el de 1 unidad (`precioUnidad` en
  `core/precios/infrastructure/web/ficha.ts`; el Scout antiguo usaba `lowPrice`).
- **Precio del buscador desfasado** (Doofinder, Empathy): usar siempre el de la ficha.
- **Descuentos puntuales** (Black Friday): guardar precio tachado y fecha.
- **Dos dominios**: Farmavázquez tiene los medicamentos en `farma-vazquez.com`.
- **Buscadores que devuelven cosas no relacionadas** (Farmacia en Casa):
  verificar siempre en la ficha.
- Máximo 1 petición por segundo por web.

## Ejecutar

Los adaptadores de esta prueba importan `cheerio`, que está instalado en el
backoffice (los de producción viven en `src/core/precios/infrastructure/farmacias`):

```bash
node apps/backoffice/docs/scout-fase0/ejecutar.mjs farmaciabarata
```

Las claves públicas de Doofinder y Empathy se leen del HTML de cada web en
cada ejecución; no se guardan en el repo.
