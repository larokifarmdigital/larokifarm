'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { countBySection, type SectionKey } from '@/features/farmacias/ui/lib/i18nStatus';
import { gruposVisibles, SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';
import { cn } from '@/shared/lib/cn';

export function EditorSectionSidebar({
  activeKey,
  onSelect,
}: {
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const { farmacia, esAdmin } = useFarmaciaEditor();
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
      className="sticky top-[56px] lg:top-[calc(3.5rem+56px)] self-start bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[12px] p-[10px_8px] max-h-[calc(100vh-10rem)] overflow-y-auto"
    >
      {gruposVisibles(esAdmin).map((group) => (
        <div key={group.key} className="px-[4px] pb-[4px]">
          <div className="px-[10px] pt-[10px] pb-[6px] text-[12px] font-semibold text-[var(--color-muted)]">
            {group.label}
          </div>
          {group.sectionKeys.map((key) => {
            const s = SECTION_BY_KEY[key];
            const isActive = key === activeKey;
            const pendiente = s.multilang && missingByKey[key as SectionKey];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'relative w-full text-left flex items-center gap-[9px] px-[10px] py-[9px] rounded-[8px] text-[13.5px] font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-ink)] font-semibold before:content-[""] before:absolute before:left-[-5px] before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[16px] before:rounded-[2px] before:bg-[var(--color-accent)]'
                    : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]',
                )}
              >
                <span className="flex-1 min-w-0 truncate">{s.label}</span>
                {pendiente && (
                  <>
                    <span aria-hidden title="Falta traducir" className="w-[7px] h-[7px] rounded-full shrink-0 ml-auto bg-[var(--color-red-ink)]" />
                    <span className="sr-only">(falta traducir)</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
