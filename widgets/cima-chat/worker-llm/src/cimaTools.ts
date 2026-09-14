/**
 * Tools de CIMA (AEMPS) que Gemini puede invocar por function calling.
 * Cada función es un adapter fino a la API pública de CIMA — mismo endpoint
 * que consume el frontend, pero server-side para poder llamarlas desde el LLM.
 *
 * Nota: mantenemos las respuestas COMPACTAS (top N, campos esenciales) para
 * no gastar tokens innecesarios en el contexto de Gemini.
 */

const CIMA_BASE = 'https://cima.aemps.es/cima/rest';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`CIMA ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`CIMA ${res.status}: ${url}`);
  return res.text();
}

/** Busca medicamentos por nombre (parcial). Devuelve top 5 compactado. */
export async function searchByName(nombre: string): Promise<Array<{
  nregistro: string;
  nombre: string;
  laboratorio?: string;
  cn?: string;
  receta?: boolean;
  generico?: boolean;
  triangulo?: boolean;
}>> {
  const url = `${CIMA_BASE}/medicamentos?nombre=${encodeURIComponent(nombre)}&pagesize=5`;
  const data = (await getJSON(url)) as { resultados?: Array<Record<string, unknown>> };
  const raw = data.resultados ?? [];
  return raw.slice(0, 5).map((m) => ({
    nregistro: String(m.nregistro),
    nombre: String(m.nombre ?? ''),
    laboratorio: m.labtitular ? String(m.labtitular) : undefined,
    cn: m.cn ? String(m.cn) : undefined,
    receta: typeof m.receta === 'boolean' ? m.receta : undefined,
    generico: typeof m.generico === 'boolean' ? m.generico : undefined,
    triangulo: typeof m.triangulo === 'boolean' ? m.triangulo : undefined,
  }));
}

/** Busca por Código Nacional exacto. */
export async function searchByCN(cn: string) {
  return searchByName('').then(() =>
    (async () => {
      const url = `${CIMA_BASE}/medicamentos?cn=${encodeURIComponent(cn)}&pagesize=5`;
      const data = (await getJSON(url)) as { resultados?: Array<Record<string, unknown>> };
      const raw = data.resultados ?? [];
      return raw.slice(0, 5).map((m) => ({
        nregistro: String(m.nregistro),
        nombre: String(m.nombre ?? ''),
        cn: m.cn ? String(m.cn) : undefined,
        receta: typeof m.receta === 'boolean' ? m.receta : undefined,
      }));
    })(),
  );
}

/** Busca alternativas del mismo grupo terapéutico por código ATC. */
export async function searchByATC(atc: string) {
  const url = `${CIMA_BASE}/medicamentos?atc=${encodeURIComponent(atc)}&comerc=1&pagesize=8`;
  const data = (await getJSON(url)) as { resultados?: Array<Record<string, unknown>> };
  const raw = data.resultados ?? [];
  return raw.slice(0, 8).map((m) => ({
    nregistro: String(m.nregistro),
    nombre: String(m.nombre ?? ''),
    receta: typeof m.receta === 'boolean' ? m.receta : undefined,
    generico: typeof m.generico === 'boolean' ? m.generico : undefined,
  }));
}

/** Ficha completa por número de registro AEMPS. Solo los campos que aportan al LLM. */
export async function getMedicamentoDetail(nregistro: string) {
  const url = `${CIMA_BASE}/medicamento?nregistro=${encodeURIComponent(nregistro)}`;
  const m = (await getJSON(url)) as Record<string, unknown>;
  const principios = Array.isArray(m.principiosActivos)
    ? (m.principiosActivos as Array<Record<string, unknown>>)
        .map((p) => [p.nombre, p.cantidad, p.unidad].filter(Boolean).join(' '))
        .join(' + ')
    : undefined;
  const via = Array.isArray(m.vias)
    ? (m.vias as Array<Record<string, unknown>>)
        .map((v) => v.nombre as string | undefined)
        .filter(Boolean)
        .join(', ')
    : undefined;
  const atcs = Array.isArray(m.atcs)
    ? (m.atcs as Array<Record<string, unknown>>).map((a) => ({
        codigo: String(a.codigo ?? ''),
        nombre: String(a.nombre ?? ''),
      }))
    : [];
  return {
    nregistro: String(m.nregistro ?? nregistro),
    nombre: String(m.nombre ?? ''),
    laboratorio: m.labtitular ? String(m.labtitular) : undefined,
    principiosActivos: principios,
    viaAdministracion: via,
    receta: typeof m.receta === 'boolean' ? m.receta : undefined,
    generico: typeof m.generico === 'boolean' ? m.generico : undefined,
    triangulo: typeof m.triangulo === 'boolean' ? m.triangulo : undefined,
    tieneNotasSeguridad: typeof m.notas === 'boolean' ? m.notas : false,
    tieneProblemasSuministro: typeof m.psum === 'boolean' ? m.psum : false,
    atcs,
  };
}

/**
 * Obtiene el texto de una sección específica de la Ficha Técnica o Prospecto.
 * - Doc 1 = Ficha Técnica (lenguaje profesional).
 * - Doc 2 = Prospecto (lenguaje paciente).
 *
 * Secciones clave:
 * 4.1 = indicaciones · 4.2 = posología · 4.3 = contraindicaciones
 * 4.4 = advertencias · 4.5 = interacciones · 4.6 = embarazo/lactancia
 * 4.7 = conducción · 4.8 = efectos adversos
 */
export async function getSeccion(
  nregistro: string,
  seccion: string,
  doc: '1' | '2' = '1',
): Promise<string> {
  const url = `${CIMA_BASE}/docSegmentado/contenido/${doc}?nregistro=${encodeURIComponent(nregistro)}&seccion=${encodeURIComponent(seccion)}`;
  const txt = await getText(url);
  // El endpoint devuelve HTML — extraemos el texto plano para no gastar tokens.
  return htmlToText(txt).slice(0, 4000);
}

/** Notas de seguridad AEMPS del medicamento. */
export async function getNotasSeguridad(nregistro: string) {
  const url = `${CIMA_BASE}/notas?nregistro=${encodeURIComponent(nregistro)}`;
  const notas = (await getJSON(url)) as Array<Record<string, unknown>>;
  return notas.slice(0, 3).map((n) => ({
    ref: n.ref ? String(n.ref) : undefined,
    asunto: n.asunto ? String(n.asunto) : undefined,
    fecha: n.fecha ? String(n.fecha) : undefined,
    url: n.url ? String(n.url) : undefined,
  }));
}

/** Problemas de suministro activos. */
export async function getSuministro(nregistro: string) {
  const url = `${CIMA_BASE}/psuministro?nregistro=${encodeURIComponent(nregistro)}&pagesize=3`;
  const data = (await getJSON(url)) as { resultados?: Array<Record<string, unknown>> };
  return (data.resultados ?? []).slice(0, 3).map((p) => ({
    cn: p.cn ? String(p.cn) : undefined,
    nombre: p.nombre ? String(p.nombre) : undefined,
    fini: p.fini ? String(p.fini) : undefined,
    ffin: p.ffin ? String(p.ffin) : undefined,
    motivo: p.motivo ? String(p.motivo) : undefined,
    observ: p.observ ? String(p.observ) : undefined,
  }));
}

/**
 * Búsqueda multi-criterio: N condiciones sobre secciones de la Ficha Técnica.
 * Ejemplo: para migraña (4.1 sí) sin contraindicación embarazo (4.3 no).
 */
export async function searchByFichaCriteria(
  criterios: Array<{ seccion: string; texto: string; contiene: 0 | 1 }>,
) {
  const url = `${CIMA_BASE}/buscarEnFichaTecnica`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criterios),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`CIMA ${res.status}: buscarEnFichaTecnica`);
  const data = (await res.json()) as { resultados?: Array<Record<string, unknown>> };
  const raw = data.resultados ?? [];
  return raw.slice(0, 6).map((m) => ({
    nregistro: String(m.nregistro),
    nombre: String(m.nombre ?? ''),
    receta: typeof m.receta === 'boolean' ? m.receta : undefined,
  }));
}

/** Strip HTML tags a texto plano compacto para no gastar tokens innecesarios. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
