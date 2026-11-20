'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { usePublicacionEstado } from '@/features/farmacias/ui/components/editor/status/PublicacionEstado';

/**
 * Única región viva del editor (siempre montada y oculta a la vista): anuncia
 * los cambios de guardado y de publicación. Los indicadores visibles
 * (AutosaveIndicator, PublicacionEstado) no son regiones vivas para no
 * repetir el aviso. "Guardando…" no se anuncia: sería un aviso cada pocos segundos.
 */
export function EstadoAnunciado() {
  const { saveStatus, errorKind, dirty, lastSavedAt, readOnly } = useFarmaciaEditor();
  const pub = usePublicacionEstado();

  let guardado = '';
  if (!readOnly) {
    if (saveStatus === 'conflict') guardado = 'No se ha podido guardar: recarga la página.';
    else if (saveStatus === 'error' && dirty)
      guardado = errorKind === 'network' ? 'Sin conexión: no se ha podido guardar.' : 'No se ha podido guardar.';
    else if (!dirty && saveStatus !== 'saving' && lastSavedAt) guardado = 'Guardado.';
  }

  return (
    <div role="status" className="sr-only">
      {guardado} {pub.corto}.
    </div>
  );
}
