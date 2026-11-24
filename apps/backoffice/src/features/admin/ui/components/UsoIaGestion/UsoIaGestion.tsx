'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  RowActionsItem,
  RowActionsMenu,
  RowActionsNote,
  RowActionsSeparator,
} from '@/shared/components/molecules/RowActionsMenu';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { cn } from '@/shared/lib/cn';
import type { UsoIaFarmacia } from '../../../data/usoData';
import { quitarClaveGeminiAction } from '../../../actions/iaActions';
import { dolares } from '../../lib/dinero';
import { LimiteIaDialog } from '../LimiteIaDialog';
import { ClaveGeminiDialog } from '../ClaveGeminiDialog';

/** Tabla (escritorio) y tarjetas (móvil) conviven en el DOM: elige el visible. */
function enfocarFila(id: string) {
  setTimeout(() => {
    [...document.querySelectorAll<HTMLElement>(`[data-acciones="${id}"]`)].find((el) => el.offsetParent !== null)?.focus();
  }, 60);
}

function Gasto({ f, esMesActual }: { f: UsoIaFarmacia; esMesActual: boolean }) {
  // El límite es el de ahora: en meses pasados solo se enseña lo gastado.
  if (!esMesActual) return <span className="font-semibold text-[var(--color-ink)]">{dolares(f.gastoMes)}</span>;
  if (f.limiteMes === null) {
    return (
      <span className="text-[var(--color-ink-2)]">
        <span className="font-semibold text-[var(--color-ink)]">{dolares(f.gastoMes)}</span> · sin límite
      </span>
    );
  }
  const pct = f.porcentaje ?? 0;
  const tono = pct >= 100 ? 'bg-[var(--color-red-ink)]' : pct >= 80 ? 'bg-[var(--color-yellow-ink)]' : 'bg-[var(--color-accent)]';
  return (
    <span className="block min-w-[170px]">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--color-ink-2)]">
        <span>
          <span className="font-semibold text-[var(--color-ink)]">{dolares(f.gastoMes)}</span> de {dolares(f.limiteMes)}
        </span>
        {pct >= 100 ? (
          <span className="chip chip-red">IA parada</span>
        ) : pct >= 80 ? (
          <span className="chip chip-yellow">Cerca del límite</span>
        ) : null}
      </span>
      <span aria-hidden className="mt-1.5 block h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        <span className={cn('block h-full rounded-full', tono)} style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className="sr-only">{`(${pct} % del límite)`}</span>
    </span>
  );
}

function Clave({ f }: { f: UsoIaFarmacia }) {
  if (f.finClave === null) return <span className="text-[var(--color-muted)]">General</span>;
  if (f.finClave === '') return <span className="chip chip-red">Propia, no se puede leer</span>;
  return (
    <span className="text-[var(--color-ink-2)]">
      Propia <span className="font-mono-tabular text-[var(--color-muted)]">(acaba en {f.finClave})</span>
    </span>
  );
}

const usos = (f: UsoIaFarmacia) =>
  `${f.conciliacionesMes} ${f.conciliacionesMes === 1 ? 'conciliación' : 'conciliaciones'} (${f.pdfsMes} PDF) · ${f.traduccionesMes} ${f.traduccionesMes === 1 ? 'traducción' : 'traducciones'}`;

