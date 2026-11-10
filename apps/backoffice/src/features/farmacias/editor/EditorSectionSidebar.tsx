'use client';

/**
 * Sidebar izquierdo (desktop ≥ 900px) con las 9 secciones agrupadas.
 * Reemplaza el doble patrón EditorFloatingNav (4 grupos) + EditorGroupSegmented
 * (sub-secciones): ahora las 9 están siempre visibles en una sola columna.
 *
 * Estado por sección (dot a la derecha):
 *   - 'edit' (naranja acento): sección activa
 *   - 'warn' (amarillo): hay traducciones faltantes en algún idioma
 *   - 'ok'   (verde): completa
 */

import { useFarmaciaEditor } from './EditorContext';
import { countBySection, type SectionKey } from './i18nStatus';
import { GROUPS, SECTION_BY_KEY } from './sections-config';
import { cn } from '@/lib/utils';

export function EditorSectionSidebar({
  activeKey,
  onSelect,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const { farmacia } = useFarmaciaEditor();
  const perSection = countBySection(farmacia);
  const missingByKey: Record<string, boolean> = perSection.reduce(
    (acc, s) => {
      const anyMissing = Object.values(s.byLocale).some((c) => c.missing > 0);
      acc[s.key] = anyMissing;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  return (
    <aside
      aria-label="Secciones de la farmacia"
      className="sticky top-[calc(3.5rem+56px)] self-start bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[12px] p-[10px_8px] max-h-[calc(100vh-10rem)] overflow-y-auto"
    >
      {GROUPS.map((group) => (
        <div key={group.key} className="px-[4px] pb-[4px]">
          <div className="px-[10px] pt-[10px] pb-[6px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            {group.label}
          </div>
          {group.sectionKeys.map((key) => {
            const s = SECTION_BY_KEY[key];
            const isActive = key === activeKey;
            const status = isActive
              ? 'edit'
              : s.multilang && missingByKey[key as SectionKey]
                ? 'warn'
                : 'ok';
            const dotCls =
              status === 'edit'
                ? 'bg-[var(--color-accent)]'
                : status === 'warn'
                  ? 'bg-[var(--color-yellow-ink)]'
                  : 'bg-[var(--color-green-ink)]';

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                aria-current={isActive ? 'true' : 'false'}
                className={cn(
                  'relative w-full text-left flex items-center gap-[9px] px-[10px] py-[9px] rounded-[8px] text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-ink)] font-semibold before:content-[""] before:absolute before:left-[-5px] before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[16px] before:rounded-[2px] before:bg-[var(--color-accent)]'
                    : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]',
                )}
              >
                <span className="flex-1 min-w-0 truncate">{s.label}</span>
                <span
                  aria-hidden
                  className={cn(
                    'w-[7px] h-[7px] rounded-full shrink-0 ml-auto',
                    dotCls,
                  )}
                />
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
