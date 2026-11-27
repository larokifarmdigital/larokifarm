import type { ImagenAsset } from '@/core/farmacias/domain';
import type { Locale } from '@/core/shared';
import { cn } from '@/shared/lib/cn';

type AltStatus = 'complete' | 'partial' | 'empty';

export function getAltStatus(img: ImagenAsset, activeLocales: Locale[]): AltStatus {
  const filled = activeLocales.filter((l) => !!img.alt?.[l]?.trim()).length;
  if (filled === 0) return 'empty';
  if (filled === activeLocales.length) return 'complete';
  return 'partial';
}

const ALT_STATUS_COPY: Record<AltStatus, string> = {
  complete: 'Descripción completa',
  partial: 'Falta descripción en algún idioma',
  empty: 'Falta descripción',
};

/** Estado del texto alternativo de una foto, en texto (un punto con aria-label en un <span> sin rol lo marca axe). Solo se muestra si falta algo. */
export function AltStatusDot({ status }: { status: AltStatus }) {
  if (status === 'complete') return <span className="sr-only">{ALT_STATUS_COPY.complete}</span>;
  return (
    <span
      className={cn(
        'absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11.5px] font-medium shadow-sm',
        'text-[var(--color-yellow-ink)]',
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-yellow-ink)]" />
      {ALT_STATUS_COPY[status]}
    </span>
  );
}
