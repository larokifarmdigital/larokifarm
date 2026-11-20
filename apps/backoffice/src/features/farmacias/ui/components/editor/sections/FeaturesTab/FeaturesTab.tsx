'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { fieldDomId } from '@/core/farmacias/domain';
import { ListFieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { FieldPreview } from '@/features/farmacias/ui/components/editor/fields/FieldPreview';
import { Button } from '@/shared/components/atoms/Button';
import { Modal } from '@/shared/components/molecules/Modal';
import { ModalLocaleScope } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { IconoField } from '@/features/farmacias/ui/components/editor/fields/IconoField';
import { IconoSVG } from '@/shared/components/atoms/IconoSVG';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { FeatureTarjeta } from '@/core/farmacias/domain';
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
import { AvisoTraduccion, FilaLista } from '@/features/farmacias/ui/components/editor/fields/FilaLista';

const MAX_FEATURES = 6;
const RECOMENDADO = 4;

function crearFeatureVacia(orden: number): FeatureTarjeta {
  return {
    id: `ftj_${Math.random().toString(36).slice(2, 10)}`,
    icono: undefined,
    titulo: {},
    descripcion: {},
    orden,
  };
}

function FeatureModal({
  open,
  initial,
  mode,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: FeatureTarjeta | null;
  mode: 'create' | 'edit';
  onSave: (f: FeatureTarjeta) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FeatureTarjeta | null>(initial);

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  const isClock = draft.icono === 'clock';

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === 'create' ? 'Nueva tarjeta' : 'Editar tarjeta'}
      description="Cada tarjeta ocupa una columna en la franja bajo el hero. Se recomienda 4 tarjetas."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!Object.values(draft.titulo ?? {}).some((v) => (v ?? '').trim())}
            title={Object.values(draft.titulo ?? {}).some((v) => (v ?? '').trim()) ? undefined : 'Rellena el campo obligatorio'}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {mode === 'create' ? 'Añadir tarjeta' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <ModalLocaleScope values={[draft.titulo, draft.descripcion]}>
          {(locale) => (
            <>
            <MultilangInput
              label="Título"
              value={draft.titulo}
              onChange={(v) => setDraft({ ...draft, titulo: v })}
              placeholder="Ej.: Atención personalizada"
              required
            />
            <MultilangTextarea
              label={isClock ? 'Descripción (opcional)' : 'Descripción'}
              value={draft.descripcion ?? {}}
              onChange={(v) => setDraft({ ...draft, descripcion: v })}
              placeholder={
                isClock
                  ? 'Déjalo vacío para mostrar el horario auto-calculado.'
                  : 'Frase corta que explica el valor.'
              }
              rows={2}
              help={
                isClock
                  ? 'Con el icono de reloj y sin descripción, tu web muestra el horario de la farmacia.'
                  : undefined
              }
            />

            <IconoField value={draft.icono} onChange={(icono) => setDraft({ ...draft, icono })} />

            <div className="hairline" />

            <FieldPreview
              kind="featureCard"
              value={{
                titulo: draft.titulo[locale] ?? '',
                descripcion: draft.descripcion?.[locale],
                icono: draft.icono,
              }}
            />
            </>
          )}
        </ModalLocaleScope>
      </div>
    </Modal>
  );
}

