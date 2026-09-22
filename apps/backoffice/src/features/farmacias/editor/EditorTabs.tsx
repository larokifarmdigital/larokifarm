'use client';

import { useEffect, useRef } from 'react';
import { NavIcon, type IconName } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';

export const EDITOR_TABS = [
  { key: 'general', label: 'General', icon: 'Storefront' as IconName, hint: 'Identidad, contacto, dirección y horarios' },
  { key: 'contenido', label: 'Contenido', icon: 'PencilSimple' as IconName, hint: 'Descripciones e imágenes de portada' },
  { key: 'servicios', label: 'Servicios', icon: 'Check' as IconName, hint: 'Qué ofreces' },
  { key: 'faqs', label: 'FAQs', icon: 'QuestionMark' as IconName, hint: 'Preguntas frecuentes' },
  { key: 'resenas', label: 'Reseñas', icon: 'ChatCircleText' as IconName, hint: 'Opiniones de clientes' },
  { key: 'seo', label: 'SEO', icon: 'Globe' as IconName, hint: 'Cómo apareces en Google' },
] as const;

export type EditorTabKey = (typeof EDITOR_TABS)[number]['key'];

export function EditorTabs({
  activeKey,
  onSelect,
}: {
  activeKey: EditorTabKey;
  onSelect: (k: EditorTabKey) => void;
}) {
  const activeChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeKey]);

  return (
    <nav aria-label="Secciones del editor">
      {/* Móvil / tablet: barra horizontal scrollable */}
      <div className="lg:hidden -mx-3 sm:-mx-6">
        <div className="flex items-center gap-1 overflow-x-auto px-3 sm:px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EDITOR_TABS.map((t) => {
            const active = t.key === activeKey;
            return (
              <button
                key={t.key}
                ref={active ? activeChipRef : undefined}
                type="button"
                onClick={() => onSelect(t.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] transition-colors',
                  active
                    ? 'bg-[var(--color-ink)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-ink-2)] border border-[var(--color-hairline)] hover:bg-[var(--color-surface-sunken)]',
                )}
              >
                <NavIcon
                  name={t.icon}
                  size={13}
                  weight={active ? 'fill' : 'regular'}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: sidebar vertical con hint */}
      <ul className="hidden lg:block space-y-0.5">
        {EDITOR_TABS.map((t) => {
          const active = t.key === activeKey;
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onSelect(t.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[6px] transition-colors text-left',
                  active
                    ? 'bg-[var(--color-surface)] shadow-[var(--shadow-hairline)]'
                    : 'hover:bg-[var(--color-surface)]',
                )}
              >
                <NavIcon
                  name={t.icon}
                  size={14}
                  weight={active ? 'fill' : 'regular'}
                  className={cn(
                    'mt-0.5 shrink-0',
                    active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]',
                  )}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-[13.5px] leading-tight',
                      active
                        ? 'text-[var(--color-ink)] font-medium'
                        : 'text-[var(--color-ink-2)]',
                    )}
                  >
                    {t.label}
                  </span>
                  <span className="block text-[11.5px] text-[var(--color-muted-2)] mt-0.5 leading-[1.35]">
                    {t.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
