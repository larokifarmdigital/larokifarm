# Cotización · Scout — Comparador batch de precios farmacéuticos

| Dato | Valor |
| --- | --- |
| **Cliente** | _[Nombre de la farmacia]_ |
| **Preparado por** | Erick _[Apellido]_ |
| **Fecha de emisión** | 2026-09-07 |
| **Validez de la cotización** | 30 días desde la fecha de emisión |
| **Referencia** | SCOUT-2026-Q4-001 |

---

## 1. Resumen ejecutivo

Solución web (Scout) para comparar precios de productos farmacéuticos entre farmacias
online españolas, con dos modos de uso:

- **Web on-demand**: portal para búsquedas puntuales por CN, EAN o nombre. Ya
  desarrollado. Incluye escáner de código de barras, información oficial CIMA/AEMPS,
  historial local y comparación multi-producto.
- **Batch trimestral automatizado**: procesamiento masivo del catálogo del cliente
  (2.500 productos aprox.) cada 3 meses. Lee la lista desde SharePoint / Excel,
  ejecuta la comparación contra 5-10 farmacias por producto vía Google Shopping,
  y devuelve un Excel con los precios encontrados.

## 2. Alcance funcional

### 2.1 Incluye

- Motor batch-optimizado (Google Shopping) con:
  - Filtro estricto por título del producto para descartar variantes/otros formatos.
  - Paralelización controlada (respeta límites de la API).
  - Reintentos automáticos si un producto falla.
  - Log detallado por producto (créditos consumidos, farmacias encontradas).
- Ingreso de datos: lectura de un **Excel** con columnas `CN, EAN, Nombre`.
- Salida: **Excel de resultados** con columnas por producto:
  `CN, EAN, Nombre, Precio Mín, Precio Máx, Precio Medio, N° Farmacias,
  Mejor Farmacia, URL Mejor Farmacia, Fecha ejecución`.
- Panel simple de ejecución: correr el batch, ver progreso, descargar el Excel resultado.
- Portal web ya desarrollado con: búsquedas manuales, escáner, info CIMA, historial,
  compartir por URL, PWA installable, dark mode.
- Deploy en Vercel + documentación de operación.
- Capacitación (1 sesión de 1h) para el equipo del cliente.

### 2.2 No incluye

- Integración con software de gestión farmacéutica interno del cliente (Bitfarma,
  Farmatic, etc.). Cotizable aparte.
- Alertas automáticas de precio por email/SMS. Cotizable aparte.
- Cobertura de farmacias que **no están en Google Shopping** (algunas locales muy
  pequeñas). Para máxima cobertura se requiere motor híbrido (~4x más caro).
- Almacenamiento histórico de precios entre batches en base de datos (cotizable aparte
  si se requiere análisis de tendencias).
- Soporte 24/7. El servicio se ofrece con respuesta best-effort en horario laboral.

## 3. Estimación técnica

### 3.1 Volumen

| Métrica | Valor |
| --- | --- |
| Productos por batch | ~2.500 |
| Batches al año | 4 (uno cada 3 meses) |
| Farmacias por producto (esperado) | 5-10 |
| Tiempo estimado por batch | 3-5 horas de ejecución no supervisada |

### 3.2 Consumo de API (ScraperAPI)

- Motor batch optimizado: **~25 créditos por producto** (solo Google Shopping).
- Consumo por batch: 2.500 × 25 = **62.500 créditos**.
- Consumo anual: 4 batches × 62.500 = **250.000 créditos/año**.

### 3.3 Plan ScraperAPI recomendado

| Plan | Precio | Créditos | Cubre 1 batch? |
| --- | --- | --- | --- |
| Hobby | $49/mes | 100.000 | ✅ Sí, con margen |

**Modalidad**: contratar Hobby durante 1 mes cada trimestre (el mes en que se corre
el batch) y cancelar el resto del tiempo.

## 4. Cronograma de implementación

