import { tieneCambiosSinPublicar, type FarmaciaStatus, type FarmaciaSummary } from '@/core/farmacias/domain';

export const STATUS_META: Record<FarmaciaStatus, { label: string; tone: 'green' | 'yellow' | 'neutral' }> = {
  published: { label: 'Publicada', tone: 'green' },
  draft: { label: 'Borrador', tone: 'yellow' },
  archived: { label: 'Archivada', tone: 'neutral' },
};

/** Estado visible de la fila: una publicada con ediciones posteriores dice "Cambios sin publicar". */
export function estadoFila(f: FarmaciaSummary): { label: string; tone: 'green' | 'yellow' | 'neutral' } {
  if (f.status === 'published' && tieneCambiosSinPublicar({ ...f, ultimaPublicacion: f.ultimaPublicacion })) {
    return { label: 'Cambios sin publicar', tone: 'yellow' };
  }
  return STATUS_META[f.status];
}

/** "activas" (por defecto) = publicadas + borradores; las archivadas, en su filtro. */
export type StatusFilter = 'activas' | 'pendientes' | FarmaciaStatus;

export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'activas', label: 'Activas' },
  { key: 'pendientes', label: 'Cambios sin publicar' },
  { key: 'published', label: 'Publicadas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'archived', label: 'Archivadas' },
];

export function cumpleFiltro(f: FarmaciaSummary, filtro: StatusFilter): boolean {
  if (filtro === 'activas') return f.status !== 'archived';
  if (filtro === 'pendientes') return f.status === 'published' && estadoFila(f).label === 'Cambios sin publicar';
  return f.status === filtro;
}

export type StatusCounts = Record<StatusFilter, number>;
