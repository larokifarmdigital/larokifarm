'use client';

/**
 * Selector de sección en móvil (< lg). Muestra "Grupo · Sección" (sin
 * numeración, decisión 2) y abre la hoja con todas las secciones.
 */

import { SECTION_BY_KEY, SECTION_META, GROUP_OF_SECTION } from '@/features/farmacias/ui/lib/sectionsConfig';
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
  const section = SECTION_BY_KEY[activeKey] ?? SECTION_META[0];
  const group = GROUP_OF_SECTION[section.key];

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={onToggle}
      className="flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-control-border)] rounded-[10px] transition-colors mb-3 hover:bg-[var(--color-surface-2)]"
    >
      <span
        aria-hidden
        className="w-8 h-8 rounded-[8px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] grid place-items-center shrink-0"
      >
        <NavIcon name={section.icon} size={17} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[12.5px] text-[var(--color-muted)]">{group.label}</span>
        <span className="block text-[16px] font-semibold text-[var(--color-ink)] leading-tight truncate">
          {section.label}
        </span>
      </span>
      <span className="shrink-0 text-[13px] font-medium text-[var(--color-accent)]">Cambiar</span>
      <span className="sr-only">de sección</span>
    </button>
  );
}