export function FeaturesTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const [recienAnadida, setRecienAnadida] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDraft, setEditingDraft] = useState<FeatureTarjeta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureTarjeta | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const features = farmacia.featuresLista ?? [];

  const setFeatures = (list: FeatureTarjeta[]) =>
    patch({ featuresLista: list.map((f, i) => ({ ...f, orden: i })) });

  const openCreate = () => {
    if (features.length >= MAX_FEATURES) return;
    setModalMode('create');
    setEditingDraft(crearFeatureVacia(features.length));
    setModalOpen(true);
  };

  const openEdit = (f: FeatureTarjeta) => {
    setModalMode('edit');
    setEditingDraft(f);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDraft(null);
  };

  const handleSave = (f: FeatureTarjeta) => {
    if (modalMode === 'create') {
      setFeatures([...features, f]);
      setRecienAnadida(f.id);
      window.setTimeout(() => setRecienAnadida(null), 2500);
      toast.success('Tarjeta añadida al final', {
        description: 'Puedes moverla de sitio desde la lista.',
      });
    } else {
      setFeatures(features.map((x) => (x.id === f.id ? f : x)));
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setFeatures(features.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = features.findIndex((f) => f.id === e.active.id);
    const newIdx = features.findIndex((f) => f.id === e.over!.id);
    setFeatures(arrayMove(features, oldIdx, newIdx));
  };

  const count = features.length;
  const lleno = count >= MAX_FEATURES;
  const mover = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= features.length) return;
    setFeatures(arrayMove(features, indice, destino));
  };
  const countHint =
    count < RECOMENDADO
      ? `Lo ideal son ${RECOMENDADO}.`
      : `Puedes poner hasta ${MAX_FEATURES}.`;

  const deletePreview =
    deleteTarget?.titulo.es ||
    deleteTarget?.titulo.ca ||
    deleteTarget?.titulo.en ||
    '';

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        id={fieldDomId('featuresLista')}
        required
        title={count === 0 ? 'Puntos fuertes' : `${count} ${count === 1 ? 'tarjeta' : 'tarjetas'}`}
        hint={`Salen bajo la portada, en este orden. ${countHint} Con el icono de reloj y sin descripción, la tarjeta muestra el horario.`}
        actions={
          count > 0 && !lleno ? (
            <Button variant="accent" size="sm" onClick={openCreate}>
              <NavIcon name="Plus" size={14} />
              Añadir tarjeta
            </Button>
          ) : null
        }
      />
      {lleno && (
        <p className="m-0 -mt-2 text-[13.5px] text-[var(--color-muted)]">
          Has llegado al máximo de {MAX_FEATURES} tarjetas. Elimina una para añadir otra.
        </p>
      )}

      {count === 0 ? (
        <button
          type="button"
          onClick={openCreate}
          className="w-full card p-10 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
            <NavIcon name="Plus" size={20} />
          </div>
          <p className="text-[15px] font-medium text-[var(--color-ink)] m-0">Añade tu primera tarjeta</p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)] m-0">
            Horario, guardia 24h, entrega a domicilio, consejo profesional…
          </p>
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <ul className="card p-1.5 space-y-0.5 list-none m-0">
              {features.map((f, i) => {
                const titulo = f.titulo[currentLocale] || f.titulo.es || f.titulo.ca || f.titulo.en || '';
                const desc = f.descripcion?.[currentLocale] || f.descripcion?.es || '';
                const faltan = farmacia.idiomasActivos.filter((l) => !f.titulo[l]?.trim()).map((l) => LOCALE_NOMBRE[l]);
                return (
                  <FilaLista
                    key={f.id}
                    id={f.id}
                    indice={i}
                    total={count}
                    tipo="tarjeta"
                    titulo={titulo}
                    detalle={f.icono === 'clock' && !desc ? 'Muestra el horario de la farmacia' : desc}
                    destacar={recienAnadida === f.id}
                    icono={
                      <span
                        className={cn(
                          'h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center',
                          f.icono
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]',
                        )}
                      >
                        {f.icono ? <IconoSVG nombre={f.icono} size={18} /> : <NavIcon name="Image" size={14} />}
                      </span>
                    }
                    aviso={<AvisoTraduccion idiomas={faltan} />}
                    onEdit={() => openEdit(f)}
                    onRemove={() => setDeleteTarget(f)}
                    onMove={(d) => mover(i, d)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <FeatureModal
        open={modalOpen}
        initial={editingDraft}
        mode={modalMode}
        onSave={handleSave}
        onClose={closeModal}
      />

      <ListFieldError field="featuresLista" />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar tarjeta"
        description={
          deletePreview
            ? `Vas a eliminar «${deletePreview}». Esta acción no se puede deshacer.`
            : 'Vas a eliminar esta tarjeta. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
