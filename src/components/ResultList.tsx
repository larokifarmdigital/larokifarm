import type { CimaMedicamentoListItem } from '../api/types';
import type { Inventory } from '../api/inventory';
import { isInStock, sortByStock } from '../lib/inventoryFilter';

interface Props {
  items: CimaMedicamentoListItem[];
  onSelect: (m: CimaMedicamentoListItem) => void;
  loading: boolean;
  total: number;
  query: string;
  inventory: Inventory | null;
}

export function ResultList({ items, onSelect, loading, total, query, inventory }: Props) {
  if (loading) return <div class="cima-status">Buscando…</div>;
  if (!query) {
    return (
      <div class="cima-empty">
        <p>Escribe el nombre de un medicamento para empezar.</p>
        <p class="cima-hint">Ejemplos: ibuprofeno, paracetamol, omeprazol.</p>
      </div>
    );
  }
  if (items.length === 0) {
    return <div class="cima-status">Sin resultados para "{query}".</div>;
  }
  const ordered = sortByStock(items, inventory);
  return (
    <div class="cima-results">
      {total > items.length && (
        <div class="cima-results-count">Mostrando {items.length} de {total} resultados</div>
      )}
      <ul>
        {ordered.map((m) => {
          const inStock = isInStock(m.nregistro, inventory);
          return (
            <li key={m.nregistro}>
              <button
                class={`cima-result${inStock ? ' in-stock' : ''}`}
                onClick={() => onSelect(m)}
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
                  {m.triangulo && <span class="cima-badge tri" title="Medicamento en seguimiento adicional">▼</span>}
                  {m.generico && <span class="cima-badge gen">EFG</span>}
                  {m.notas && <span class="cima-badge note" title="Tiene notas de seguridad AEMPS">🚨</span>}
                  {m.psum && <span class="cima-badge psum" title="Problemas de suministro">⚠️</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
