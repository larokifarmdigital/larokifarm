# API CIMA (AEMPS) — Guía Postman

Documentación de los endpoints públicos del **Centro de Información online de Medicamentos (CIMA)** de la **AEMPS** que utiliza el widget `cima-chat`. Está pensada para que cualquier persona (cliente, integrador, equipo QA) pueda importar la colección en Postman, ejecutar las peticiones y entender qué hace cada endpoint con ejemplos reales del chat.

> **Fuente oficial**: <https://cima.aemps.es/cima/dochtml/api/restapi.html>

---

## Índice

0. [Playground interactivo (Swagger UI)](#playground-interactivo-swagger-ui) ← **lo más rápido para el cliente**
1. [Información general](#información-general)
2. [Importar la colección en Postman](#importar-la-colección-en-postman)
3. [Endpoints utilizados por el widget](#endpoints-utilizados-por-el-widget)
   - [1. Buscar medicamentos por nombre](#1-buscar-medicamentos-por-nombre)
   - [2. Buscar por Código Nacional (CN)](#2-buscar-por-código-nacional-cn)
   - [3. Buscar por código ATC (alternativas)](#3-buscar-por-código-atc-alternativas)
   - [4. Buscar por principio activo](#4-buscar-por-principio-activo)
   - [5. Detalle de un medicamento](#5-detalle-de-un-medicamento)
   - [6. Presentaciones de un medicamento](#6-presentaciones-de-un-medicamento)
   - [7. Notas de seguridad](#7-notas-de-seguridad)
   - [8. Problemas de suministro](#8-problemas-de-suministro)
   - [9. Listado de secciones del documento segmentado](#9-listado-de-secciones-del-documento-segmentado)
   - [10. Contenido de una sección concreta](#10-contenido-de-una-sección-concreta)
4. [Ejemplos extremo a extremo (mismos flujos del chat)](#ejemplos-extremo-a-extremo-mismos-flujos-del-chat)
5. [Colección Postman (JSON listo para importar)](#colección-postman-json-listo-para-importar)

---

## Playground interactivo (Swagger UI)

Si quieres pasarle al cliente **una URL** con todos los endpoints, ejemplos y un botón "**Try it out**" para que pueda editar los parámetros y ejecutar peticiones reales contra CIMA, este repo ya incluye una página estática lista en `docs/`:

```
docs/
├── index.html              ← carga Swagger UI desde CDN
└── cima-api.openapi.yaml   ← spec OpenAPI 3.0 con ejemplos
```

### Cómo desplegar (elige una)

| Opción | Pasos | URL resultante |
|---|---|---|
| **GitHub Pages** | Settings → Pages → Source: `main` branch, folder `/docs` → Save | `https://<user>.github.io/<repo>/` |
| **Vercel** | `vercel deploy docs/` (o conecta el repo y pon Root Directory = `docs`) | `https://<proyecto>.vercel.app/` |
| **Netlify** | Arrastra la carpeta `docs/` a <https://app.netlify.com/drop> | `https://<random>.netlify.app/` |
| **Local** | `npx serve docs` y abre <http://localhost:3000> | localhost |

> CIMA tiene **CORS habilitado**, así que el botón "Execute" funciona desde cualquier dominio sin proxy.

### Por qué Swagger UI y no otra cosa

- **Postman público**: requiere cuenta Postman al cliente.
- **ReDoc**: muy bonito pero **no permite ejecutar** peticiones (solo lectura).
- **Stoplight Elements**: similar, más moderno; cámbialo si lo prefieres reemplazando el `<script>` en `docs/index.html`.

### Editar el spec

`docs/cima-api.openapi.yaml` es OpenAPI 3.0. Añadir un endpoint nuevo o un ejemplo es cuestión de copiar un bloque `paths:` y reemplazar nombres. Cualquier cambio se ve al refrescar la página.

---

## Información general

| Campo | Valor |
|---|---|
| Base URL | `https://cima.aemps.es/cima/rest` |
| Protocolo | HTTPS |
| Autenticación | **No requiere** (API pública) |
| Formato respuesta | `application/json` (excepto `/docSegmentado/contenido/*`, que devuelve **texto** o HTML) |
| Codificación | UTF-8 |
| CORS | Habilitado |
| Límite de paginación | `pagesize` máx. 25 (recomendado 10) |

**Headers recomendados en Postman**:

```http
Accept: application/json
```

**Notas**:
- Casi todos los parámetros booleanos viajan como `0` o `1` (no `true`/`false`).
- Los códigos de error siguen los estándares HTTP (`200`, `400`, `404`, `500`).
- Las fechas se devuelven en **milisegundos epoch** (UTC).

---

## Importar la colección en Postman

1. Copia el JSON del apartado [Colección Postman](#colección-postman-json-listo-para-importar).
2. En Postman → **Import** → **Raw text** → pega el JSON → **Continue** → **Import**.
3. Aparecerá la colección **"CIMA AEMPS — cima-chat widget"** con todas las peticiones.
4. En el entorno verás la variable `{{baseUrl}} = https://cima.aemps.es/cima/rest`.

---

## Endpoints utilizados por el widget

### 1. Buscar medicamentos por nombre

Buscador principal del chat (modo "Buscar un medicamento").

- **Método**: `GET`
- **URL**: `{{baseUrl}}/medicamentos`

#### Parámetros (query string)

| Param | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | sí (en este caso) | Texto a buscar. Coincidencia parcial. |
| `pagesize` | int | no | Resultados por página (recomendado: 10). |
| `pagina` | int | no | Página (1-N). |
| `receta` | 0 \| 1 | no | `0` = sin receta, `1` = con receta. |
| `comerc` | 0 \| 1 | no | `1` = solo medicamentos actualmente comercializados. |
| `triangulo` | 0 \| 1 | no | `1` = solo medicamentos en seguimiento adicional. |
| `generico` | 0 \| 1 | no | `1` = solo genéricos (EFG). |

#### Ejemplo — "ibuprofeno, solo sin receta"

```http
GET https://cima.aemps.es/cima/rest/medicamentos?nombre=ibuprofeno&pagesize=10&receta=0&comerc=1
```

```bash
curl "https://cima.aemps.es/cima/rest/medicamentos?nombre=ibuprofeno&pagesize=10&receta=0&comerc=1"
```

#### Ejemplo de respuesta (recortada)

```json
{
  "totalFilas": 18,
  "pagina": 1,
  "tamanioPagina": 10,
  "resultados": [
    {
      "nregistro": "65726",
      "nombre": "IBUPROFENO CINFA 400 mg COMPRIMIDOS RECUBIERTOS CON PELICULA EFG",
      "labtitular": "LABORATORIOS CINFA, S.A.",
      "cpresc": "DH",
      "estado": { "aut": 942624000000 },
      "comerc": true,
      "receta": false,
      "generico": true,
      "docs": [
        { "tipo": 1, "url": "https://cima.aemps.es/.../FT_65726.pdf", "urlHtml": "https://cima.aemps.es/.../FT_65726.html", "secc": true, "fecha": 1714435200000 },
        { "tipo": 2, "url": "https://cima.aemps.es/.../P_65726.pdf",  "urlHtml": "https://cima.aemps.es/.../P_65726.html",  "secc": true, "fecha": 1714435200000 }
      ],
      "fotos": [
        { "tipo": "formafarmac", "url": "https://cima.aemps.es/.../formafarmac.jpg", "fecha": 1714435200000 }
      ]
    }
  ]
}
```

**Uso en el widget**: `src/api/cima.ts → searchMedicamentos(query, filters)`.

---

### 2. Buscar por Código Nacional (CN)

Si el usuario escribe solo dígitos (4–7) en la búsqueda, el widget cambia al modo CN automáticamente.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/medicamentos`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `cn` | string | Código Nacional (numérico). |
| `pagesize` | int | Recomendado 10. |

#### Ejemplo — CN `653980` (ibuprofeno cinfa)

```http
GET https://cima.aemps.es/cima/rest/medicamentos?cn=653980&pagesize=10
```

```bash
curl "https://cima.aemps.es/cima/rest/medicamentos?cn=653980&pagesize=10"
```

**Uso en el widget**: `searchByCN(cn)`.

---

### 3. Buscar por código ATC (alternativas)

Cuando el usuario abre un medicamento y pulsa "Alternativas con &lt;principio activo&gt;", se buscan otros comercializados con el mismo ATC.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/medicamentos`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `atc` | string | Código ATC (ej. `M01AE01` para ibuprofeno). |
| `comerc` | 0 \| 1 | `1` para mostrar solo comercializados. |
| `pagesize` | int | Recomendado 20. |

#### Ejemplo — alternativas de ibuprofeno

```http
GET https://cima.aemps.es/cima/rest/medicamentos?atc=M01AE01&comerc=1&pagesize=20
```

**Uso en el widget**: `searchByAtc(atc)` desde `MedDetail`.

---

### 4. Buscar por principio activo

Usado internamente por el **wizard de síntomas**: cada síntoma define una lista de principios activos seguros para el perfil del paciente.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/medicamentos`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Se reutiliza con el nombre del principio activo. |
| `receta` | 0 \| 1 | `0` para opciones sin receta. |
| `comerc` | 0 \| 1 | `1` para comercializados. |
| `pagesize` | int | Recomendado 3 por activo. |

> El widget también soporta búsqueda por `practiv` (parámetro estándar de CIMA), pero internamente prefiere `nombre` por mayor cobertura.

#### Ejemplo — paracetamol sin receta

```http
GET https://cima.aemps.es/cima/rest/medicamentos?nombre=paracetamol&receta=0&comerc=1&pagesize=3
```

---

### 5. Detalle de un medicamento

Al seleccionar una tarjeta de resultado, el widget pide el detalle completo.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/medicamento`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nregistro` | string | Número de registro AEMPS. |

#### Ejemplo — `nregistro=65726` (Ibuprofeno Cinfa 400 mg)

```http
GET https://cima.aemps.es/cima/rest/medicamento?nregistro=65726
```

#### Ejemplo de respuesta (recortada)

```json
{
  "nregistro": "65726",
  "nombre": "IBUPROFENO CINFA 400 mg COMPRIMIDOS RECUBIERTOS CON PELICULA EFG",
  "pactivos": "IBUPROFENO",
  "labtitular": "LABORATORIOS CINFA, S.A.",
  "comerc": true,
  "receta": false,
  "generico": true,
  "atcs": [
    { "codigo": "M01AE01", "nombre": "Ibuprofeno", "nivel": 5 },
    { "codigo": "M",       "nombre": "Sistema musculoesquelético", "nivel": 1 }
  ],
  "principiosActivos": [
    { "id": 21, "codigo": "M01AE01", "nombre": "IBUPROFENO", "cantidad": "400", "unidad": "mg", "orden": 1 }
  ],
  "docs": [ /* ... */ ],
  "fotos": [ /* ... */ ]
}
```

**Uso en el widget**: `getMedicamento(nregistro)`.

---

### 6. Presentaciones de un medicamento

Lista de presentaciones comercializadas (CN, formato, etc.).

- **Método**: `GET`
- **URL**: `{{baseUrl}}/presentaciones`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nregistro` | string | Número de registro. |

#### Ejemplo

```http
GET https://cima.aemps.es/cima/rest/presentaciones?nregistro=65726
```

---

### 7. Notas de seguridad

Notas informativas de la AEMPS asociadas al medicamento (alertas de farmacovigilancia, retiradas, cambios de ficha técnica…).

- **Método**: `GET`
- **URL**: `{{baseUrl}}/notas`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nregistro` | string | Número de registro. |

#### Ejemplo

```http
GET https://cima.aemps.es/cima/rest/notas?nregistro=65726
```

#### Respuesta (ejemplo)

```json
[
  {
    "tipo": 1,
    "num": "MUH-12-2023",
    "referencia": "AEMPS-NOTA-2023",
    "asunto": "Restricciones de uso en pacientes con...",
    "fecha": 1696118400000,
    "url": "https://www.aemps.gob.es/.../nota.pdf"
  }
]
```

**Uso en el widget**: aparece como banner rojo "🚨 Notas de seguridad AEMPS" si el medicamento tiene `notas: true` en la búsqueda.

---

### 8. Problemas de suministro

Problemas actuales o resueltos de suministro para presentaciones de un nombre dado.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/psuministro`

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Nombre comercial (el widget usa las 2 primeras palabras del nombre). |
| `pagesize` | int | Recomendado 20. |

#### Ejemplo — problemas activos de "Nolotil"

```http
GET https://cima.aemps.es/cima/rest/psuministro?nombre=NOLOTIL&pagesize=20
```

#### Respuesta (ejemplo)

```json
{
  "totalFilas": 2,
  "resultados": [
    {
      "cn": "660018",
      "nombre": "NOLOTIL 575 mg 20 CAPSULAS",
      "tipoProblemaSuministro": 2,
      "fini": 1714435200000,
      "ffin": 1735603200000,
      "activo": true,
      "observ": "Suministro restringido. Distribución a hospitales."
    }
  ]
}
```

**Uso en el widget**: banner amarillo "⚠️ Problemas de suministro activos".

---

### 9. Listado de secciones del documento segmentado

CIMA segmenta la **Ficha Técnica (FT)** y el **Prospecto (P)** en secciones consultables individualmente. El widget pide ambas listas al abrir un medicamento.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/docSegmentado/secciones/{tipo}`

| `tipo` | Documento |
|---|---|
| `1` | Ficha técnica (FT) — orientada a profesionales |
| `2` | Prospecto (P) — orientada al paciente |

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nregistro` | string | Número de registro. |

#### Ejemplo — secciones del prospecto de `65726`

```http
GET https://cima.aemps.es/cima/rest/docSegmentado/secciones/2?nregistro=65726
```

#### Respuesta (ejemplo)

```json
[
  { "seccion": "1",   "titulo": "Qué es y para qué se utiliza", "orden": 1 },
  { "seccion": "2",   "titulo": "Antes de tomar",               "orden": 2 },
  { "seccion": "3",   "titulo": "Cómo tomar",                   "orden": 3 },
  { "seccion": "4",   "titulo": "Posibles efectos adversos",    "orden": 4 },
  { "seccion": "5",   "titulo": "Conservación",                 "orden": 5 }
]
```

**Uso en el widget**: alimenta los chips de preguntas (`QuestionChips.tsx`).

---

### 10. Contenido de una sección concreta

Al pulsar un chip ("¿Para qué sirve?", "¿Cómo se toma?", "Efectos adversos"…), el widget pide el **texto plano** de esa sección al CIMA.

- **Método**: `GET`
- **URL**: `{{baseUrl}}/docSegmentado/contenido/{tipo}`
- **Respuesta**: `text/plain` (a veces con etiquetas básicas).

#### Parámetros

| Param | Tipo | Descripción |
|---|---|---|
| `nregistro` | string | Número de registro. |
| `seccion` | string | Identificador de sección (ver endpoint anterior). |

#### Ejemplo — "¿Para qué sirve?" del ibuprofeno (sección 1 del prospecto)

```http
GET https://cima.aemps.es/cima/rest/docSegmentado/contenido/2?nregistro=65726&seccion=1
```

```bash
curl "https://cima.aemps.es/cima/rest/docSegmentado/contenido/2?nregistro=65726&seccion=1"
```

#### Respuesta (recortada, texto plano)

```text
Este medicamento contiene ibuprofeno. Pertenece al grupo de medicamentos llamados
antiinflamatorios no esteroideos (AINE). Se utiliza para el tratamiento sintomático
del dolor de intensidad leve o moderada y de los estados febriles.
...
```

**Uso en el widget**: se muestra como burbuja de respuesta en el chat, con cita "Fuente: AEMPS · Prospecto · sección 1".

---

## Ejemplos extremo a extremo (mismos flujos del chat)

A continuación, los **3 flujos que el widget ejecuta**, paso a paso. Puedes reproducirlos secuencialmente en Postman.

### Flujo A — "Buscar ibuprofeno y leer para qué sirve"

1. **Búsqueda**:
   ```http
   GET {{baseUrl}}/medicamentos?nombre=ibuprofeno&pagesize=10&comerc=1
   ```
   → tomar `nregistro` del primer resultado (ej. `65726`).

2. **Detalle**:
   ```http
   GET {{baseUrl}}/medicamento?nregistro=65726
   ```

3. **Secciones del prospecto**:
   ```http
   GET {{baseUrl}}/docSegmentado/secciones/2?nregistro=65726
   ```

4. **Contenido sección 1 ("para qué sirve")**:
   ```http
   GET {{baseUrl}}/docSegmentado/contenido/2?nregistro=65726&seccion=1
   ```

### Flujo B — "Tengo dolor de cabeza, soy adulto" (wizard de síntomas)

> El widget mapea el síntoma → lista de principios activos seguros para el perfil. Para "dolor de cabeza" + "adulto" → `paracetamol`, `ibuprofeno`.

1. **Búsqueda paracetamol sin receta**:
   ```http
   GET {{baseUrl}}/medicamentos?nombre=paracetamol&receta=0&comerc=1&pagesize=3
   ```

2. **Búsqueda ibuprofeno sin receta**:
   ```http
   GET {{baseUrl}}/medicamentos?nombre=ibuprofeno&receta=0&comerc=1&pagesize=3
   ```

3. **(Opcional, lista con receta colapsada en UI)** misma búsqueda con `receta=1`:
   ```http
   GET {{baseUrl}}/medicamentos?nombre=paracetamol&receta=1&comerc=1&pagesize=3
   ```

4. Al seleccionar uno, vuelve al Flujo A desde el paso 2.

### Flujo C — "Ver alternativas con el mismo principio activo"

1. Partiendo del detalle (`nregistro=65726`), el widget extrae el ATC más específico (`M01AE01`).

2. **Buscar alternativas**:
   ```http
   GET {{baseUrl}}/medicamentos?atc=M01AE01&comerc=1&pagesize=20
   ```

3. Filtra en cliente para excluir el `nregistro` actual y muestra hasta 10 alternativas.

### Flujo D — "Tiene notas o problemas de suministro" (alertas)

Si el resultado de búsqueda trae `notas: true` o `psum: true`, el widget pide en paralelo:

1. **Notas**:
   ```http
   GET {{baseUrl}}/notas?nregistro=65726
   ```

2. **Problemas de suministro** (por nombre corto, p. ej. dos primeras palabras):
   ```http
   GET {{baseUrl}}/psuministro?nombre=IBUPROFENO%20CINFA&pagesize=20
   ```

---

## Colección Postman (JSON listo para importar)

Guarda este bloque como `cima-chat.postman_collection.json` o pégalo en Postman → **Import** → **Raw text**.

```json
{
  "info": {
    "name": "CIMA AEMPS — cima-chat widget",
    "_postman_id": "b1e8b2e0-cima-chat-0001",
    "description": "Endpoints públicos de la API CIMA (AEMPS) utilizados por el widget cima-chat. Sin autenticación. Variables: baseUrl, nregistroDemo, cnDemo, atcDemo.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl",       "value": "https://cima.aemps.es/cima/rest" },
    { "key": "nregistroDemo", "value": "65726" },
    { "key": "cnDemo",        "value": "653980" },
    { "key": "atcDemo",       "value": "M01AE01" }
  ],
  "item": [
    {
      "name": "1. Buscar por nombre (ibuprofeno, sin receta)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Accept", "value": "application/json" }],
        "url": {
          "raw": "{{baseUrl}}/medicamentos?nombre=ibuprofeno&pagesize=10&receta=0&comerc=1",
          "host": ["{{baseUrl}}"],
          "path": ["medicamentos"],
          "query": [
            { "key": "nombre", "value": "ibuprofeno" },
            { "key": "pagesize", "value": "10" },
            { "key": "receta", "value": "0" },
            { "key": "comerc", "value": "1" }
          ]
        }
      }
    },
    {
      "name": "2. Buscar por CN",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/medicamentos?cn={{cnDemo}}&pagesize=10",
          "host": ["{{baseUrl}}"],
          "path": ["medicamentos"],
          "query": [
            { "key": "cn", "value": "{{cnDemo}}" },
            { "key": "pagesize", "value": "10" }
          ]
        }
      }
    },
    {
      "name": "3. Buscar alternativas por ATC",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/medicamentos?atc={{atcDemo}}&comerc=1&pagesize=20",
          "host": ["{{baseUrl}}"],
          "path": ["medicamentos"],
          "query": [
            { "key": "atc", "value": "{{atcDemo}}" },
            { "key": "comerc", "value": "1" },
            { "key": "pagesize", "value": "20" }
          ]
        }
      }
    },
    {
      "name": "4. Buscar por principio activo (paracetamol, sin receta)",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/medicamentos?nombre=paracetamol&receta=0&comerc=1&pagesize=3",
          "host": ["{{baseUrl}}"],
          "path": ["medicamentos"],
          "query": [
            { "key": "nombre", "value": "paracetamol" },
            { "key": "receta", "value": "0" },
            { "key": "comerc", "value": "1" },
            { "key": "pagesize", "value": "3" }
          ]
        }
      }
    },
    {
      "name": "5. Detalle de medicamento",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/medicamento?nregistro={{nregistroDemo}}",
          "host": ["{{baseUrl}}"],
          "path": ["medicamento"],
          "query": [{ "key": "nregistro", "value": "{{nregistroDemo}}" }]
        }
      }
    },
    {
      "name": "6. Presentaciones",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/presentaciones?nregistro={{nregistroDemo}}",
          "host": ["{{baseUrl}}"],
          "path": ["presentaciones"],
          "query": [{ "key": "nregistro", "value": "{{nregistroDemo}}" }]
        }
      }
    },
    {
      "name": "7. Notas de seguridad",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/notas?nregistro={{nregistroDemo}}",
          "host": ["{{baseUrl}}"],
          "path": ["notas"],
          "query": [{ "key": "nregistro", "value": "{{nregistroDemo}}" }]
        }
      }
    },
    {
      "name": "8. Problemas de suministro (por nombre)",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/psuministro?nombre=NOLOTIL&pagesize=20",
          "host": ["{{baseUrl}}"],
          "path": ["psuministro"],
          "query": [
            { "key": "nombre", "value": "NOLOTIL" },
            { "key": "pagesize", "value": "20" }
          ]
        }
      }
    },
    {
      "name": "9. Secciones del prospecto (tipo=2)",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/docSegmentado/secciones/2?nregistro={{nregistroDemo}}",
          "host": ["{{baseUrl}}"],
          "path": ["docSegmentado", "secciones", "2"],
          "query": [{ "key": "nregistro", "value": "{{nregistroDemo}}" }]
        }
      }
    },
    {
      "name": "9b. Secciones de la ficha técnica (tipo=1)",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/docSegmentado/secciones/1?nregistro={{nregistroDemo}}",
          "host": ["{{baseUrl}}"],
          "path": ["docSegmentado", "secciones", "1"],
          "query": [{ "key": "nregistro", "value": "{{nregistroDemo}}" }]
        }
      }
    },
    {
      "name": "10. Contenido sección 1 del prospecto (¿Para qué sirve?)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Accept", "value": "text/plain" }],
        "url": {
          "raw": "{{baseUrl}}/docSegmentado/contenido/2?nregistro={{nregistroDemo}}&seccion=1",
          "host": ["{{baseUrl}}"],
          "path": ["docSegmentado", "contenido", "2"],
          "query": [
            { "key": "nregistro", "value": "{{nregistroDemo}}" },
            { "key": "seccion", "value": "1" }
          ]
        }
      }
    },
    {
      "name": "10b. Contenido sección 3 del prospecto (¿Cómo tomar?)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Accept", "value": "text/plain" }],
        "url": {
          "raw": "{{baseUrl}}/docSegmentado/contenido/2?nregistro={{nregistroDemo}}&seccion=3",
          "host": ["{{baseUrl}}"],
          "path": ["docSegmentado", "contenido", "2"],
          "query": [
            { "key": "nregistro", "value": "{{nregistroDemo}}" },
            { "key": "seccion", "value": "3" }
          ]
        }
      }
    },
    {
      "name": "10c. Contenido sección 4 del prospecto (Efectos adversos)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Accept", "value": "text/plain" }],
        "url": {
          "raw": "{{baseUrl}}/docSegmentado/contenido/2?nregistro={{nregistroDemo}}&seccion=4",
          "host": ["{{baseUrl}}"],
          "path": ["docSegmentado", "contenido", "2"],
          "query": [
            { "key": "nregistro", "value": "{{nregistroDemo}}" },
            { "key": "seccion", "value": "4" }
          ]
        }
      }
    }
  ]
}
```

---

## Glosario rápido

- **nregistro**: número de registro AEMPS, identificador único de un medicamento autorizado.
- **CN**: Código Nacional (identificador de la presentación, lo que aparece en el envase).
- **ATC**: clasificación Anatómica-Terapéutica-Química de la OMS. El nivel 5 es la sustancia concreta.
- **EFG**: Equivalente Farmacéutico Genérico.
- **FT / P**: Ficha Técnica (profesional) / Prospecto (paciente).
- **psum**: problema de suministro.
- **triángulo**: medicamento en seguimiento adicional de farmacovigilancia.

---

**Aviso**: este documento describe la API pública de la AEMPS. La información mostrada por el widget procede íntegramente de CIMA y **no sustituye al consejo de un profesional sanitario**.
