/**
 * Orquestador Gemini + tool-use sobre CIMA.
 *
 * Flujo:
 * 1. Recibimos mensaje del user + historial.
 * 2. Llamamos a Gemini con el system prompt + tools declaradas.
 * 3. Si Gemini emite functionCall → ejecutamos la tool CIMA correspondiente.
 * 4. Volvemos a llamar a Gemini con el resultado hasta que emita texto final.
 * 5. Retornamos el texto + citas de las secciones consultadas.
 *
 * Sin SDK: fetch directo al REST de generativelanguage.googleapis.com.
 */

import {
  getMedicamentoDetail,
  getNotasSeguridad,
  getSeccion,
  getSuministro,
  searchByATC,
  searchByCN,
  searchByFichaCriteria,
  searchByName,
} from './cimaTools';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_TOOL_LOOPS = 6;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResult {
  text: string;
  /** Referencias a secciones oficiales que se consultaron durante la respuesta. */
  citations: Array<{ nregistro: string; nombre?: string; seccion?: string; url?: string }>;
  /** Cuántas llamadas a tools se hicieron (útil para debugging). */
  toolCallsUsed: number;
}

/* ============================================================
 * System prompt — informativo, útil, con base en CIMA (AEMPS).
 * Balance clave: dar información PRÁCTICA sin cruzar la línea legal de prescripción.
 * ============================================================ */
const SYSTEM_PROMPT = `Eres un asistente informativo sobre medicamentos autorizados en España, respaldado por la API oficial de CIMA (AEMPS). Tu trabajo es AYUDAR al usuario con información concreta y útil, no derivarlo automáticamente al médico.

CÓMO RESPONDER (importante):
- El usuario espera INFORMACIÓN CONCRETA, no un "consulta a tu médico" genérico. Solo derivá al médico cuando hay banderas rojas reales.
- Cuando alguien describe un síntoma común (fiebre, dolor de cabeza, tos, dolor menstrual, resfriado, náuseas leves, insomnio ocasional…), buscá en CIMA principios activos OTC apropiados y devolvé:
  1. Qué principios activos son los habituales para ese caso (ej: paracetamol o ibuprofeno para fiebre en niños).
  2. Nombres comerciales concretos disponibles en España (ej: "Apiretal", "Dalsy").
  3. Consideraciones importantes por perfil (edad, embarazo, comorbilidades).
  4. Cuándo SÍ hay que ir al médico (banderas rojas específicas).
- Si te falta contexto (edad, peso, condiciones), pedilo. No respondas con vaguedades por miedo.

BANDERAS ROJAS que SÍ obligan a derivar (mencionarlas explícitamente):
- Fiebre >39°C en <3 meses, o >72h sin bajar en cualquier edad
- Rigidez de cuello, confusión, convulsiones, dificultad respiratoria
- Sangrado activo, dolor torácico, dolor abdominal severo
- Deshidratación en niños o mayores (vómitos/diarrea >24h)
- Cualquier síntoma que empeora rápidamente

FUENTES OFICIALES (obligatorio usar tools):
1. Antes de hablar de un medicamento concreto, buscalo con searchByName/searchByCN y obtené detalle con getMedicamentoDetail.
2. Para dosis, contraindicaciones, embarazo, interacciones o efectos, leé la sección con getSeccion.
3. Citá explícitamente la sección oficial (ej: "según la sección 4.2 de la Ficha Técnica..."). Nunca inventes datos.
4. Si CIMA no tiene información suficiente, decilo — no rellenes con generalidades.

ESTILO:
- Español natural, cercano, sin jerga innecesaria.
- Máximo 200 palabras salvo que el user pida más detalle.
- Estructurá la respuesta clara: qué usar → cómo → advertencias → cuándo consultar.
- Al final, una frase breve: "Ante dudas específicas de tu caso, consultá con tu farmacéutico o médico."

LO QUE NO DEBÉS HACER:
- No inventes marcas, dosis o efectos que no vienen de CIMA.
- No sugieras medicamentos con receta como opción principal — enfocá en OTC (sin receta) para síntomas leves.
- No respondas "consultá a tu médico" como respuesta única. Es una respuesta pobre y frustrante.
- No entres en temas ajenos a medicamentos y salud farmacéutica.

Secciones clave (Ficha Técnica doc=1, Prospecto doc=2):
- 4.1 Indicaciones · 4.2 Posología · 4.3 Contraindicaciones · 4.4 Advertencias
- 4.5 Interacciones · 4.6 Embarazo/lactancia · 4.7 Conducción · 4.8 Reacciones adversas`;

