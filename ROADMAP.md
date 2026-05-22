# cima-chat — Roadmap e ideas

Documento vivo con (a) coste real de añadir IA y (b) funcionalidades útiles que se pueden montar sobre la API de CIMA además del lookup básico que ya tenemos.

---

## 1. Coste de añadir IA al chat

### Consumo por consulta (estimación realista)

Una pregunta tipo *"mi hijo de 16 tiene fiebre, ¿qué le doy?"* gasta:

- **Input**: ~5.000–10.000 tokens (instrucciones de seguridad + resultados de `buscarEnFichaTecnica` + 2-3 secciones de Ficha Técnica fetched como contexto).
- **Output**: ~300–500 tokens (respuesta + disclaimers).

### Planes gratis viables

| Proveedor | Modelo | Cuota gratis | Suficiente para |
|---|---|---|---|
| **Google Gemini** | Flash | 15 req/min · **1.500 req/día** · ~1M tokens/día | Landing con tráfico medio |
| **Groq** | Llama 3.3 70B | ~30 req/min | Demos, pruebas |
| **Cloudflare Workers AI** | Llama 3.1 8B / 70B | 10.000 neuronas/día | Landing pequeña, todo en CF |
| **Anthropic Claude** | cualquiera | $5 crédito inicial al alta (≈400–500 consultas con Haiku) | Validar la idea |

### Coste mensual estimado por volumen

Usando **Claude Haiku 4.5** ($1 input / $5 output por millón de tokens), con prompt caching activo:

| Consultas/mes | Haiku 4.5 | Sonnet 4.6 | Gemini Flash (pago) |
|---|---|---|---|
| 100 | ~$0,10 | ~$0,50 | ~$0,05 |
| 1.000 | ~$1 | ~$5 | ~$0,50 |
| 10.000 | ~$10–12 | ~$50 | ~$5–7 |
| 100.000 | ~$100 | ~$500 | ~$50–70 |

### Combinación recomendada

- **MVP / validación**: Gemini Flash (gratis) + Cloudflare Worker (gratis) → **0 €/mes** hasta 1.500 consultas/día.
- **Producción farmacia**: Claude Haiku 4.5 + Worker + caché 24h de respuestas frecuentes → **$10–40/mes** para tráfico habitual de una farmacia online.

### Restricciones operativas (no negociables)

- **Backend obligatorio**: la API key NUNCA en el navegador. Cloudflare Worker o Vercel function gratis.
- **Rate-limit por IP** en el Worker (20 líneas de código) para que un bot no vacíe la cuota.
- **Caché de Q&A** con TTL 24h sobre preguntas comunes ("fiebre niños", "embarazo paracetamol") → multiplica x10 lo que aguanta el plan gratis.
- **Audit log** de consultas (cumplimiento farmacéutico).

---

## 2. Qué más se puede hacer con CIMA

CIMA es mucho más que "dame la ficha de X". Endpoints clave probados con respuesta real:

### 2.1 Búsqueda multi-criterio en Ficha Técnica

`POST /buscarEnFichaTecnica` acepta **varias condiciones combinadas** (`contiene: 1` = incluye, `contiene: 0` = no incluye).

Ejemplos validados contra la API:

```json
// "Indicado para migraña pero SIN contraindicación de embarazo" → 45 resultados
[
  {"seccion":"4.1","texto":"migraña","contiene":1},
  {"seccion":"4.3","texto":"embarazo","contiene":0}
]
```

**Funcionalidades posibles:**
- 🔍 **Buscador por síntoma "seguro para embarazada"**.
- 🔍 **"Medicamentos para X que NO contengan Y"** (alergias).
- 🔍 **"Antihistamínicos sin sedación"** (4.1 + 4.7 sin "somnolencia").

### 2.2 Filtros del listado `/medicamentos`

Parámetros validados que el endpoint acepta y devuelven datos reales:

| Filtro | Significado | Total en CIMA (a fecha de hoy) |
|---|---|---|
| `practiv=ibuprofeno` | por principio activo | varios miles |
| `atc=M01AE01` | por código ATC (clasificación clínica) | 203 (ibuprofeno) |
| `receta=0` | solo OTC (sin receta) | 1.071 con paracetamol |
| `comerc=1` | solo comercializados ahora | — |
| `triangulo=1` | seguimiento adicional ▼ | 658 |
| `huerfano=1` | medicamentos huérfanos | 246 |
| `biosimilar=1` | biosimilares | 350 |
| `generico=1` | EFG | — |
| `nombre`, `laboratorio`, `cn` | búsqueda directa | — |
| `vmp`, `vmpp` | conceptos virtuales (SNOMED) | — |

**Funcionalidades posibles:**
- 🟢 **"Solo dame OTC"**: filtra `receta=0&comerc=1` y desaparecen los que necesitan prescripción.
- 🟢 **Comparador genérico vs marca** del mismo `practiv`.
- 🟡 **Explorador por categoría ATC** ("antiinflamatorios", "antihistamínicos H1") en árbol clínico.

