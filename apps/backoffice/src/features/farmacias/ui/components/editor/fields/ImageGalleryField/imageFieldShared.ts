import type { ContentImageRole, ImagenAsset } from '@/core/farmacias/domain';
import type { Locale } from '@/core/shared';

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif';

export const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  ca: '🇦🇩',
};

type BaseProps = {
  businessId: string;
  role: ContentImageRole;
  label?: string;
  hint?: string;
  className?: string;
};

export type MultiProps = BaseProps & {
  mode?: 'multi';
  value: ImagenAsset[];
  onChange: (next: ImagenAsset[]) => void;
  idiomasActivos: Locale[];
  max?: number;
};

export type SingleProps = BaseProps & {
  mode: 'single';
  value: ImagenAsset | null | undefined;
  onChange: (next: ImagenAsset | null) => void;
  /** Aspecto del preview. Default square. */
  aspect?: 'square' | 'og' | 'auto';
};
