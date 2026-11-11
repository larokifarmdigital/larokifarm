'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { FieldPreview } from '../FieldPreview';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { IconPicker } from '@/components/ui/IconPicker';
import { IconoSVG } from '@/components/ui/IconoSVG';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import type { FeatureTarjeta, Locale } from '@/types/content';
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

/**
 * Fila compacta read-only. Mostrar + gestionar (editar/eliminar/reordenar).
 * El contenido NO se edita in-place: click en editar abre el modal.
 */
function FeatureRow({
  feature,
  currentLocale,
  activeLocales,
  onEdit,
  onRemove,
}: {
  feature: FeatureTarjeta;
  currentLocale: Locale;
  activeLocales: Locale[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: feature.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const titulo =
    feature.titulo[currentLocale] ||
    feature.titulo.es ||
    feature.titulo.ca ||
    feature.titulo.en ||
    '';
  const desc =
    feature.descripcion?.[currentLocale] ||
    feature.descripcion?.es ||
    feature.descripcion?.ca ||
    feature.descripcion?.en ||
    '';
  const hasName = !!titulo.trim();
  const isClock = feature.icono === 'clock';

  const missingLocales = activeLocales.filter(
    (l) => !feature.titulo[l]?.trim(),
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
        aria-label="Reordenar tarjeta"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted-2)] hover:text-[var(--color-ink-2)] cursor-grab active:cursor-grabbing"
      >
        <NavIcon name="DotsSixVertical" size={14} weight="bold" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 flex items-center gap-3 text-left"
      >
        <span
          className={cn(
            'shrink-0 h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center',
            feature.icono
              ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted-2)]',
          )}
        >
          {feature.icono ? (
            <IconoSVG nombre={feature.icono} size={18} />
          ) : (
            <NavIcon name="Image" size={14} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-[13.5px] font-medium truncate leading-tight',
              hasName
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-muted-2)] italic',
            )}
          >
            {hasName ? titulo : 'Tarjeta sin título'}
          </span>
          {desc ? (
            <span className="block text-[12.5px] text-[var(--color-muted)] truncate leading-tight mt-0.5">
              {desc}
            </span>
          ) : isClock ? (
            <span className="block text-[12.5px] italic text-[var(--color-muted-2)] truncate leading-tight mt-0.5">
              Horario auto-calculado
            </span>
          ) : null}
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
        aria-label="Editar tarjeta"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
      >
        <NavIcon name="PencilSimple" size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar tarjeta"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)]"
      >
        <NavIcon name="Trash" size={13} />
      </button>
    </li>
  );
}

function FeatureModal({
  open,
  initial,
  mode,
  currentLocale,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: FeatureTarjeta | null;
  mode: 'create' | 'edit';
  currentLocale: Locale;
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
        <div>
          <Label>Icono</Label>
          <IconPicker
            value={draft.icono}
            onChange={(icono) => setDraft({ ...draft, icono })}
          />
        </div>

        <div className="hairline" />

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
              ? 'Icono «reloj» + descripción vacía → la landing muestra el horario auto-calculado (Lunes a Sábado…).'
              : undefined
          }
        />

        <div className="hairline" />

        <FieldPreview
          kind="featureCard"
          value={{
            titulo: draft.titulo[currentLocale] ?? '',
            descripcion: draft.descripcion?.[currentLocale],
            icono: draft.icono,
          }}
        />
      </div>
    </Modal>
  );
}

export function FeaturesTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();

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
  const countHint =
    count === 0
      ? `Recomendado ${RECOMENDADO} tarjetas.`
      : count < RECOMENDADO
        ? `${count}/${RECOMENDADO} recomendadas. Añade ${RECOMENDADO - count} más para completar la franja.`
        : `${count}/${MAX_FEATURES} · máx ${MAX_FEATURES}.`;

  const deletePreview =
    deleteTarget?.titulo.es ||
    deleteTarget?.titulo.ca ||
    deleteTarget?.titulo.en ||
    '';

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Tarjetas de features"
        hint={`Franja bajo el hero con tarjetas de valor (${countHint}). Si el icono es «reloj» y la descripción está vacía, la landing muestra el horario auto-calculado.`}
        actions={
          count > 0 ? (
            <Button
              variant="accent"
              size="sm"
              onClick={openCreate}
              disabled={count >= MAX_FEATURES}
            >
              <NavIcon name="Plus" size={13} />
              <span className="hidden sm:inline">Añadir tarjeta</span>
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
          <p className="text-[14px] text-[var(--color-ink-2)] m-0">Añade tu primera tarjeta</p>
          <p className="mt-1 text-[12.5px] text-[var(--color-muted)] m-0">
            Horario, guardia 24h, entrega a domicilio, consejo profesional…
          </p>
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <ul className="card p-1.5 space-y-0.5 list-none m-0">
              {features.map((f) => (
                <FeatureRow
                  key={f.id}
                  feature={f}
                  currentLocale={currentLocale}
                  activeLocales={farmacia.idiomasActivos}
                  onEdit={() => openEdit(f)}
                  onRemove={() => setDeleteTarget(f)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <FeatureModal
        open={modalOpen}
        initial={editingDraft}
        mode={modalMode}
        currentLocale={currentLocale}
        onSave={handleSave}
        onClose={closeModal}
      />

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