### 2.3 Presentaciones (CN, formatos, tamaños)

`GET /presentaciones?nregistro=X` → todas las presentaciones (envases, dosis) con su **CN (Código Nacional)**.

**Funcionalidades:**
- 📦 **Buscador por CN** ("escanea la caja con la cámara → te digo qué es"): el Código Nacional es lo que aparece en cada caja.
- 📦 **Comparar formatos**: "¿este viene en granulado además de comprimidos?".

### 2.4 Problemas de suministro (gold)

`GET /psuministro` → catálogo de medicamentos con falta de suministro **mantenido por AEMPS en tiempo real**.

- 833 problemas registrados, ~5 activos por principio activo común.
- Cada entrada: nombre, CN, fechas, motivo, observación.

**Funcionalidades posibles:**
- ⚠️ **Aviso de desabastecimiento**: usuario consulta un medicamento → el chat le avisa "este formato está en problemas de suministro hasta el 31/08, alternativas con el mismo principio activo: …".
- ⚠️ **Buscador "¿qué tomo en lugar de X?"** cruzando `practiv` con presentaciones disponibles.
- ⚠️ Para una farmacia online: badge en el catálogo enlazando a alternativas equivalentes.

### 2.5 Notas de seguridad AEMPS

`GET /notas?nregistro=X` → comunicaciones oficiales de la AEMPS para ese medicamento.

Ejemplo real para ibuprofeno: nota "RIESGO CARDIOVASCULAR DE DOSIS ALTAS" (04/2015) con URL al texto completo.

**Funcionalidades:**
- 🚨 **Alertas regulatorias** automáticas: si el medicamento tiene nota de seguridad, mostrarla destacada en la ficha del chat.
- 🚨 **Newsletter / feed**: "este mes nuevas advertencias AEMPS para…".

### 2.6 Registro de cambios

`GET /registroCambios?fecha=DD/MM/AAAA` → cambios en fichas técnicas, prospectos y materiales desde una fecha (67.520 registros en histórico).

**Funcionalidades:**
- 🔄 **Monitor diario** para personal de farmacia: "estas 12 fichas técnicas se actualizaron ayer".
- 🔄 Útil para profesionales sanitarios, no tanto para paciente final.

### 2.7 Fotos del medicamento

URLs públicas tipo `https://cima.aemps.es/cima/fotos/full/formafarmac/{nregistro}/{nregistro}_formafarmac.jpg`.

- `formafarmac` → foto de la pastilla/comprimido.
- `materialas` → foto de la caja/envase.

**Funcionalidades:**
- 📸 **"¿Es esta tu pastilla?"** mostrando la foto oficial junto a la información.
- 📸 **Identificador visual** para personas mayores que tienen muchos blisters mezclados.

### 2.8 Documento segmentado completo

Además de secciones individuales (lo que usamos hoy), también:

- `GET /docSegmentado/contenido/1?nregistro=X` (sin `seccion`) → texto plano íntegro de la Ficha Técnica.
- `GET /docSegmentado/secciones/2?nregistro=X` → índice del Prospecto con sus secciones (lenguaje paciente, más legible).

**Funcionalidades:**
- 📖 **Modo "lectura completa"** para el usuario que quiere leer todo.
- 📖 **Modo "paciente" vs "profesional"**: paciente → prospecto, profesional → ficha técnica.
- 📖 Base para RAG con LLM: cargar prospecto entero como contexto.

---

## 3. Ideas de producto rankeadas

Ordenadas por **valor para el usuario × facilidad de implementar**:

| # | Idea | Endpoint(s) | Esfuerzo | Valor |
|---|---|---|---|---|
| 1 | Filtro "solo OTC" en la búsqueda actual | `?receta=0&comerc=1` | XS | Alto |
| 2 | Aviso de problemas de suministro | `/psuministro` | S | Muy alto |
| 3 | Buscador de alternativas con mismo p.activo | `?practiv=X` | S | Muy alto |
| 4 | Foto del medicamento en la ficha | URLs públicas | XS | Medio |
| 5 | Notas de seguridad AEMPS si las hay | `/notas` | XS | Alto (farmacias) |
| 6 | Búsqueda por Código Nacional | `?cn=X` | XS | Alto (caja en mano) |
| 7 | Modo paciente vs profesional | secciones de Prospecto | S | Medio |
| 8 | Búsqueda multi-criterio ("para fiebre + embarazo seguro") | `buscarEnFichaTecnica` multi | M | Muy alto |
| 9 | Chat con LLM + CIMA tool-use | Todo + LLM | L | Muy alto (regulatorio delicado) |
| 10 | "Mi botiquín" (localStorage + alertas) | `/notas` + `/psuministro` | M | Medio |
| 11 | Calculadora dosis pediátrica | extraer de FT 4.2 con LLM | L | Alto (delicado) |
| 12 | Explorador ATC en árbol clínico | `?atc=X` + maestras | M | Medio (más pro que paciente) |

---

## 4. Lo que CIMA NO tiene (para no prometerlo)

