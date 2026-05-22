import { getMedicamento } from '../api/cima';
import { atcFor } from './atcMap';
import type { Inventory, InventoryItem } from '../api/inventory';
import type { CimaMedicamentoListItem } from '../api/types';

const MAX_INJECTED = 5;
const PARALLEL_FETCH = 5;

export function isInStock(nregistro: string, inv: Inventory | null): boolean {
  return inv ? inv.byNregistro.has(nregistro) : false;
}

export function sortByStock<T extends { nregistro: string }>(
  items: T[],
  inv: Inventory | null,
): T[] {
  if (!inv || inv.byNregistro.size === 0) return items;
  const stock: T[] = [];
  const rest: T[] = [];
  for (const it of items) {
    if (inv.byNregistro.has(it.nregistro)) stock.push(it);
    else rest.push(it);
  }
  return [...stock, ...rest];
}

function collectCandidates(
  activosOrAtcs: string[],
  inv: Inventory,
): InventoryItem[] {
  const seen = new Set<string>();
  const out: InventoryItem[] = [];
  for (const token of activosOrAtcs) {
    const matches: InventoryItem[] = [];
    const direct = inv.byAtc.get(token);
    if (direct) matches.push(...direct);
    const atc = atcFor(token);
    if (atc) {
      const byMappedAtc = inv.byAtc.get(atc);
      if (byMappedAtc) matches.push(...byMappedAtc);
    }
    const byPrincipio = inv.byPrincipio.get(token.toLowerCase());
    if (byPrincipio) matches.push(...byPrincipio);
    for (const m of matches) {
      if (seen.has(m.nregistro)) continue;
      seen.add(m.nregistro);
      out.push(m);
    }
  }
  return out;
}

export async function injectMissingByAtc(
  current: CimaMedicamentoListItem[],
  activosOrAtcs: string[],
  inv: Inventory | null,
  signal?: AbortSignal,
): Promise<CimaMedicamentoListItem[]> {
  if (!inv || inv.byNregistro.size === 0) return current;
  const already = new Set(current.map((m) => m.nregistro));
  const candidates = collectCandidates(activosOrAtcs, inv)
    .filter((c) => !already.has(c.nregistro))
    .slice(0, MAX_INJECTED);
  if (candidates.length === 0) return current;

  const fetched: CimaMedicamentoListItem[] = [];
  for (let i = 0; i < candidates.length; i += PARALLEL_FETCH) {
    const batch = candidates.slice(i, i + PARALLEL_FETCH);
    const results = await Promise.all(
      batch.map((c) =>
        getMedicamento(c.nregistro, signal)
          .then<CimaMedicamentoListItem>((d) => d)
          .catch(() => ({
            nregistro: c.nregistro,
            nombre: c.nombre,
            labtitular: c.labtitular,
            receta: c.receta,
          })),
      ),
    );
    if (signal?.aborted) return current;
    fetched.push(...results);
  }
  return [...fetched, ...current];
}
