'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal } from '@/shared/components/molecules/Modal';

/**
 * Filtros en móvil (< md): botón "Filtros (N)" junto al buscador que abre un
 * diálogo con los Selects y sus etiquetas visibles. Se aplican al momento (el
 * recuento de la lista cambia detrás); "Ver resultados" solo cierra.
 * En escritorio los mismos controles van en línea en la barra (no se usa esto).
 */
export function FiltrosMovil({
  activos,
  resultados,
  onQuitar,
  children,
}: {
  /** Cuántos filtros (sin contar el buscador) hay puestos. */
  activos: number;
  /** Texto del botón de cierre, p. ej. "Ver 12 conciliaciones". */
  resultados: string;
  onQuitar?: () => void;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const verRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="secondary"
        aria-haspopup="dialog"
        onClick={() => setAbierto(true)}
        className="min-h-11 w-full whitespace-nowrap"
      >
        <NavIcon name="FunnelSimple" size={16} />
        Filtros{activos > 0 && <span className="font-semibold"> ({activos})</span>}
        {activos > 0 && <span className="sr-only">{activos === 1 ? ' filtro puesto' : ' filtros puestos'}</span>}
      </Button>
      <Modal
        open={abierto}
        onOpenChange={setAbierto}
        title="Filtros"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onQuitar && activos > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onQuitar();
                  // El botón desaparece al no haber filtros: el foco va a "Ver N …"
                  requestAnimationFrame(() => verRef.current?.focus());
                }}
              >
                Quitar filtros
              </Button>
            )}
            <Button ref={verRef} type="button" variant="accent" onClick={() => setAbierto(false)}>
              {resultados}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">{children}</div>
      </Modal>
    </div>
  );
}
