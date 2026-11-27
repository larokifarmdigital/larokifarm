'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { MarcasSeccion, useEstadoSecciones } from '@/features/farmacias/ui/hooks/useEstadoSecciones';
import { gruposVisibles, SECTION_BY_KEY, SECTION_META } from '@/features/farmacias/ui/lib/sectionsConfig';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/**
 * Selector de sección donde no cabe el menú lateral (móvil, y lg–xl con la
 * vista previa abierta): un botón con la sección abierta que despliega la
 * lista agrupada justo debajo. Dos toques para cambiar, sin hoja a pantalla.
 */
export function EditorSectionPicker({ activeKey, onSelect }: { activeKey: string; onSelect: (key: string) => void }) {
  const { esAdmin } = useFarmaciaEditor();
  const estadoDe = useEstadoSecciones();
  const section = SECTION_BY_KEY[activeKey] ?? SECTION_META[0];

  return (
    // Sin modal: no oculta el resto de la página a los lectores (es navegación, no un diálogo).
    // Sin portal: el menú queda dentro del contenido principal (landmark).
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Sección: ${section.label}. Cambiar de sección`}
        className="mb-3 flex min-h-12 w-full items-center gap-3 rounded-[10px] border border-[var(--color-control-border)] bg-[var(--color-surface)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-2)] data-[state=open]:border-[var(--color-accent)]"
      >
        <NavIcon name={section.icon} size={18} className="shrink-0 text-[var(--color-accent)]" />
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-semibold text-[var(--color-ink)]">{section.label}</span>
        <MarcasSeccion estado={estadoDe(section.key)} />
        <NavIcon name="CaretDown" size={14} className="shrink-0 text-[var(--color-muted)]" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        // En móvil la lista no cabe y hace scroll: enfocable para poder desplazarla con el teclado.
        tabIndex={0}
        align="start"
        sideOffset={4}
        collisionPadding={12}
        className="z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-elevated)] outline-none"
      >
        <DropdownMenu.RadioGroup value={section.key} onValueChange={onSelect}>
          {gruposVisibles(esAdmin).map((group, i) => (
            <DropdownMenu.Group key={group.key}>
              {i > 0 && <DropdownMenu.Separator className="mx-1 my-1 h-px bg-[var(--color-hairline)]" />}
              <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-[12px] font-semibold text-[var(--color-muted)]">
                {group.label}
              </DropdownMenu.Label>
              {group.sectionKeys.map((key) => {
                const s = SECTION_BY_KEY[key];
                const activa = key === section.key;
                return (
                  <DropdownMenu.RadioItem
                    key={key}
                    value={key}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 text-[14.5px] outline-none data-[highlighted]:bg-[var(--color-surface-2)]',
                      activa ? 'bg-[var(--color-accent-soft)] font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]',
                    )}
                  >
                    <NavIcon
                      name={s.icon}
                      size={16}
                      className={activa ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    <MarcasSeccion estado={estadoDe(key)} />
                  </DropdownMenu.RadioItem>
                );
              })}
            </DropdownMenu.Group>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
