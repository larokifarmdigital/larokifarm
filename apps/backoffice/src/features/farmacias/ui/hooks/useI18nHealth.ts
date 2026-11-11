import { useMemo } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { summarizeMissing, type MissingSummary } from '@/features/farmacias/ui/lib/i18nStatus';

/** Traducciones pendientes de la farmacia en edición. Compartido por el chip
 *  de salud y el aviso de publicar para que las cifras no diverjan. */
export function useI18nHealth(): MissingSummary {
  const { farmacia } = useFarmaciaEditor();
  return useMemo(() => summarizeMissing(farmacia), [farmacia]);
}
