import { useEffect, useState } from 'preact/hooks';
import type { CimaMedicamentoListItem } from '../api/types';
import type { Inventory } from '../api/inventory';
import { injectMissingByAtc, isInStock, sortByStock } from '../lib/inventoryFilter';

interface Props {
  label: string;
  items: CimaMedicamentoListItem[];
  loading: boolean;
  currentNregistro: string;
  onPick: (m: CimaMedicamentoListItem) => void;
  onClose: () => void;
  inventory: Inventory | null;
  atc: string;
}

export function AlternativesList({
  label,
  items,
  loading,
  currentNregistro,
  onPick,
  onClose,
  inventory,
  atc,
}: Props) {
  const filtered = items.filter((m) => m.nregistro !== currentNregistro);
  const [enriched, setEnriched] = useState<CimaMedicamentoListItem[]>(filtered);

  useEffect(() => {
    let cancelled = false;
    const baseline = filtered;
    if (!inventory || inventory.byNregistro.size === 0 || !atc) {
      setEnriched(baseline);
      return;
    }
    const ctrl = new AbortController();
    injectMissingByAtc(baseline, [atc], inventory, ctrl.signal)
      .then((merged) => {
        if (cancelled) return;
        const noCurrent = merged.filter((m) => m.nregistro !== currentNregistro);
        setEnriched(sortByStock(noCurrent, inventory));
      })
      .catch(() => {
        if (!cancelled) setEnriched(sortByStock(baseline, inventory));
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [items, currentNregistro, inventory, atc]);

  return (
    <div class="cima-alternatives">
      <header>
        <strong>Alternativas con {label}</strong>
        <button class="cima-close-x" onClick={onClose} aria-label="Cerrar alternativas">×</button>
      </header>
      {loading ? (
        <div class="cima-status">Buscando alternativas comercializadas…</div>
      ) : enriched.length === 0 ? (
        <div class="cima-status">No se encontraron alternativas comercializadas.</div>
      ) : (
        <ul>
          {enriched.slice(0, 10).map((m) => {
            const inStock = isInStock(m.nregistro, inventory);
            return (
              <li key={m.nregistro}>
                <button
                  class={`cima-result compact${inStock ? ' in-stock' : ''}`}
                  onClick={() => onPick(m)}
                >
                  <div class="cima-result-name">
                    {m.nombre}
                    {inStock && <span class="cima-badge stock">⭐ En stock</span>}
                  </div>
                  <div class="cima-result-meta">
                    {m.labtitular && <span>{m.labtitular}</span>}
                    {m.receta !== undefined && (
                      <span class={`cima-badge ${m.receta ? 'rx' : 'otc'}`}>
                        {m.receta ? 'Con receta' : 'Sin receta'}
                      </span>
                    )}
                    {m.generico && <span class="cima-badge gen">EFG</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
