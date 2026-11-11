'use client';

/**
 * Picker sticky móvil (< 900px). Reemplaza el EditorFloatingNav + EditorGroupSegmented
 * en móvil. Muestra la sección actual (grupo + nombre + contador N/9) y al tocarlo
 * abre un bottom sheet con las 9 secciones agrupadas (ver EditorSectionSheet).
 */

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { SECTION_BY_KEY, SECTION_META, SECTION_INDEX, GROUP_OF_SECTION } from '@/features/farmacias/ui/lib/sectionsConfig';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

export function EditorSectionPicker({
  activeKey,
  isOpen,
  onToggle,
}: {
  activeKey: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { farmacia: _ } = useFarmaciaEditor(); // consume provider (safety)
  void _;
  const section = SECTION_BY_KEY[activeKey] ?? SECTION_META[0];
  const group = GROUP_OF_SECTION[section.key];
  const idx = SECTION_INDEX[section.key] + 1;
  const total = SECTION_META.length;

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label="Cambiar de sección"
      onClick={onToggle}
      className="sticky top-[calc(3.5rem+56px)] z-[4] flex w-full items-center gap-[10px] px-[14px] py-[11px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors mb-[16px] hover:border-[var(--color-hairline-strong)] active:border-[var(--color-accent)]"
    >
      <span
        aria-hidden
        className="w-[28px] h-[28px] rounded-[7px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] grid place-items-center font-mono-tabular font-bold text-[12px] shrink-0"
      >
        {String(idx).padStart(2, '0')}
      </span>
      <span className="flex-1 min-w-0 flex flex-col leading-[1] text-left">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
          {group.label}
        </span>
        <span className="mt-[3px] text-[14.5px] font-semibold text-[var(--color-ink)] leading-[1.1] truncate">
          {section.label}
        </span>
      </span>
      <span className="font-mono-tabular text-[10.5px] text-[var(--color-muted)] shrink-0 tracking-[0.03em]">
        {idx}/{total}
      </span>
      <span
        aria-hidden
        className="text-[var(--color-muted)] shrink-0 transition-transform duration-150"
        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        <NavIcon name="CaretRight" size={14} className="rotate-90" />
      </span>
    </button>
  );
}
