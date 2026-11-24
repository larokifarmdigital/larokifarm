'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Select } from '@/shared/components/atoms/Select';

/** Mes que se mira en «Uso de IA» (en la URL: ?mes=AAAA-MM). */
export function SelectorMes({ mes, meses }: { mes: string; meses: { clave: string; etiqueta: string }[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const actual = meses.at(-1)?.clave;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="uso-mes" className="label m-0">
        Mes
      </label>
      <Select
        id="uso-mes"
        className="min-w-[190px]"
        value={mes}
        onValueChange={(v) =>
          startTransition(() => router.push(v === actual ? '/admin/uso' : `/admin/uso?mes=${v}`, { scroll: false }))
        }
        options={[...meses].reverse().map((m) => ({
          value: m.clave,
          label: m.clave === actual ? `Este mes (${m.etiqueta})` : m.etiqueta[0]!.toUpperCase() + m.etiqueta.slice(1),
        }))}
      />
    </div>
  );
}
