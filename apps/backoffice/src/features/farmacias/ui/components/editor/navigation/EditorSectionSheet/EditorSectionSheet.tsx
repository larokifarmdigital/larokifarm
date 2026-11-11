'use client';

/**
 * Bottom sheet compacto que se abre desde EditorSectionPicker (móvil).
 * Altura auto hasta ~540px, sin cabecera voluminosa, items densos sin texto redundante
 * (el estado se comunica con un dot de color).
 */

import { useEffect, useRef } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { countBySection, type SectionKey } from '@/features/farmacias/ui/lib/i18nStatus';
import { GROUPS, SECTION_BY_KEY, SECTION_INDEX } from '@/features/farmacias/ui/lib/sectionsConfig';
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
  const { farmacia } = useFarmaciaEditor();
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
        // tap fuera del contenido cierra
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="flex items-center justify-between gap-[10px] px-[18px] py-[12px] border-b border-[var(--color-hairline)]">
        <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--color-muted)]">
          Secciones
        </span>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => ref.current?.close()}
          className="w-[28px] h-[28px] grid place-items-center rounded-[6px] text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)] transition-colors"
        >
          <NavIcon name="X" size={14} />
        </button>
      </div>
      <div className="py-[6px] px-[8px] overflow-y-auto" style={{ maxHeight: 'calc(min(70vh, 540px) - 48px)' }}>
        {GROUPS.map((group) => (
          <div key={group.key}>
            <div className="px-[12px] pt-[10px] pb-[4px] text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--color-muted)]">
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
              const idx = SECTION_INDEX[key] + 1;
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
                    'w-full flex items-center gap-[10px] px-[12px] py-[10px] rounded-[8px] text-left transition-colors',
                    isActive
                      ? 'bg-[var(--color-accent-soft)]'
                      : 'hover:bg-[var(--color-surface-sunken)]',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono-tabular text-[10.5px] font-semibold min-w-[16px]',
                      isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]',
                    )}
                  >
                    {String(idx).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-[13.5px]',
                      isActive
                        ? 'font-bold text-[var(--color-accent)]'
                        : 'font-medium text-[var(--color-ink)]',
                    )}
                  >
                    {s.label}
                  </span>
                  <span aria-hidden className={cn('w-[7px] h-[7px] rounded-full shrink-0', dotCls)} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </dialog>
  );
}
