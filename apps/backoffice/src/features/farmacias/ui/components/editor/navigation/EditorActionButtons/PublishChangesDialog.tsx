'use client';

import { toast } from 'sonner';
import type { CambioSinPublicar, Farmacia } from '@/core/farmacias/domain';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';

/**
 * «Qué vas a publicar»: los cambios respecto a lo publicado, por sección, con
 * «Deshacer» en cada uno. Deshacer vuelve a lo publicado y se guarda solo; el
 * aviso ofrece recuperar lo que había (por si se pulsa sin querer).
 */
export function PublishChangesDialog({
  open,
  onOpenChange,
  publishing,
  onPublish,
  faltanTraducciones,
  onRevisarTraducciones,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishing: boolean;
  onPublish: () => void;
  faltanTraducciones: number;
  onRevisarTraducciones: () => void;
}) {
  const { farmacia, cambios, deshacerCambio, patch, goToSection, readOnly } = useFarmaciaEditor();
  const lista = cambios ?? [];
  const porSeccion = agrupar(lista);

  const deshacer = (c: CambioSinPublicar) => {
    const antes = { [c.campo]: (farmacia as Record<string, unknown>)[c.campo] ?? null } as Partial<Farmacia>;
    deshacerCambio(c);
    toast(`«${c.etiqueta}» vuelve a estar como en tu web.`, {
      action: { label: 'Recuperar mi cambio', onClick: () => patch(antes) },
    });
  };

  const ir = (seccion: string) => {
    onOpenChange(false);
    goToSection(seccion);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !publishing && onOpenChange(o)}
      title="Qué vas a publicar"
      description={
        lista.length
          ? 'Esto cambiará en tu web. Puedes deshacer lo que no quieras publicar.'
          : 'No hay cambios de contenido: se publicará la web tal como está.'
      }
      maxWidth="md"
      footer={
        <ModalAcciones
          onCancelar={() => onOpenChange(false)}
          textoPrincipal={farmacia.status === 'published' ? 'Publicar cambios' : 'Publicar'}
          textoEnviando="Publicando…"
          enviando={publishing}
          onPrincipal={onPublish}
        />
      }
    >
      <div className="space-y-4">
        {porSeccion.map(([seccion, items]) => (
          <section key={seccion} aria-labelledby={`cambios-${seccion}`}>
            <h3 id={`cambios-${seccion}`} className="m-0 mb-1.5 text-[12.5px] font-semibold text-[var(--color-muted)]">
              {SECTION_BY_KEY[seccion]?.label ?? seccion}
            </h3>
            <ul className="m-0 list-none divide-y divide-[var(--color-hairline)] rounded-[10px] border border-[var(--color-hairline)] p-0">
              {items.map((c) => (
                <li key={c.campo} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-yellow-ink)]" />
                  <button
                    type="button"
                    onClick={() => ir(c.seccion)}
                    className="min-h-11 min-w-0 flex-1 text-left text-[14px] text-[var(--color-ink)] underline-offset-2 hover:underline sm:min-h-8"
                  >
                    {c.etiqueta}
                    {c.detalle && <span className="text-[var(--color-muted)]"> · {c.detalle}</span>}
                  </button>
                  {c.deshacer && !readOnly ? (
                    <button
                      type="button"
                      onClick={() => deshacer(c)}
                      aria-label={`Deshacer el cambio en «${c.etiqueta}»`}
                      title="Deshacer: volver a lo publicado"
                      className="flex h-11 shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] sm:h-8"
                    >
                      <NavIcon name="ArrowCounterClockwise" size={14} />
                      Deshacer
                    </button>
                  ) : (
                    <span className="shrink-0 px-2.5 text-[12.5px] text-[var(--color-muted)]">Cámbialo en su sección</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {faltanTraducciones > 0 && (
          <div className="flex items-start gap-2 rounded-[10px] bg-[var(--color-yellow-soft)] px-3 py-2.5 text-[13.5px] text-[var(--color-ink)]">
            <NavIcon name="Translate" size={16} className="mt-0.5 shrink-0" />
            <p className="m-0 flex-1">
              {faltanTraducciones === 1 ? 'Falta 1 traducción' : `Faltan ${faltanTraducciones} traducciones`}: en esos
              idiomas se verá el texto en castellano.{' '}
              <button
                type="button"
                onClick={onRevisarTraducciones}
                className="font-semibold text-[var(--color-accent-ink)] underline underline-offset-2"
              >
                Revisar
              </button>
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function agrupar(lista: CambioSinPublicar[]): [string, CambioSinPublicar[]][] {
  const m = new Map<string, CambioSinPublicar[]>();
  for (const c of lista) m.set(c.seccion, [...(m.get(c.seccion) ?? []), c]);
  return [...m];
}
