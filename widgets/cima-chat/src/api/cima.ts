import type {
  CimaAtc,
  CimaMedicamento,
  CimaMedicamentoListItem,
  CimaNota,
  CimaPresentacion,
  CimaProblemaSuministro,
  CimaSearchFilters,
  CimaSearchResponse,
  CimaSeccion,
  DocTipo,
} from './types';

const BASE = 'https://cima.aemps.es/cima/rest';

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`CIMA ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function getText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`CIMA ${res.status}: ${url}`);
  return res.text();
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function searchMedicamentos(
  query: string,
  filters: CimaSearchFilters = {},
  signal?: AbortSignal,
  pagesize = 10,
): Promise<CimaSearchResponse<CimaMedicamentoListItem>> {
  const qs = buildQuery({ nombre: query, pagesize, ...filters });
  return getJSON(`${BASE}/medicamentos${qs}`, signal);
}

export function searchByCN(
  cn: string,
  signal?: AbortSignal,
): Promise<CimaSearchResponse<CimaMedicamentoListItem>> {
  return getJSON(`${BASE}/medicamentos?cn=${encodeURIComponent(cn)}&pagesize=10`, signal);
}

export function searchByAtc(
  atc: string,
  signal?: AbortSignal,
  pagesize = 20,
): Promise<CimaSearchResponse<CimaMedicamentoListItem>> {
  const qs = buildQuery({ atc, comerc: 1, pagesize });
  return getJSON(`${BASE}/medicamentos${qs}`, signal);
}

export async function searchPaged(
  params: Record<string, string | number | undefined>,
  signal: AbortSignal | undefined,
  maxResults: number,
  pageSize = 25,
): Promise<CimaMedicamentoListItem[]> {
  const merged: CimaMedicamentoListItem[] = [];
  const seen = new Set<string>();
  let page = 1;
  while (merged.length < maxResults) {
    const qs = buildQuery({ ...params, pagesize: pageSize, pagina: page });
    let resp: CimaSearchResponse<CimaMedicamentoListItem>;
    try {
      resp = await getJSON<CimaSearchResponse<CimaMedicamentoListItem>>(
        `${BASE}/medicamentos${qs}`,
        signal,
      );
    } catch {
      break;
    }
    if (signal?.aborted) break;
    if (!resp.resultados.length) break;
    for (const item of resp.resultados) {
      if (seen.has(item.nregistro)) continue;
      seen.add(item.nregistro);
      merged.push(item);
      if (merged.length >= maxResults) break;
    }
    if (resp.resultados.length < pageSize) break;
    page += 1;
    if (page > 8) break;
  }
  return merged;
}

export function getMedicamento(
  nregistro: string,
  signal?: AbortSignal,
): Promise<CimaMedicamento> {
  return getJSON(`${BASE}/medicamento?nregistro=${encodeURIComponent(nregistro)}`, signal);
}

export function getPresentaciones(
  nregistro: string,
  signal?: AbortSignal,
): Promise<CimaSearchResponse<CimaPresentacion>> {
  return getJSON(
    `${BASE}/presentaciones?nregistro=${encodeURIComponent(nregistro)}`,
    signal,
  );
}

export function getNotas(
  nregistro: string,
  signal?: AbortSignal,
): Promise<CimaNota[]> {
  return getJSON(`${BASE}/notas?nregistro=${encodeURIComponent(nregistro)}`, signal);
}

export function getProblemasSuministro(
  nombre: string,
  signal?: AbortSignal,
): Promise<CimaSearchResponse<CimaProblemaSuministro>> {
  return getJSON(
    `${BASE}/psuministro?nombre=${encodeURIComponent(nombre)}&pagesize=20`,
    signal,
  );
}

export function listSecciones(
  nregistro: string,
  tipo: DocTipo,
  signal?: AbortSignal,
): Promise<CimaSeccion[]> {
  return getJSON(
    `${BASE}/docSegmentado/secciones/${tipo}?nregistro=${encodeURIComponent(nregistro)}`,
    signal,
  );
}

export function getSeccionContenido(
  nregistro: string,
  tipo: DocTipo,
  seccion: string,
  signal?: AbortSignal,
): Promise<string> {
  return getText(
    `${BASE}/docSegmentado/contenido/${tipo}?nregistro=${encodeURIComponent(nregistro)}&seccion=${encodeURIComponent(seccion)}`,
    signal,
  );
}

export function shortName(nombre: string): string {
  return nombre.split(/[,(]/)[0].trim().split(/\s+/).slice(0, 2).join(' ');
}

export function firstPrincipio(pactivos?: string): string | undefined {
  if (!pactivos) return undefined;
  return pactivos.split(',')[0].trim();
}

export function mostSpecificAtc(atcs?: CimaAtc[]): CimaAtc | undefined {
  if (!atcs || atcs.length === 0) return undefined;
  return atcs.reduce((best, cur) => (cur.nivel > best.nivel ? cur : best));
}