export function UsoIaGestion({
  farmacias,
  puedeGuardarClaves,
  esMesActual,
  mesEtiqueta,
}: {
  farmacias: UsoIaFarmacia[];
  puedeGuardarClaves: boolean;
  esMesActual: boolean;
  mesEtiqueta: string;
}) {
  const [limite, setLimite] = useState<UsoIaFarmacia | null>(null);
  const [clave, setClave] = useState<UsoIaFarmacia | null>(null);
  const [quitar, setQuitar] = useState<UsoIaFarmacia | null>(null);

  async function hacerQuitar(f: UsoIaFarmacia) {
    const res = await quitarClaveGeminiAction(f.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${f.nombre} vuelve a usar la clave general`);
    enfocarFila(f.id);
  }

  const acciones = (f: UsoIaFarmacia) => (
    <RowActionsMenu label={`Acciones para ${f.nombre}`} triggerProps={{ 'data-acciones': f.id }}>
      <RowActionsItem icon="Scales" onSelect={() => setLimite(f)}>
        Cambiar límite mensual
      </RowActionsItem>
      {puedeGuardarClaves ? (
        <RowActionsItem icon="Key" onSelect={() => setClave(f)}>
          {f.finClave === null ? 'Poner clave propia' : 'Cambiar clave propia'}
        </RowActionsItem>
      ) : (
        <RowActionsNote>Para poner una clave propia falta ENCRYPTION_KEY en el servidor.</RowActionsNote>
      )}
      {f.finClave !== null && (
        <>
          <RowActionsSeparator />
          <RowActionsItem icon="ArrowCounterClockwise" peligro onSelect={() => setQuitar(f)}>
            Quitar clave propia
          </RowActionsItem>
        </>
      )}
    </RowActionsMenu>
  );

  if (farmacias.length === 0) {
    return (
      <div className="card px-5 py-10 text-center">
        <p className="m-0 text-[14.5px] text-[var(--color-muted)]">Todavía no hay farmacias.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="farmacias-titulo">
      <h2 id="farmacias-titulo" className="m-0 mb-3 text-[18px] font-bold text-[var(--color-ink)]">
        Por farmacia
      </h2>
      {/* Escritorio: tabla */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <table className="w-full text-left text-[14px]">
          <caption className="sr-only">Uso de IA por farmacia en {mesEtiqueta}</caption>
          <thead>
            <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
              <th scope="col" className="px-5 py-2.5 font-semibold">Farmacia</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">{esMesActual ? 'Gastado este mes' : 'Gastado'}</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Uso</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Clave de Gemini</th>
              <th scope="col" className="px-5 py-2.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline)]">
            {farmacias.map((f) => (
              <tr key={f.id} className="transition-colors hover:bg-[var(--color-surface-2)]">
                <td className="px-5 py-3 font-semibold text-[var(--color-ink)]">{f.nombre}</td>
                <td className="px-3 py-3"><Gasto f={f} esMesActual={esMesActual} /></td>
                <td className="px-3 py-3 text-[var(--color-ink-2)]">{usos(f)}</td>
                <td className="px-3 py-3"><Clave f={f} /></td>
                <td className="w-16 px-5 py-3 text-right">{acciones(f)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
        {farmacias.map((f) => (
          <li key={f.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1.5 text-[14px]">
                <p className="m-0 text-[15px] font-semibold text-[var(--color-ink)]">{f.nombre}</p>
                <Gasto f={f} esMesActual={esMesActual} />
                <p className="m-0 text-[13.5px] text-[var(--color-muted)]">{usos(f)}</p>
                <p className="m-0 text-[13.5px]">
                  <span className="text-[var(--color-muted)]">Clave: </span>
                  <Clave f={f} />
                </p>
              </div>
              {acciones(f)}
            </div>
          </li>
        ))}
      </ul>

      {limite && (
        <LimiteIaDialog
          key={limite.id}
          farmacia={limite}
          onClose={(guardado) => {
            setLimite(null);
            if (guardado) toast.success(`Límite de ${limite.nombre} guardado`);
          }}
        />
      )}
      {clave && (
        <ClaveGeminiDialog
          key={clave.id}
          farmacia={clave}
          onClose={(final) => {
            setClave(null);
            if (final) toast.success(`Clave de ${clave.nombre} comprobada y guardada`, { description: `Acaba en ${final}.` });
          }}
        />
      )}
      <ConfirmDialog
        open={!!quitar}
        onOpenChange={(o) => !o && setQuitar(null)}
        title={`¿Quitar la clave propia de ${quitar?.nombre ?? ''}?`}
        description="Volverá a usar la clave general de Larokifarm, y su gasto lo pagaréis vosotros. Su límite mensual sigue igual."
        confirmLabel="Quitar clave"
        onConfirm={() => quitar && hacerQuitar(quitar)}
      />
    </section>
  );
}
