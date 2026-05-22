import type { CimaNota, CimaProblemaSuministro } from '../api/types';

interface Props {
  notas: CimaNota[];
  suministro: CimaProblemaSuministro[];
}

function formatDate(ms?: number) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AlertBanner({ notas, suministro }: Props) {
  const activeSupply = suministro.filter((s) => s.activo);
  if (notas.length === 0 && activeSupply.length === 0) return null;

  return (
    <div class="cima-alerts">
      {activeSupply.length > 0 && (
        <div class="cima-alert supply">
          <strong>⚠️ Problemas de suministro activos ({activeSupply.length})</strong>
          <ul>
            {activeSupply.slice(0, 3).map((s) => (
              <li key={s.cn}>
                <span class="cima-alert-name">{s.nombre}</span>
                {s.ffin && <span class="cima-alert-meta"> · prev. fin {formatDate(s.ffin)}</span>}
                {s.observ && <div class="cima-alert-obs">{s.observ}</div>}
              </li>
            ))}
          </ul>
          {activeSupply.length > 3 && (
            <div class="cima-alert-more">+{activeSupply.length - 3} más</div>
          )}
        </div>
      )}
      {notas.length > 0 && (
        <div class="cima-alert notes">
          <strong>🚨 Notas de seguridad AEMPS</strong>
          <ul>
            {notas.map((n) => (
              <li key={n.num}>
                <a href={n.url} target="_blank" rel="noopener noreferrer">
                  {n.asunto}
                </a>
                <span class="cima-alert-meta"> · {n.referencia} · {formatDate(n.fecha)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
