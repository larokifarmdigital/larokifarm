import type { ParsedRow } from './excel';

const CIMA_BASE = 'https://cima.aemps.es/cima/rest';
const CHUNK_SIZE = 10;
const CHUNK_DELAY_MS = 150;

export interface InventoryItem {
  cn: string;
  nregistro: string;
  nombre: string;
  atcs: string[];
  principios: string[];
  labtitular?: string;
  receta?: boolean;
}

export interface NotFound {
  cn: string;
  descripcion: string;
  reason: 'not-in-cima' | 'cima-error';
}

interface CimaListItem {
  nregistro: string;
  nombre: string;
  labtitular?: string;
  receta?: boolean;
}

interface CimaList {
  resultados: CimaListItem[];
}

interface CimaAtc {
  codigo: string;
  nombre: string;
  nivel: number;
}

interface CimaPrincipioActivo {
  nombre: string;
}

interface CimaDetail {
  nregistro: string;
  nombre: string;
  labtitular?: string;
  receta?: boolean;
  atcs?: CimaAtc[];
  principiosActivos?: CimaPrincipioActivo[];
  pactivos?: string;
}

async function fetchByCn(cn: string): Promise<CimaListItem | null> {
  const res = await fetch(`${CIMA_BASE}/medicamentos?cn=${encodeURIComponent(cn)}&pagesize=1`);
  if (!res.ok) throw new Error(`CIMA cn=${cn} ${res.status}`);
  const json = (await res.json()) as CimaList;
  return json.resultados?.[0] ?? null;
}

async function fetchDetail(nregistro: string): Promise<CimaDetail | null> {
  const res = await fetch(
    `${CIMA_BASE}/medicamento?nregistro=${encodeURIComponent(nregistro)}`,
  );
  if (!res.ok) return null;
  return (await res.json()) as CimaDetail;
}

function dedupeAtcs(detail: CimaDetail | null): string[] {
  const set = new Set<string>();
  for (const a of detail?.atcs ?? []) if (a.codigo) set.add(a.codigo);
  return [...set];
}

function principiosOf(detail: CimaDetail | null): string[] {
  if (!detail) return [];
  const arr = detail.principiosActivos?.map((p) => p.nombre).filter(Boolean);
  if (arr && arr.length) return arr.map((s) => s.toLowerCase());
  if (detail.pactivos) {
    return detail.pactivos
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

async function enrichOne(row: ParsedRow): Promise<
  | { ok: true; item: InventoryItem }
  | { ok: false; notFound: NotFound }
> {
  try {
    const listItem = await fetchByCn(row.cn);
    if (!listItem) {
      return {
        ok: false,
        notFound: { cn: row.cn, descripcion: row.descripcion, reason: 'not-in-cima' },
      };
    }
    const detail = await fetchDetail(listItem.nregistro);
    return {
      ok: true,
      item: {
        cn: row.cn,
        nregistro: listItem.nregistro,
        nombre: detail?.nombre ?? listItem.nombre,
        atcs: dedupeAtcs(detail),
        principios: principiosOf(detail),
        labtitular: detail?.labtitular ?? listItem.labtitular,
        receta: detail?.receta ?? listItem.receta,
      },
    };
  } catch {
    return {
      ok: false,
      notFound: { cn: row.cn, descripcion: row.descripcion, reason: 'cima-error' },
    };
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function enrichRows(rows: ParsedRow[]): Promise<{
  items: InventoryItem[];
  notFound: NotFound[];
}> {
  const items: InventoryItem[] = [];
  const notFound: NotFound[] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const batch = rows.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(batch.map(enrichOne));
    for (const r of results) {
      if (r.ok) items.push(r.item);
      else notFound.push(r.notFound);
    }
    if (i + CHUNK_SIZE < rows.length) await sleep(CHUNK_DELAY_MS);
  }
  return { items, notFound };
}
