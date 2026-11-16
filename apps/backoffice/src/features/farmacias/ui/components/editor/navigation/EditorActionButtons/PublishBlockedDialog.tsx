'use client';

import type { FieldIssue } from '@/core/farmacias/domain';
import { SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal } from '@/shared/components/molecules/Modal';

/**
 * Publicar BLOQUEADO: faltan obligatorios o hay campos con formato inválido.
 * A diferencia de las traducciones (que solo se confirman), esto rompería la
 * landing: teléfono que no llama, email que no llega, mapa que no carga…
 * Cada fila lleva a su sección y pone el foco en el campo.
 */
export function PublishBlockedDialog({
  open,
  onOpenChange,
  issues,
  onReview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: FieldIssue[];
  onReview: (issue: FieldIssue) => void;
}) {
  const n = issues.length;
  const bySection = Object.entries(
    issues.reduce<Record<string, FieldIssue[]>>((acc, i) => {
      (acc[i.sectionKey] ??= []).push(i);
      return acc;
    }, {}),
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={n === 1 ? 'Corrige 1 campo antes de publicar' : `Corrige ${n} campos antes de publicar`}
      description="El borrador está guardado. Cuando estos campos estén bien podrás publicar."
      maxWidth="sm"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="md" onClick={() => onOpenChange(false)} className="w-full justify-center sm:w-auto">
            Cerrar
          </Button>
          <Button variant="accent" size="md" onClick={() => issues[0] && onReview(issues[0])} className="w-full justify-center sm:w-auto">
            Revisar el primero
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {bySection.map(([sectionKey, list]) => (
          <section key={sectionKey}>
            <h3 className="m-0 mb-1 text-[11px] font-mono-tabular uppercase tracking-[0.08em] text-[var(--color-muted-2)]">
              {SECTION_BY_KEY[sectionKey]?.label ?? sectionKey}
            </h3>
            <ul className="m-0 p-0 list-none divide-y divide-[var(--color-hairline)]">
              {list.map((issue) => (
                <li key={issue.field}>
                  <button
                    type="button"
                    onClick={() => onReview(issue)}
                    className="group flex w-full items-start gap-2 py-2 text-left rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">{issue.label}</span>
                      <span className="block text-[12px] text-[var(--color-red-ink)]">{issue.message}</span>
                    </span>
                    <NavIcon
                      name="CaretRight"
                      size={12}
                      className="mt-1 text-[var(--color-muted-2)] group-hover:text-[var(--color-ink)] transition-colors"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