| Fase | Descripción | Duración estimada | Entregable |
| --- | --- | --- | --- |
| 1 | Motor batch-optimizado (CLI) | 8 h | Script que procesa CSV/Excel local |
| 2 | Integración SharePoint / Excel I/O | 4 h | Lectura y escritura del Excel desde SharePoint |
| 3 | Panel simple de ejecución | 3 h | Botón "Ejecutar batch" desde la web, ver progreso |
| 4 | Testing con batch real (100 productos primero) | 2 h | Reporte de calidad + ajustes |
| 5 | Deploy final + documentación operativa | 2 h | DEPLOY.md + OPERATION.md + Vercel activo |
| 6 | Capacitación al cliente | 1 h | Sesión con el equipo |
| **Total desarrollo** | | **20 h** | |

**Plazo total desde arranque**: 2-3 semanas calendario.

## 5. Inversión

### 5.1 Desarrollo (pago único)

| Ítem | Horas | Tarifa | Subtotal |
| --- | --- | --- | --- |
| Motor batch-optimizado (Fase 1) | 8 h | _[tarifa €/h]_ | _[= 8 × tarifa]_ |
| Integración SharePoint (Fase 2) | 4 h | _[tarifa €/h]_ | _[= 4 × tarifa]_ |
| Panel de ejecución (Fase 3) | 3 h | _[tarifa €/h]_ | _[= 3 × tarifa]_ |
| Testing y ajustes (Fase 4) | 2 h | _[tarifa €/h]_ | _[= 2 × tarifa]_ |
| Deploy y documentación (Fase 5) | 2 h | _[tarifa €/h]_ | _[= 2 × tarifa]_ |
| Capacitación (Fase 6) | 1 h | _[tarifa €/h]_ | _[= 1 × tarifa]_ |
| **Total desarrollo (una vez)** | **20 h** | | **_[€ = 20 × tarifa]_** |

> **Ejemplo con tarifa 45 €/h**: Total desarrollo = **900 €** (una vez).
> **Ejemplo con tarifa 60 €/h**: Total desarrollo = **1.200 €** (una vez).

### 5.2 Infraestructura y APIs (recurrente)

| Servicio | Justificación | Frecuencia | Costo unitario | Anual |
| --- | --- | --- | --- | --- |
| **ScraperAPI Hobby** | 100 k créditos/mes, plan más chico que cubre 1 batch | 4 meses/año (el mes de cada batch) | $49/mes | **$196** |
| **Vercel Pro** | Obligatorio para uso comercial. Timeout 300 s, bandwidth 1 TB. | Anual continuo | $20/mes | **$240** |
| **Google Gemini API** | Fallback IA para casos raros. Consumo mínimo. | Anual | ~$5-10 | **$10** |
| Dominio custom (opcional) | ej. `scout.tuscliente.com` | Anual | ~$15 | $15 |
| **Total infraestructura año 1** | | | | **$461** (~430 €) |

> Conversión aproximada USD → EUR a fecha de la cotización: 1 USD ≈ 0.93 EUR (usar la
> tasa vigente al firmar). Estos servicios se facturan en USD directamente por los
> proveedores.

### 5.3 Mantenimiento (recurrente, opcional)

Ajustes al motor cuando alguna API externa cambie su formato (Google Shopping, CIMA
o el buscador de una farmacia grande) y monitoreo trimestral en los batches:

| Modalidad | Descripción | Costo |
| --- | --- | --- |
| Best effort | Se corrige a demanda cuando algo se rompe, se factura por hora | _[tarifa €/h]_ |
| Contrato de mantenimiento | 2 h/trimestre reservadas para ajustes + supervisión de cada batch | _[8 × tarifa/año]_ |

> **Ejemplo con tarifa 45 €/h**: Mantenimiento contratado = **360 €/año**.

### 5.4 Resumen económico

**Año 1** (setup + operación):

