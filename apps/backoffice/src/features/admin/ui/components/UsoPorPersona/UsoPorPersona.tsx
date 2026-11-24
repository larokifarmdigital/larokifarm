import type { UsoIaPersona } from '../../../data/usoData';
import { dolares } from '../../lib/dinero';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Conciliaciones({ p }: { p: UsoIaPersona }) {
  if (p.conciliaciones === 0) return <span className="text-[var(--color-muted)]">0</span>;
  return (
    <>
      {p.conciliaciones}
      <span className="block text-[12.5px] text-[var(--color-muted)]">{plural(p.pdfs, 'PDF', 'PDF')}</span>
    </>
  );
}

/** Quién gasta IA en el mes elegido (conciliaciones + traducciones), de más a menos. */
export function UsoPorPersona({ personas, mesEtiqueta }: { personas: UsoIaPersona[]; mesEtiqueta: string }) {
  return (
    <section aria-labelledby="personas-titulo" className="mt-8">
      <h2 id="personas-titulo" className="m-0 mb-3 text-[18px] font-bold text-[var(--color-ink)]">
        Por persona
      </h2>
      {personas.length === 0 ? (
        <div className="card px-5 py-8 text-center">
          <p className="m-0 text-[14.5px] text-[var(--color-muted)]">Nadie ha usado la IA en {mesEtiqueta}.</p>
        </div>
      ) : (
        <>
          <div className="card hidden overflow-hidden p-0 md:block">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">Uso de IA por persona en {mesEtiqueta}</caption>
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Persona</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Farmacia</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Conciliaciones</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Traducciones</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Gastado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline)]">
                {personas.map((p) => (
                  <tr key={p.id ?? 'sin'}>
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-[var(--color-ink)]">{p.nombre}</span>
                      {p.email && <span className="block break-all text-[13px] text-[var(--color-muted)]">{p.email}</span>}
                    </td>
                    <td className="px-3 py-3 text-[var(--color-ink-2)]">{p.farmacias.join(', ')}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--color-ink-2)]"><Conciliaciones p={p} /></td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--color-ink-2)]">{p.traducciones}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-[var(--color-ink)]">{dolares(p.gasto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
            {personas.map((p) => (
              <li key={p.id ?? 'sin'} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[15px] font-semibold text-[var(--color-ink)]">{p.nombre}</p>
                    {p.email && <p className="m-0 break-all text-[13.5px] text-[var(--color-muted)]">{p.email}</p>}
                  </div>
                  <p className="m-0 shrink-0 text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">{dolares(p.gasto)}</p>
                </div>
                <p className="m-0 mt-1.5 text-[13.5px] text-[var(--color-ink-2)]">{p.farmacias.join(', ')}</p>
                <p className="m-0 mt-0.5 text-[13.5px] text-[var(--color-muted)]">
                  {plural(p.conciliaciones, 'conciliación', 'conciliaciones')} ({plural(p.pdfs, 'PDF', 'PDF')}) ·{' '}
                  {plural(p.traducciones, 'traducción', 'traducciones')}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
