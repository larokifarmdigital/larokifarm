'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { IconPicker } from '@/components/ui/IconPicker';
import { IconoSVG } from '@/components/ui/IconoSVG';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import type { FeatureTarjeta } from '@/types/content';
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

function FeatureRow({
  feature,
  currentLocale,
  onEdit,
  onRemove,
}: {
  feature: FeatureTarjeta;
  currentLocale: 'es' | 'en' | 'ca';
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

  const titulo = feature.titulo[currentLocale];
  const desc = feature.descripcion?.[currentLocale];
  const isReloj = feature.icono === 'reloj';

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
        aria-label="Reordenar feature"
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
          {feature.icono ? (
            <IconoSVG nombre={feature.icono} size={18} />
          ) : (
            <NavIcon name="Image" size={14} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-[var(--color-ink)] truncate">
            {titulo || <span className="text-[var(--color-muted-2)] italic">Sin título</span>}
          </span>
          <span className="block text-[12px] text-[var(--color-muted)] truncate">
            {desc || (isReloj ? <em>Horario auto-calculado</em> : <span className="text-[var(--color-muted-2)]">Sin descripción</span>)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar feature"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
      >
        <NavIcon name="PencilSimple" size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar feature"
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
  onSave,
  onClose,
}: {
  open: boolean;
  initial: FeatureTarjeta | null;
  onSave: (f: FeatureTarjeta) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FeatureTarjeta | null>(initial);

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  const isNew = !initial?.titulo.es && !initial?.titulo.en && !initial?.titulo.ca;
  const isReloj = draft.icono === 'reloj';

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? 'Nueva tarjeta' : 'Editar tarjeta'}
      description="Cada tarjeta ocupa una columna en la franja bajo el hero. Se recomienda 4 tarjetas."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" size="md" onClick={() => { onSave(draft); onClose(); }}>
            {isNew ? 'Añadir tarjeta' : 'Guardar cambios'}
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
          label={isReloj ? 'Descripción (opcional)' : 'Descripción'}
          value={draft.descripcion ?? {}}
          onChange={(v) => setDraft({ ...draft, descripcion: v })}
          placeholder={isReloj ? 'Déjalo vacío para mostrar el horario auto-calculado (Lunes a Sábado…)' : 'Frase corta que explica el valor.'}
          rows={2}
          help={isReloj ? 'Icono «reloj» + descripción vacía → la landing muestra el horario auto-calculado.' : undefined}
        />
      </div>
    </Modal>
  );
}

export function FeaturesTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const features = farmacia.featuresLista ?? [];
  const editing = features.find((f) => f.id === editingId) ?? null;

  const setFeatures = (list: FeatureTarjeta[]) =>
    patch({ featuresLista: list.map((f, i) => ({ ...f, orden: i })) });

  const add = () => {
    if (features.length >= MAX_FEATURES) return;
    const nueva = crearFeatureVacia(features.length);
    setFeatures([...features, nueva]);
    setEditingId(nueva.id);
    setModalOpen(true);
  };

  const edit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const save = (f: FeatureTarjeta) => {
    setFeatures(features.map((x) => (x.id === f.id ? f : x)));
  };

  const closeModal = () => {
    if (editing) {
      const empty =
        !editing.titulo.es &&
        !editing.titulo.en &&
        !editing.titulo.ca &&
        !editing.icono;
      if (empty) setFeatures(features.filter((x) => x.id !== editing.id));
    }
    setModalOpen(false);
    setEditingId(null);
  };

  const remove = (id: string) =>
    setFeatures(features.filter((x) => x.id !== id));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = features.findIndex((f) => f.id === e.active.id);
    const newIdx = features.findIndex((f) => f.id === e.over!.id);
    setFeatures(arrayMove(features, oldIdx, newIdx));
  };

  const countHint =
    features.length === 0
      ? `Recomendado ${RECOMENDADO} tarjetas.`
      : features.length < RECOMENDADO
        ? `${features.length}/${RECOMENDADO} recomendadas. Añade ${RECOMENDADO - features.length} más para completar la franja.`
        : features.length <= MAX_FEATURES
          ? `${features.length}/${MAX_FEATURES} · máx ${MAX_FEATURES}.`
          : '';

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Tarjetas de features"
        hint={`Franja bajo el hero con tarjetas de valor (${countHint}). Si el icono es «reloj» y la descripción está vacía, la landing muestra el horario auto-calculado.`}
        actions={
          <Button
            variant="accent"
            size="sm"
            onClick={add}
            disabled={features.length >= MAX_FEATURES}
          >
            <NavIcon name="Plus" size={13} />
            <span className="hidden sm:inline">Añadir tarjeta</span>
            <span className="sm:hidden">Añadir</span>
          </Button>
        }
      />

      {features.length === 0 ? (
        <button
          type="button"
          onClick={add}
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
                  onEdit={() => edit(f.id)}
                  onRemove={() => remove(f.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <FeatureModal
        open={modalOpen}
        initial={editing}
        onSave={save}
        onClose={closeModal}
      />
    </div>
  );
}
