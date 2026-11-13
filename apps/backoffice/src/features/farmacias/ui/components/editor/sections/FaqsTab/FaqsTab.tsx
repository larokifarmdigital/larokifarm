'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { TextosCabeceraFields } from '@/features/farmacias/ui/components/editor/fields/TextosCabeceraFields';
import { Button } from '@/shared/components/atoms/Button';
import { Modal } from '@/shared/components/molecules/Modal';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { Faq } from '@/core/farmacias/domain';
import type { Locale } from '@/core/shared';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function crearFaqVacia(orden: number): Faq {
  return {
    id: `faq_${Math.random().toString(36).slice(2, 10)}`,
    pregunta: {},
    respuesta: {},
    orden,
  };
}

/**
 * Fila compacta read-only. Mostrar + gestionar (editar/eliminar/reordenar).
 * El contenido NO se edita in-place: click en editar abre el modal.
 */
function FaqRow({
  faq,
  activeLocales,
  onEdit,
  onRemove,
}: {
  faq: Faq;
  activeLocales: Locale[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: faq.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const pregunta = faq.pregunta.es || faq.pregunta.ca || faq.pregunta.en || '';
  const preview = pregunta.trim() || 'Pregunta sin título';
  const missingLocales = activeLocales.filter(
    (l) => !(faq.pregunta[l]?.trim() && faq.respuesta[l]?.trim()),
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-[var(--radius-sm)] border border-transparent bg-[var(--color-surface)]',
        'hover:border-[var(--color-hairline)] transition-all',
        isDragging && 'border-[var(--color-hairline-strong)] shadow-[var(--shadow-elevated)]',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar pregunta"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted-2)] hover:text-[var(--color-ink-2)] cursor-grab active:cursor-grabbing"
      >
        <NavIcon name="DotsSixVertical" size={14} weight="bold" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 flex items-center gap-3 text-left"
      >
        <span className="shrink-0 h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] flex items-center justify-center text-[var(--color-accent-ink)]">
          <NavIcon name="Question" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-[13.5px] font-medium truncate leading-tight',
              pregunta.trim()
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-muted-2)] italic',
            )}
          >
            {preview}
          </span>
          {missingLocales.length > 0 && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--color-yellow-ink)]">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-yellow-ink)]"
              />
              Falta {missingLocales.map((l) => l.toUpperCase()).join(', ')}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar pregunta"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
      >
        <NavIcon name="PencilSimple" size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar pregunta"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)]"
      >
        <NavIcon name="Trash" size={13} />
      </button>
    </li>
  );
}

function FaqModal({
  open,
  initial,
  mode,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Faq | null;
  mode: 'create' | 'edit';
  onSave: (f: Faq) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Faq | null>(initial);

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === 'create' ? 'Nueva pregunta frecuente' : 'Editar pregunta'}
      description="Aparecen como bloque FAQ en la landing y se publican como FAQ schema en Google."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!Object.values(draft.pregunta ?? {}).some((v) => (v ?? '').trim())}
            title={Object.values(draft.pregunta ?? {}).some((v) => (v ?? '').trim()) ? undefined : 'Rellena el campo obligatorio'}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {mode === 'create' ? 'Añadir pregunta' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <MultilangInput
          label="Pregunta"
          value={draft.pregunta}
          onChange={(v) => setDraft({ ...draft, pregunta: v })}
          placeholder="¿Hacéis guardia nocturna?"
          required
        />
        <MultilangTextarea
          label="Respuesta"
          value={draft.respuesta}
          onChange={(v) => setDraft({ ...draft, respuesta: v })}
          placeholder="Escribe la respuesta clara y breve."
          rows={4}
        />
      </div>
    </Modal>
  );
}

export function FaqsTab() {
  const { farmacia, patch } = useFarmaciaEditor();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDraft, setEditingDraft] = useState<Faq | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setFaqs = (list: Faq[]) => {
    patch({ faqs: list.map((f, i) => ({ ...f, orden: i })) });
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingDraft(crearFaqVacia(farmacia.faqs.length));
    setModalOpen(true);
  };

  const openEdit = (f: Faq) => {
    setModalMode('edit');
    setEditingDraft(f);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDraft(null);
  };

  const handleSave = (f: Faq) => {
    if (modalMode === 'create') {
      setFaqs([...farmacia.faqs, f]);
    } else {
      setFaqs(farmacia.faqs.map((x) => (x.id === f.id ? f : x)));
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setFaqs(farmacia.faqs.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = farmacia.faqs.findIndex((f) => f.id === e.active.id);
    const newIdx = farmacia.faqs.findIndex((f) => f.id === e.over!.id);
    setFaqs(arrayMove(farmacia.faqs, oldIdx, newIdx));
  };

  const activeLocales = farmacia.idiomasActivos;
  const count = farmacia.faqs.length;

  const deletePreview =
    deleteTarget?.pregunta.es ||
    deleteTarget?.pregunta.ca ||
    deleteTarget?.pregunta.en ||
    '';

  return (
    <div className="section-gap max-w-3xl">
      {/* ============= TEXTOS DE CABECERA ============= */}
      <section aria-labelledby="sec-faqs-textos">
        <SectionHeader
          id="sec-faqs-textos"
          title="Textos de la sección"
          hint="Cabecera de la sección «Preguntas frecuentes» en la landing. Deja los campos vacíos para usar los textos por defecto del sitio."
        />
        <TextosCabeceraFields
          value={farmacia.textosFaqs ?? {}}
          onChange={(v) => patch({ textosFaqs: v })}
          defaults={{
            chip: 'Preguntas frecuentes',
            titulo: 'Resolvemos tus dudas',
            subtitulo: 'Las preguntas más habituales que nos hacen…',
          }}
        />
      </section>

      {/* ============= LISTA DE PREGUNTAS ============= */}
      <section aria-labelledby="sec-faqs-lista">
        <SectionHeader
          id="sec-faqs-lista"
          title={count === 0 ? 'Lista de preguntas' : `${count} ${count === 1 ? 'pregunta' : 'preguntas'}`}
          hint="Aparecen como bloque de FAQ en la landing y se publican como FAQ schema en Google. Recomendado 4-8."
          actions={
            count > 0 ? (
              <Button onClick={openCreate} variant="accent" size="sm">
                <NavIcon name="Plus" size={13} />
                <span className="hidden sm:inline">Añadir pregunta</span>
                <span className="sm:hidden">Añadir</span>
              </Button>
            ) : null
          }
        />

        {count === 0 ? (
          <button
            type="button"
            onClick={openCreate}
            className="w-full card p-10 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
              <NavIcon name="Plus" size={20} />
            </div>
            <p className="text-[14px] text-[var(--color-ink-2)] m-0">Añade tu primera pregunta</p>
            <p className="mt-1 text-[12.5px] text-[var(--color-muted)] m-0">
              Guardia nocturna, recetas electrónicas, delivery…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={farmacia.faqs.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="card p-1.5 space-y-0.5 list-none m-0">
                {farmacia.faqs.map((f) => (
                  <FaqRow
                    key={f.id}
                    faq={f}
                    activeLocales={activeLocales}
                    onEdit={() => openEdit(f)}
                    onRemove={() => setDeleteTarget(f)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <FaqModal
        open={modalOpen}
        initial={editingDraft}
        mode={modalMode}
        onSave={handleSave}
        onClose={closeModal}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar pregunta"
        description={
          deletePreview
            ? `Vas a eliminar «${deletePreview}». Esta acción no se puede deshacer.`
            : 'Vas a eliminar esta pregunta. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