| Concepto | Costo |
| --- | --- |
| Desarrollo inicial (pago único) | _[20 × tarifa €]_ |
| Infraestructura y APIs | ~430 € |
| Mantenimiento (opcional recomendado) | _[8 × tarifa €]_ |
| **Total año 1** | **_[28 × tarifa + 430 €]_** |

**Años siguientes** (solo operación):

| Concepto | Costo |
| --- | --- |
| Infraestructura y APIs | ~430 €/año |
| Mantenimiento (opcional recomendado) | _[8 × tarifa €]_ |
| **Total anual recurrente** | **_[8 × tarifa + 430 €]_** |

> **Ejemplo completo con tarifa 45 €/h**:
> - Año 1: 900 + 430 + 360 = **1.690 €**
> - Año 2 en adelante: 430 + 360 = **790 €/año**

## 6. Condiciones comerciales

- **Facturación desarrollo**: 50% al firmar la cotización, 50% al entregar el motor
  funcionando con el batch de testing (Fase 4 completada).
- **Facturación infraestructura**: se activa cuando el motor batch se ponga en
  producción. El cliente paga directamente a los proveedores (ScraperAPI, Vercel) o
  al desarrollador según acuerdo.
- **Método de pago**: transferencia bancaria en euros.
- **Moneda de referencia infra**: USD, factura del proveedor. La cotización usa una
  conversión estimada.
- **Propiedad intelectual**: el código fuente queda en el repositorio propiedad del
  cliente al finalizar la Fase 5. Documentación entregada en el mismo repo.
- **Garantía**: 30 días post-entrega para corregir bugs sin coste adicional
  (comportamiento distinto al especificado en el alcance).

## 7. Supuestos y consideraciones

- La cotización asume que el cliente entrega el **Excel de productos con las
  columnas `CN, EAN, Nombre` limpias**. Si hace falta procesamiento previo del Excel
  (limpieza de duplicados, normalización de nombres), se cotiza aparte.
- El motor batch cubre farmacias indexadas en **Google Shopping**. Farmacias fuera
  de Google Merchant Center no aparecen. Cobertura esperada: 5-10 farmacias por
  producto en función de la marca y categoría.
- El costo de ScraperAPI reflejado (Hobby, $49/mes × 4) puede variar si el proveedor
  cambia su pricing. Se actualiza al firmar.
- La app Scout ya está desarrollada y funcionando. Esta cotización cubre la
  **capa batch** adicional. Si se pide funcionalidad extra en el portal web
  (widget embebible, alertas, panel admin), se cotiza aparte.

## 8. Alternativa premium considerada (rechazada por cliente)

Para constancia, el cliente evaluó también una alternativa de **motor híbrido continuo
(Google Shopping + Web Search + scraping directo)** con las siguientes características:

- Cobertura: 10-15 farmacias por producto.
- Infra: ScraperAPI Startup $149/mes anual continuo = $1.788/año.
- Total año 1 con esa alternativa: ~2.400 €.

**El cliente confirmó que prefiere la Estrategia D** (batch trimestral, 5-10 farmacias,
pago fijo) por su mejor relación coste/beneficio para su caso de uso trimestral.

## 9. Aprobación

Firmando este documento, el cliente confirma:

- Alcance descrito en la sección 2.
- Estimación de horas y precios de la sección 5.
- Condiciones de la sección 6.
- Supuestos de la sección 7.

<br>

| | |
| --- | --- |
| **Por el cliente** | **Por el proveedor** |
| Nombre: ____________________________ | Nombre: Erick _[Apellido]_ |
| Cargo: ____________________________ | Rol: Desarrollador |
| Firma: ____________________________ | Firma: ____________________________ |
| Fecha: __________ | Fecha: __________ |

---

_Documento generado con Markdown para exportar a PDF (Pandoc, VS Code "Markdown PDF"
o cualquier conversor). Modificá los placeholders `_[…]_` antes de imprimir._