/* ============================================================
 * Function declarations que Gemini puede llamar.
 * ============================================================ */
const TOOL_DECLARATIONS = [
  {
    name: 'searchByName',
    description: 'Busca medicamentos por nombre parcial en CIMA. Úsala cuando el user mencione un nombre (marca o principio activo).',
    parameters: {
      type: 'object',
      properties: { nombre: { type: 'string', description: 'Nombre o parte del nombre.' } },
      required: ['nombre'],
    },
  },
  {
    name: 'searchByCN',
    description: 'Busca por Código Nacional exacto (6-7 dígitos). Úsala cuando el user te dé un CN.',
    parameters: {
      type: 'object',
      properties: { cn: { type: 'string', description: 'Código Nacional.' } },
      required: ['cn'],
    },
  },
  {
    name: 'getMedicamentoDetail',
    description: 'Ficha compacta del medicamento por número de registro AEMPS (nregistro).',
    parameters: {
      type: 'object',
      properties: { nregistro: { type: 'string' } },
      required: ['nregistro'],
    },
  },
  {
    name: 'getSeccion',
    description:
      'Texto de una sección concreta de la Ficha Técnica (doc=1) o Prospecto (doc=2). Secciones habituales: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8.',
    parameters: {
      type: 'object',
      properties: {
        nregistro: { type: 'string' },
        seccion: { type: 'string', description: 'Código de sección, ej: "4.5".' },
        doc: { type: 'string', enum: ['1', '2'], description: '1=Ficha Técnica, 2=Prospecto. Default 1.' },
      },
      required: ['nregistro', 'seccion'],
    },
  },
  {
    name: 'searchByATC',
    description: 'Alternativas terapéuticas por código ATC (mismo grupo clínico). Úsala cuando el user pida alternativas o genéricos.',
    parameters: {
      type: 'object',
      properties: { atc: { type: 'string' } },
      required: ['atc'],
    },
  },
  {
    name: 'getNotasSeguridad',
    description: 'Notas de seguridad AEMPS emitidas para el medicamento. Consulta cuando el user pregunte por alertas o riesgos.',
    parameters: {
      type: 'object',
      properties: { nregistro: { type: 'string' } },
      required: ['nregistro'],
    },
  },
  {
    name: 'getSuministro',
    description: 'Problemas de suministro actuales del medicamento (falta en el mercado).',
    parameters: {
      type: 'object',
      properties: { nregistro: { type: 'string' } },
      required: ['nregistro'],
    },
  },
  {
    name: 'searchByFichaCriteria',
    description:
      'Búsqueda multi-criterio en la Ficha Técnica. Úsala para queries tipo "para X sin contraindicación de Y". Cada criterio dice si la sección DEBE contener el texto (must_contain) o NO debe contenerlo (must_not_contain).',
    parameters: {
      type: 'object',
      properties: {
        criterios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              seccion: { type: 'string' },
              texto: { type: 'string' },
              modo: {
                type: 'string',
                enum: ['must_contain', 'must_not_contain'],
                description:
                  'must_contain = la sección debe contener el texto. must_not_contain = la sección NO debe contener el texto.',
              },
            },
            required: ['seccion', 'texto', 'modo'],
          },
        },
      },
      required: ['criterios'],
    },
  },
];

/* ============================================================
 * Ejecutor de tools (map de nombre → función).
 * ============================================================ */
async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'searchByName':
      return searchByName(String(args.nombre ?? ''));
    case 'searchByCN':
      return searchByCN(String(args.cn ?? ''));
    case 'getMedicamentoDetail':
      return getMedicamentoDetail(String(args.nregistro ?? ''));
    case 'getSeccion':
      return getSeccion(
        String(args.nregistro ?? ''),
        String(args.seccion ?? '4.1'),
        (args.doc as '1' | '2') ?? '1',
      );
    case 'searchByATC':
      return searchByATC(String(args.atc ?? ''));
    case 'getNotasSeguridad':
      return getNotasSeguridad(String(args.nregistro ?? ''));
    case 'getSuministro':
      return getSuministro(String(args.nregistro ?? ''));
    case 'searchByFichaCriteria': {
      // Traducimos el enum semántico string → el 0|1 que espera la API de CIMA.
      const raw =
        (args.criterios as Array<{
          seccion: string;
          texto: string;
          modo: 'must_contain' | 'must_not_contain';
        }>) ?? [];
      return searchByFichaCriteria(
        raw.map((c) => ({
          seccion: c.seccion,
          texto: c.texto,
          contiene: c.modo === 'must_contain' ? 1 : 0,
        })),
      );
    }
    default:
      throw new Error(`Tool desconocida: ${name}`);
  }
}

