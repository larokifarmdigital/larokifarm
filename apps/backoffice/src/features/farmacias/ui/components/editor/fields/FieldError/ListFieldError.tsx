'use client';

import { useFieldBinding } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from './FieldError';

/**
 * Error de una lista obligatoria ("Añade al menos 1 servicio") y ancla para
 * que "Revisar" del aviso de publicar haga scroll hasta ella.
 */
export function ListFieldError({ field }: { field: string }) {
  const { id, error } = useFieldBinding(field, '');
  return (
    <div id={id} className="scroll-mt-32">
      {error && <FieldError {...error} />}
    </div>
  );
}
