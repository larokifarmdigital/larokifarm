import type { Locale } from '@/types/content';
import type { LocaleStatus } from './i18nStatus';

const FLAG: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  ca: '🇦🇩',
};

const CODE: Record<Locale, string> = {
  es: 'ES',
  en: 'EN',
  ca: 'CA',
};

const STATUS_CLASS: Record<LocaleStatus, string> = {
  filled: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]',
  missing: 'bg-[var(--color-red-soft)] text-[var(--color-red-ink)]',
  empty: 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]',
};

/**
 * Chip que indica el estado i18n de un campo para el idioma activo.
 *
 * - `filled`  → naranja soft: el campo tiene contenido.
 * - `missing` → rojo: falta en este idioma pero está lleno en otro activo (inconsistente).
 * - `empty`   → gris: vacío en todos los idiomas activos (opcional aún).
 *
 * Acepta `filled` como fallback legacy: `filled=true` → 'filled', `false` → 'empty'.
 */
export function LocaleChip({
  locale,
  status,
  filled,
}: {
  locale: Locale;
  status?: LocaleStatus;
  /** Compat con el uso antiguo. Ignorado si se pasa `status`. */
  filled?: boolean;
}) {
  const s: LocaleStatus = status ?? (filled ? 'filled' : 'empty');
  const title =
    s === 'filled'
      ? `Rellenado en ${CODE[locale]}.`
      : s === 'missing'
        ? `Falta en ${CODE[locale]} — está rellenado en otro idioma activo.`
        : `Vacío en todos los idiomas activos.`;
  return (
    <span
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider font-mono-tabular ${STATUS_CLASS[s]}`}
      title={title}
      aria-hidden
    >
      <span className="text-[12px] leading-none">{FLAG[locale]}</span>
      {CODE[locale]}
      {s === 'missing' && <span className="text-[8px] leading-none">●</span>}
    </span>
  );
}