- ❌ **Precios** → eso vive en el Nomenclátor del SNS (BOT PLUS), licencia de pago.
- ❌ **Stock real en farmacias concretas** → necesita integración con cada cadena.
- ❌ **Motor de interacciones procesado** → solo el texto libre de la sección 4.5; cruzar 2 medicamentos requiere lógica propia o LLM.
- ❌ **Recomendaciones clínicas** → CIMA es referencia, no prescriptor.
- ❌ **Historial del usuario** → cualquier persistencia la asume nuestro frontend (localStorage / backend propio).

---

## 5. Próximos pasos sugeridos

### ✅ Entregado (iteración 1 — 0 € coste)

- [x] Toggle "Solo sin receta" en el SearchBar (filtros `receta=0&comerc=1`).
- [x] Auto-detección de Código Nacional (input numérico → `?cn=X`).
- [x] Fotos del medicamento (pastilla + envase) en el detalle.
- [x] Banner de notas de seguridad AEMPS (cuando `med.notas === true`).
- [x] Banner de problemas de suministro activos (cuando `med.psum === true`).
- [x] Botón "Alternativas con [principio activo]" usando **código ATC nivel 5**.
- [x] Toggle modo Paciente (Prospecto) / Profesional (Ficha Técnica) en los chips.
- [x] Badges 🚨/⚠️ en lista de resultados para identificar de un vistazo medicamentos con notas o desabastecimiento.

### ✅ Entregado (iteración 1.5 — simulación de chat por síntoma)

- [x] Pantalla inicial con 2 modos: "Buscar medicamento" o "Encuentra por síntoma".
- [x] Wizard chat-style con burbujas (Bot ↔ Usuario) y 2 pasos: síntoma → perfil.
- [x] **12 síntomas** comunes con catálogo curado.
- [x] **7 perfiles** con whitelist de principios activos OTC apropiados.
- [x] Filtrado por intersección (`síntoma.activos ∩ perfil.safe`).
- [x] Mensaje específico de seguridad por perfil.
- [x] Cada resultado abre la ficha existente.
- [x] **Sección "con receta" desplegable + disclaimer legal fuerte**:
  - Borde y fondo rojos, claramente diferenciada visualmente.
  - Lenguaje cuidado: "Otras opciones autorizadas en CIMA", nunca "te recomiendo".
  - Bloqueo legal explícito: "Solo a título informativo · NO los tomes ni los compres sin prescripción · La elección depende de tu historial y solo tu médico puede prescribir".
  - Colapsada por defecto: el usuario tiene que pulsar conscientemente para verla.
  - Card abre la ficha completa con `cpresc` visible ("Medicamento Sujeto A Prescripción Médica").

Bundle: **50 KB raw / 16.28 KB gzip**.

### ✅ Entregado (iteración 2 — catálogo editable por el farmacéutico)

- [x] Sanity Studio compartido en `larokifarm/studio/` con 2 workspaces (cima-chat + calendario-vacunas).
- [x] 2 datasets (`cima`, `calendario`) — uso de los 2 incluidos en plan free.
- [x] 3 schemas: `principioActivo`, `sintoma`, `perfil` con referencias, validaciones y ordenación.
- [x] Cliente Sanity en el widget (`src/api/sanity.ts`) con:
  - Fetch al CDN público (sin auth).
  - Caché en localStorage TTL 5 min.
  - Fallback automático al catálogo bundleado si Sanity está caído.
  - Lazy: solo se hace fetch al abrir el wizard la primera vez.
- [x] Seed inicial con 28 activos + 12 síntomas + 7 perfiles (`studio/seed/cima-initial.ndjson`).
- [x] Documentación: `studio/README.md` (técnica) + `studio/GUIA-FARMACEUTICO.md` (para el cliente).

Bundle: **52 KB raw / 17.07 KB gzip**.

### ⚠️ Bug descubierto en CIMA

El parámetro `?practiv=X` del endpoint `/medicamentos` **no funciona**: devuelve siempre 25.342 resultados sea cual sea el valor (probado con `IBUPROFENO`, `ibuprofeno`, `Ibuprofeno`, `1769`, `principioActivo`, etc.). La alternativa correcta es usar el **código ATC** del detalle (`med.atcs[]`, escoger nivel más alto = más específico) y filtrar con `?atc=M01AE01&comerc=1` — devuelve los 126 medicamentos comercializados de ibuprofeno reales en lugar de basura.

### Pendiente (iteración 2 — opcional, 0 € si Gemini Flash gratis)

- [ ] Worker mínimo con LLM + tool-use sobre `cima.ts`.
- [ ] Caja de chat libre que entiende preguntas naturales y siempre cita la fuente CIMA.
- [ ] Filtros automáticos del LLM: edad → 4.2 pediátrica; embarazo → cruzar 4.6; OTC-only por defecto.
- [ ] Búsqueda multi-criterio en `buscarEnFichaTecnica` ("para fiebre + sin contraindicación embarazo").
- [ ] "Mi botiquín" con localStorage + alertas cuando aparezcan nuevas notas/desabastecimientos.