/* ============================================================
 * Orquestador principal.
 * ============================================================ */
export async function orchestrate(
  history: ChatMessage[],
  apiKey: string,
  systemPromptOverride?: string,
): Promise<ChatResult> {
  // Convertimos el historial al formato Gemini
  const contents: Array<Record<string, unknown>> = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const citations: ChatResult['citations'] = [];
  let toolCallsUsed = 0;

  for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
    const body = {
      systemInstruction: {
        parts: [{ text: systemPromptOverride ?? SYSTEM_PROMPT }],
      },
      contents,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            functionCall?: { name: string; args: Record<string, unknown> };
          }>;
        };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!);
    const textParts = parts.filter((p) => p.text).map((p) => p.text!);

    // Si Gemini emitió texto final, devolvemos
    if (functionCalls.length === 0 && textParts.length > 0) {
      return {
        text: textParts.join('\n').trim(),
        citations,
        toolCallsUsed,
      };
    }

    // Si emitió function calls, ejecutamos y volvemos al loop
    if (functionCalls.length === 0) {
      // Sin tools ni texto — respuesta inesperada
      return {
        text: 'No pude generar una respuesta. Reformula la pregunta por favor.',
        citations,
        toolCallsUsed,
      };
    }

    // Añadimos el modelo response (function calls) al historial
    contents.push({
      role: 'model',
      parts: functionCalls.map((fc) => ({ functionCall: fc })),
    });

    // Ejecutamos cada function call
    const responseparts: Array<Record<string, unknown>> = [];
    for (const call of functionCalls) {
      toolCallsUsed++;
      try {
        const result = await executeTool(call.name, call.args);
        // Trackear citas cuando aplique
        if (call.name === 'getSeccion') {
          citations.push({
            nregistro: String(call.args.nregistro),
            seccion: String(call.args.seccion),
            url: `https://cima.aemps.es/cima/publico/detalle.html?nregistro=${call.args.nregistro}`,
          });
        }
        if (call.name === 'getMedicamentoDetail') {
          const detail = result as { nombre?: string; nregistro?: string };
          citations.push({
            nregistro: String(detail.nregistro ?? call.args.nregistro),
            nombre: detail.nombre,
            url: `https://cima.aemps.es/cima/publico/detalle.html?nregistro=${detail.nregistro}`,
          });
        }
        responseparts.push({
          functionResponse: { name: call.name, response: { result } },
        });
      } catch (err) {
        responseparts.push({
          functionResponse: {
            name: call.name,
            response: { error: err instanceof Error ? err.message : String(err) },
          },
        });
      }
    }

    contents.push({ role: 'user', parts: responseparts });
  }

  return {
    text: 'La consulta requirió demasiadas búsquedas. Reformula de forma más específica.',
    citations,
    toolCallsUsed,
  };
}

/* ============================================================
 * Utility: resumen simple de una sección (una sola llamada a Gemini, sin tools).
 * Usado por el endpoint /summarize-section.
 * ============================================================ */
export async function summarizeSection(
  sectionText: string,
  mode: 'paciente' | 'profesional',
  apiKey: string,
): Promise<string> {
  const prompt =
    mode === 'paciente'
      ? `Explicá el siguiente texto oficial de la Ficha Técnica de un medicamento en lenguaje SIMPLE para una persona sin formación médica. Usá bullets cortos (3-5 puntos), sin jerga. Al final añadí: "Esta información no sustituye la consulta con tu médico o farmacéutico." Texto:\n\n${sectionText}`
      : `Resumí el siguiente texto oficial de la Ficha Técnica en bullets técnicos concisos para un profesional sanitario (3-5 puntos). Preservá terminología médica. Texto:\n\n${sectionText}`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  return text ?? 'No se pudo generar el resumen.';
}
