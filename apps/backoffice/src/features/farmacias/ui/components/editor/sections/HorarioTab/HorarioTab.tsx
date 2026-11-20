'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { HorarioSemanal } from '@/features/farmacias/ui/components/editor/fields/HorarioSemanal';
import { useFieldErrors } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import type { Horario } from '@/core/farmacias/domain';

const LABORABLES: Horario['dia'][] = ['mar', 'mie', 'jue', 'vie'];

const HORARIO_TIPICO: Horario[] = [
  { dia: 'lun', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'mar', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'mie', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'jue', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'vie', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'sab', tramos: [{ abre: '09:30', cierra: '14:00' }], cerrado: false },
  { dia: 'dom', tramos: [], cerrado: true },
];

/**
 * Sección propia (antes al final de "General"): es la tarea más frecuente
 * del personal y la sección de entrada del editor.
 */
export function HorarioTab() {
  const { farmacia, patch, readOnly } = useFarmaciaEditor();
  const fieldError = useFieldErrors();
  const feHorarios = fieldError('horarios');
  const [confirmCopia, setConfirmCopia] = useState(false);

  const vacio = !farmacia.horarios.some((h) => h.tramos.length > 0);
  const lunes = farmacia.horarios.find((h) => h.dia === 'lun');
  const lunesAbierto = Boolean(lunes && !lunes.cerrado && lunes.tramos.length > 0);

  const copiarLunes = () => {
    if (!lunes) return;
    const resto = farmacia.horarios.filter((h) => h.dia !== 'lun' && !LABORABLES.includes(h.dia));
    const copias = LABORABLES.map((dia) => ({ dia, cerrado: false, tramos: lunes.tramos.map((t) => ({ ...t })) }));
    patch({ horarios: [lunes, ...copias, ...resto] });
    toast.success('Horario del lunes copiado de martes a viernes');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <section aria-labelledby="sec-horarios">
        <SectionHeader
          id="sec-horarios"
          title="Horario semanal"
          hint="Activa los días que abre la farmacia y ajusta las horas. Puedes poner un horario de mañana y otro de tarde."
          actions={
            readOnly ? undefined : vacio ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => patch({ horarios: HORARIO_TIPICO })}>
                <NavIcon name="Lightning" size={13} />
                Empezar con un horario típico
              </Button>
            ) : lunesAbierto ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmCopia(true)}>
                <NavIcon name="Copy" size={13} />
                Copiar el lunes a martes–viernes
              </Button>
            ) : null
          }
        />

        <HorarioSemanal
          horarios={farmacia.horarios}
          onChange={(next) => {
            patch({ horarios: next });
            feHorarios.inputProps.onBlur();
          }}
        />
        <FieldError {...feHorarios} />
      </section>

      <ConfirmDialog
        open={confirmCopia}
        onOpenChange={setConfirmCopia}
        title="¿Copiar el horario del lunes?"
        description="El horario de martes a viernes se sustituye por el del lunes. Sábado y domingo no cambian."
        confirmLabel="Copiar"
        variant="accent"
        onConfirm={copiarLunes}
      />
    </div>
  );
}
