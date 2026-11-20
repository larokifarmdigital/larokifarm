'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { ListFieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { TextosCabeceraFields } from '@/features/farmacias/ui/components/editor/fields/TextosCabeceraFields';
import { Button } from '@/shared/components/atoms/Button';
import { Modal } from '@/shared/components/molecules/Modal';
import { ModalLocaleScope } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import type { Faq } from '@/core/farmacias/domain';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { LOCALE_NOMBRE } from '@/core/shared';
import { AvisoTraduccion, CabeceraColapsable, FilaLista } from '@/features/farmacias/ui/components/editor/fields/FilaLista';

function crearFaqVacia(orden: number): Faq {
  return {
    id: `faq_${Math.random().toString(36).slice(2, 10)}`,
    pregunta: {},
    respuesta: {},
    orden,
  };
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
      description="Sale en la sección de preguntas frecuentes de tu web."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!(draft.pregunta?.es ?? '').trim() || !(draft.respuesta?.es ?? '').trim()}
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
        <ModalLocaleScope values={[draft.pregunta, draft.respuesta]}>
          <MultilangInput
            label="Pregunta"
            value={draft.pregunta}
            onChange={(v) => setDraft({ ...draft, pregunta: v })}
            placeholder="¿Hacéis guardia nocturna?"
            required
          />
          <MultilangTextarea
            label="Respuesta"
            required
            value={draft.respuesta}
            onChange={(v) => setDraft({ ...draft, respuesta: v })}
            placeholder="Escribe la respuesta clara y breve."
            rows={4}
          />
        </ModalLocaleScope>
      </div>
    </Modal>
  );
}

export function FaqsTab() {
  const { farmacia, patch, currentLocale, issues } = useFarmaciaEditor();
  const [recienAnadida, setRecienAnadida] = useState<string | null>(null);

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
      setRecienAnadida(f.id);
      window.setTimeout(() => setRecienAnadida(null), 2500);
      toast.success('Pregunta añadida al final de la lista', {
        description: 'Puedes moverla de sitio desde la lista.',
      });
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

  const moverFaq = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= farmacia.faqs.length) return;
    setFaqs(arrayMove(farmacia.faqs, indice, destino));
  };

  const activeLocales = farmacia.idiomasActivos;
  const t = farmacia.textosFaqs ?? {};
  const cabeceraConError = issues.some((i) => i.field.startsWith('textosFaqs'));
  const count = farmacia.faqs.length;

  const deletePreview =
    deleteTarget?.pregunta.es ||
    deleteTarget?.pregunta.ca ||
    deleteTarget?.pregunta.en ||
    '';

  return (
    <div className="section-gap max-w-3xl">
      <section aria-labelledby="sec-faqs-lista">
        <SectionHeader
          id="sec-faqs-lista"
          required
          title={count === 0 ? 'Preguntas' : `${count} ${count === 1 ? 'pregunta' : 'preguntas'}`}
          hint="Salen en tu web en este orden. Lo ideal son entre 4 y 8."
          actions={
            count > 0 ? (
              <Button onClick={openCreate} variant="accent" size="sm">
                <NavIcon name="Plus" size={14} />
                Añadir pregunta
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
            <p className="text-[15px] font-medium text-[var(--color-ink)] m-0">Añade tu primera pregunta</p>
            <p className="mt-1 text-[13px] text-[var(--color-muted)] m-0">
              Guardias, receta electrónica, entrega a domicilio…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={farmacia.faqs.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ul className="card p-1.5 space-y-0.5 list-none m-0">
                {farmacia.faqs.map((f, i) => {
                  const pregunta = f.pregunta[currentLocale] || f.pregunta.es || f.pregunta.ca || f.pregunta.en || '';
                  const faltan = activeLocales
                    .filter((l) => !(f.pregunta[l]?.trim() && f.respuesta[l]?.trim()))
                    .map((l) => LOCALE_NOMBRE[l]);
                  return (
                    <FilaLista
                      key={f.id}
                      id={f.id}
                      indice={i}
                      total={count}
                      tipo="pregunta"
                      titulo={pregunta}
                      destacar={recienAnadida === f.id}
                      aviso={<AvisoTraduccion idiomas={faltan} />}
                      onEdit={() => openEdit(f)}
                      onRemove={() => setDeleteTarget(f)}
                      onMove={(d) => moverFaq(i, d)}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <ListFieldError field="faqs" />
      </section>

      <section aria-label="Textos de la cabecera de Preguntas frecuentes">
        <CabeceraColapsable abierta={cabeceraConError} resumen={[t.chip?.es, t.titulo?.es].filter(Boolean).join(' · ')}>
          <TextosCabeceraFields
            required
            fieldPrefix="textosFaqs"
            value={t}
            onChange={(v) => patch({ textosFaqs: v })}
            defaults={{
              chip: 'Preguntas frecuentes',
              titulo: 'Resolvemos tus dudas',
              subtitulo: 'Las preguntas más habituales que nos hacen…',
            }}
          />
        </CabeceraColapsable>
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
