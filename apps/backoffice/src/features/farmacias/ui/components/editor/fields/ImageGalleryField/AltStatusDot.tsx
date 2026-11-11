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

const ALT_STATUS_COPY: Record<AltStatus, { label: string; title: string }> = {
  complete: { label: 'Texto alternativo completo', title: 'Alt rellenado en todos los idiomas' },
  partial: { label: 'Texto alternativo incompleto', title: 'Alt incompleto — faltan idiomas' },
  empty: { label: 'Sin texto alternativo', title: 'Sin texto alternativo' },
};

export function AltStatusDot({ status }: { status: AltStatus }) {
  return (
    <span
      aria-label={ALT_STATUS_COPY[status].label}
      title={ALT_STATUS_COPY[status].title}
      className={cn(
        'absolute top-1.5 left-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white/90 shadow-sm',
        status === 'complete' && 'bg-[var(--color-green-ink)]',
        status === 'partial' && 'bg-[var(--color-accent)]',
        status === 'empty' && 'bg-white/70',
      )}
    />
  );
}
