'use client';

/** Hoja inferior con todas las secciones (móvil). */

import { useEffect, useRef } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { countBySection, type SectionKey } from '@/features/farmacias/ui/lib/i18nStatus';
import { gruposVisibles, SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

export function EditorSectionSheet({
  open,
  activeKey,
  onClose,
  onSelect,
}: {
  open: boolean;
  activeKey: string;
  onClose: () => void;
  onSelect: (key: string) => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const { farmacia, esAdmin } = useFarmaciaEditor();
  const perSection = countBySection(farmacia);
  const missingByKey: Record<string, boolean> = perSection.reduce(
    (acc, s) => {
      acc[s.key] = Object.values(s.byLocale).some((c) => c.missing > 0);
      return acc;
    },
    {} as Record<string, boolean>,
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const handleClose = () => onClose();
    d.addEventListener('close', handleClose);
    return () => d.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label="Lista de secciones"
      className="editor-section-sheet"
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="flex items-center justify-between gap-[10px] px-[18px] py-[12px] border-b border-[var(--color-hairline)]">
        <span className="text-[15px] font-semibold text-[var(--color-ink)]">
          Secciones de tu web
        </span>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => ref.current?.close()}
          className="w-11 h-11 grid place-items-center rounded-[6px] text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)] transition-colors"
        >
          <NavIcon name="X" size={14} />
        </button>
      </div>
      <div className="py-[6px] px-[8px] overflow-y-auto" style={{ maxHeight: 'calc(min(70vh, 540px) - 48px)' }}>
        {gruposVisibles(esAdmin).map((group) => (
          <div key={group.key}>
            <div className="px-[12px] pt-[12px] pb-[4px] text-[12.5px] font-semibold text-[var(--color-muted)]">
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
                    'w-full min-h-12 flex items-center gap-3 px-3 py-2 rounded-[8px] text-left transition-colors',
                    isActive ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-surface-sunken)]',
                  )}
                >
                  <NavIcon name={s.icon} size={17} className={isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'} />
                  <span
                    className={cn(
                      'flex-1 text-[15px]',
                      isActive ? 'font-semibold text-[var(--color-accent-ink)]' : 'font-medium text-[var(--color-ink)]',
                    )}
                  >
                    {s.label}
                  </span>
                  {pendiente && (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-red-ink)]">
                      <span aria-hidden className="w-[7px] h-[7px] rounded-full bg-[var(--color-red-ink)]" />
                      Falta traducir
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </dialog>
  );
}
