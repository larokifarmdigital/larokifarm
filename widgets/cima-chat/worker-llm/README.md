# cima-chat-llm — Worker Cloudflare con Gemini + CIMA

Worker que orquesta Gemini con la API pública de CIMA (AEMPS) para responder
preguntas sobre medicamentos con citas oficiales, sin exponer la API key al
frontend.

## Endpoints

| Método | Path                    | Descripción                                          |
| ------ | ----------------------- | ---------------------------------------------------- |
| POST   | `/chat`                 | Chat libre con tool-use sobre CIMA (function calling) |
| POST   | `/summarize-section`    | Resumen simple de una sección de la Ficha Técnica    |
| POST   | `/check-interactions`   | Cruce de sección 4.5 entre 2-5 medicamentos          |
| GET    | `/health`               | Status check                                         |

## Setup en local

```bash
cd widgets/cima-chat/worker-llm
pnpm install

# 1) Crear el KV namespace
pnpm exec wrangler kv namespace create CACHE_KV
pnpm exec wrangler kv namespace create CACHE_KV --preview
# → copiar los IDs devueltos a wrangler.toml

# 2) Cargar el secret con la API key de Gemini
pnpm exec wrangler secret put GEMINI_API_KEY
# → pegar la key cuando lo pida

# 3) Correr en local
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

## Cache y rate limit

- **Cache Q&A** en KV con TTL 24 h. Las preguntas repetidas se sirven al instante
  sin consumir cuota Gemini.
- **Rate limit**: 20 requests por IP por minuto (configurable en `wrangler.toml`).
  Devuelve HTTP 429 si se supera.

## Ejemplo de request

```bash
curl -X POST https://cima-chat-llm.<TU-CUENTA>.workers.dev/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "history": [
      { "role": "user", "text": "¿Puedo tomar ibuprofeno si estoy embarazada?" }
    ],
    "mode": "paciente"
  }'
```

Respuesta esperada:

```json
{
  "ok": true,
  "cached": false,
  "text": "Según la sección 4.6 de la Ficha Técnica de ibuprofeno...",
  "citations": [
    { "nregistro": "12345", "seccion": "4.6", "url": "https://cima.aemps.es/..." }
  ],
  "toolCallsUsed": 3
}
```

## Seguridad

- La `GEMINI_API_KEY` se guarda como secret binding — nunca aparece en el bundle.
- CORS restringido a `ALLOWED_ORIGIN` (poné el dominio del widget en producción).
- Rate limit protege contra abuso.
- El system prompt obliga a Gemini a citar siempre la sección oficial de CIMA
  y prohíbe inventar información de medicamentos.
