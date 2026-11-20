import Image from 'next/image';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { cn } from '@/shared/lib/cn';

/** Pide al servidor una miniatura (×2 para pantallas retina) en vez del
 *  original: el logo de Torrents mide 2815px y tardaba en pintarse a 36px. */
function miniatura(url: string, size: number): string {
  if (!url.includes('/api/content-images/')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}w=${size * 2}&auto=format`;
}

/** Logo de la farmacia o su inicial si no tiene. */
export function FarmaciaAvatar({
  farmacia,
  size,
}: {
  farmacia: Pick<FarmaciaSummary, 'logo' | 'nombre'>;
  size: 36 | 40;
}) {
  return (
    <span
      className={cn(
        'relative shrink-0 rounded-[6px] overflow-hidden bg-[var(--color-surface-sunken)] border border-[var(--color-hairline)]',
        size === 40 ? 'h-10 w-10' : 'h-9 w-9',
      )}
    >
      {farmacia.logo ? (
        <Image src={miniatura(farmacia.logo.url, size)} alt="" width={size} height={size} className="object-cover" unoptimized />
      ) : (
        <span
          className={cn(
            'absolute inset-0 grid place-items-center font-semibold text-[var(--color-muted-2)]',
            size === 40 ? 'text-[15px]' : 'text-[13px]',
          )}
        >
          {farmacia.nombre[0]}
        </span>
      )}
    </span>
  );
}
