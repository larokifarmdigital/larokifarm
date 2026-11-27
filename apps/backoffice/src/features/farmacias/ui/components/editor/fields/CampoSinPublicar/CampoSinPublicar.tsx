'use client';

import type { ReactNode } from 'react';
import type { CambioSinPublicar } from '@/core/farmacias/domain';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { cn } from '@/shared/lib/cn';

/** El campo (clave de primer nivel de la ficha, p. ej. `heroChip`) difiere de lo publicado. */
export function useCampoSinPublicar(campo: string | undefined): boolean {
  const { cambios } = useFarmaciaEditor();
  if (!campo || !cambios) return false;
  const raiz = campo.split('.')[0] as CambioSinPublicar['campo'];
  return cambios.some((c) => c.campo === raiz);
}

/**
 * Marca un campo o bloque con cambios sin publicar: borde ámbar a la izquierda
 * (en el margen, sin mover el contenido) y la etiqueta «Sin publicar» arriba a
 * la derecha, fuera del flujo: escribir no hace saltar el campo.
 */
export function CampoSinPublicar({
  campo,
  className,
  soloBorde = false,
  children,
}: {
  campo: string | undefined;
  className?: string;
  /**
   * `borde`: solo el borde, para bloques con botones arriba a la derecha (la
   * etiqueta los taparía). `enLabel`: el campo pinta <EtiquetaSinPublicar> en su
   * propia etiqueta, junto al chip de idioma.
   */
  soloBorde?: boolean | 'enLabel';
  children: ReactNode;
}) {
  const sinPublicar = useCampoSinPublicar(campo);
  return (
    <div className={cn('relative', sinPublicar && 'campo-sin-publicar', className)}>
      {sinPublicar && soloBorde === true && <span className="sr-only">Cambios sin publicar en este bloque.</span>}
      {sinPublicar && !soloBorde && <EtiquetaSinPublicar className="pointer-events-none absolute -top-0.5 right-0 z-[1]" />}
      {children}
    </div>
  );
}

export function EtiquetaSinPublicar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-[var(--color-yellow-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--color-yellow-ink)]',
        className,
      )}
    >
      Sin publicar
    </span>
  );
}
