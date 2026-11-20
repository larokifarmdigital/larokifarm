'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { cn } from '@/shared/lib/cn';

/**
 * Eje 2 del estado: ¿lo que has cambiado ya está en tu web?
 * (El editor guarda solo; publicar es lo que lo lleva a la web.)
 */
export function usePublicacionEstado() {
  const { farmacia, pendientePublicar } = useFarmaciaEditor();
  if (farmacia.status === 'archived') {
    return { tono: 'neutral' as const, corto: 'Archivada', largo: 'Archivada: no está en la web.' };
  }
  if (farmacia.status !== 'published') {
    return { tono: 'amarillo' as const, corto: 'Sin publicar', largo: 'Todavía no está en la web: se verá cuando pulses Publicar.' };
  }
  if (pendientePublicar) {
    return {
      tono: 'amarillo' as const,
      corto: 'Cambios sin publicar',
      largo: 'Cambios sin publicar: se verán en la web cuando pulses Publicar.',
    };
  }
  return { tono: 'verde' as const, corto: 'Publicada y al día', largo: 'Publicada y al día: tu web muestra lo último.' };
}

export function PublicacionEstado({ compacto = false }: { compacto?: boolean }) {
  const e = usePublicacionEstado();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium',
        e.tono === 'verde' && 'text-[var(--color-green-ink)]',
        e.tono === 'amarillo' && 'text-[var(--color-yellow-ink)]',
        e.tono === 'neutral' && 'text-[var(--color-muted)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          e.tono === 'verde' && 'bg-[var(--color-green-ink)]',
          e.tono === 'amarillo' && 'bg-[var(--color-yellow-ink)]',
          e.tono === 'neutral' && 'bg-[var(--color-muted)]',
        )}
      />
      {compacto ? e.corto : e.largo}
    </span>
  );
}
