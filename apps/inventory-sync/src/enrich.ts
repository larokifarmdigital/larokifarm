import type { ParsedRow } from './excel.js';

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

async function fetchByCn(cn: string): Promise<CimaListItem | null> {
  const res = await fetch(`${CIMA_BASE}/medicamentos?cn=${encodeURIComponent(cn)}&pagesize=1`);
  if (!res.ok) throw new Error(`CIMA cn=${cn} ${res.status}`);
  const json = (await res.json()) as CimaList;
  return json.resultados?.[0] ?? null;
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
    return {
      ok: true,
      item: {
        cn: row.cn,
        nregistro: listItem.nregistro,
        nombre: listItem.nombre,
        atcs: [],
        principios: [],
        labtitular: listItem.labtitular,
        receta: listItem.receta,
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

export async function enrichRows(
  rows: ParsedRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<{
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
    if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, rows.length), rows.length);
    if (i + CHUNK_SIZE < rows.length) await sleep(CHUNK_DELAY_MS);
  }
  return { items, notFound };
}
