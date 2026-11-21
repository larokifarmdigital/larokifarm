'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { useRef, type ReactNode } from 'react';

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  /**
   * Solo consulta: los campos se muestran desactivados (se pueden leer) y el
   * pie es solo "Cerrar". El portal queda fuera del fieldset del editor.
   */
  soloLectura?: boolean;
};

const MAX_WIDTHS = {
  sm: 'max-w-[440px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  soloLectura = false,
}: ModalProps) {
  // Sin Dialog.Trigger, Radix no sabe a dónde devolver el foco al cerrar:
  // guardamos quién lo tenía al abrir y se lo devolvemos (si sigue en el DOM).
  const previo = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--color-ink)]/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            let el = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            // Abierto desde un menú (⋯): el elemento del menú desaparece, así que
            // el foco vuelve al botón que abrió el menú (Radix lo enlaza con aria-labelledby).
            const menu = el?.closest('[role="menu"]');
            const disparador = menu?.getAttribute('aria-labelledby');
            if (disparador) el = document.getElementById(disparador) ?? el;
            previo.current = el;
            // En formularios, el foco empieza en el primer campo (no en "Cerrar").
            const campo = Array.from(
              (e.currentTarget as HTMLElement | null)?.querySelectorAll<HTMLElement>(
                'input:not([type=hidden]):not([type=file]), textarea, select, button[role="combobox"]',
              ) ?? [],
            ).find((el) => el.matches(':enabled'));
            if (campo) {
              e.preventDefault();
              campo.focus();
            }
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const el = previo.current;
            el?.focus();
            // Tras el render: si el disparador desapareció ("Añade tu primer…", el
            // Eliminar de la fila borrada), a la fila recién añadida o al título
            // de la sección; nunca a <body>.
            requestAnimationFrame(() => {
              // (si se abrió sin disparador, p. ej. desde la URL, el previo es <body>: no vale)
            if (el?.isConnected && el !== document.body && document.activeElement === el) return;
              const destino =
                document.querySelector<HTMLElement>('[data-foco-tras-modal]') ??
                document.querySelector<HTMLElement>('[data-titulo-seccion]');
              destino?.focus();
            });
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-24px)] max-h-[calc(100dvh-48px)] flex flex-col',
            'bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-lg)]',
            'shadow-[var(--shadow-elevated)] outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-200',
            MAX_WIDTHS[maxWidth],
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--color-hairline)]">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold text-[var(--color-ink)] tracking-[-0.015em] m-0">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-[12.5px] text-[var(--color-muted)] leading-[1.5]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="shrink-0 flex h-11 w-11 sm:h-7 sm:w-7 -mr-2 sm:mr-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
            >
              <NavIcon name="X" size={14} />
            </Dialog.Close>
          </div>

          <div
            // Solo lectura: los campos van desactivados, así que el cuerpo tiene que poder
            // enfocarse para desplazarlo con el teclado.
            {...(soloLectura ? { tabIndex: 0, role: 'region', 'aria-label': `Contenido: ${title}` } : {})}
            className="flex-1 overflow-y-auto px-5 py-4"
          >
            {soloLectura ? (
              <fieldset disabled className="m-0 min-w-0 border-0 p-0">
                <p className="m-0 mb-4 rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2 text-[13.5px] text-[var(--color-ink-2)]">
                  Solo consulta: puedes leerlo, pero no cambiarlo.
                </p>
                {children}
              </fieldset>
            ) : (
              children
            )}
          </div>

          {soloLectura ? (
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
              <Dialog.Close className="inline-flex min-h-11 sm:min-h-9 items-center justify-center px-4 rounded-[8px] border border-[var(--color-control-border)] bg-[var(--color-surface)] text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]">
                Cerrar
              </Dialog.Close>
            </div>
          ) : footer && (
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Pie estándar de los modales de crear/editar: "Cancelar" (secondary) y la
 * acción principal (accent, sin icono, siempre activa: valida al enviar y lleva
 * el foco al primer error). En fila también en móvil (mitad y mitad).
 */
export function ModalAcciones({
  onCancelar,
  textoPrincipal,
  textoEnviando,
  enviando = false,
  form,
  onPrincipal,
}: {
  onCancelar: () => void;
  textoPrincipal: string;
  /** Texto mientras se envía, p. ej. "Creando…". */
  textoEnviando?: string;
  enviando?: boolean;
  /** id del <form> (el botón es type=submit de ese formulario). */
  form?: string;
  onPrincipal?: () => void;
}) {
  return (
    <div className="flex w-full gap-2 sm:justify-end">
      <Button type="button" variant="secondary" onClick={onCancelar} disabled={enviando} className="flex-1 sm:flex-none">
        Cancelar
      </Button>
      <Button
        type={form ? 'submit' : 'button'}
        form={form}
        variant="accent"
        disabled={enviando}
        onClick={onPrincipal}
        className="flex-1 sm:flex-none"
      >
        {enviando && textoEnviando ? textoEnviando : textoPrincipal}
      </Button>
    </div>
  );
}
