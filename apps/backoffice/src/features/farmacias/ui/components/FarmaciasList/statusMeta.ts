import type { FarmaciaStatus } from '@/core/farmacias/domain';

export const STATUS_META: Record<FarmaciaStatus, { label: string; tone: 'green' | 'yellow' | 'neutral' }> = {
  published: { label: 'Publicada', tone: 'green' },
  draft: { label: 'Borrador', tone: 'yellow' },
  archived: { label: 'Archivada', tone: 'neutral' },
};

export type StatusFilter = 'todos' | FarmaciaStatus;

export const STATUS_FILTERS: StatusFilter[] = ['todos', 'published', 'draft', 'archived'];

export type StatusCounts = Record<StatusFilter, number>;
