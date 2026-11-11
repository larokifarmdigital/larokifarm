'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { TiptapField } from '@/features/farmacias/ui/components/editor/fields/TiptapField';
import { LocaleChip } from '@/features/farmacias/ui/components/editor/status/LocaleChip';
import { ImageGalleryField } from '@/features/farmacias/ui/components/editor/fields/ImageGalleryField';
import { computeLocaleStatus } from '@/features/farmacias/ui/lib/i18nStatus';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { Modal } from '@/shared/components/molecules/Modal';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { Locale, MultilangText } from '@/core/shared';
import type { SobreNosotros } from '@/core/farmacias/domain';
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

const MAX_PUNTOS = 8;
const RECOMENDADO_PUNTOS = 4;
const MAX_IMAGENES = 6;

/**
 * Fila compacta read-only. Mostrar + gestionar (editar/eliminar/reordenar).
 * Punto = una sola frase i18n, sin icono ni descripción.
 */
function PuntoRow({
  id,
  punto,
  currentLocale,
  activeLocales,
  onEdit,
  onRemove,
}: {
  id: string;
  punto: MultilangText;
  currentLocale: Locale;
  activeLocales: Locale[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const texto =
    punto[currentLocale] || punto.es || punto.ca || punto.en || '';
  const hasText = !!texto.trim();

  const missingLocales = activeLocales.filter((l) => !punto[l]?.trim());

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
        aria-label="Reordenar punto"
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
          <NavIcon name="Check" size={14} weight="bold" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-[13.5px] font-medium truncate leading-tight',
              hasText
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-muted-2)] italic',
            )}
          >
            {hasText ? texto : 'Punto sin texto'}
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
        aria-label="Editar punto"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
      >
        <NavIcon name="PencilSimple" size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar punto"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)]"
      >
        <NavIcon name="Trash" size={13} />
      </button>
    </li>
  );
}

function PuntoModal({
  open,
  initial,
  mode,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: MultilangText | null;
  mode: 'create' | 'edit';
  onSave: (p: MultilangText) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MultilangText | null>(initial);
  const [seed, setSeed] = useState({ open, initial });

  // Re-seed el draft cada vez que se abre con un `initial` nuevo; limpia al
  // cerrar. Se ajusta durante el render (patrón React), no en un effect.
  if (seed.open !== open || seed.initial !== initial) {
    setSeed({ open, initial });
    if (open && initial) setDraft(initial);
    if (!open) setDraft(null);
  }

  if (!draft) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === 'create' ? 'Nuevo punto destacado' : 'Editar punto'}
      description="Frase corta que resume un valor de la farmacia. Aparece como ítem de lista en la sección «Sobre nosotros»."
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
            {mode === 'create' ? 'Añadir punto' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <MultilangInput
          label="Texto del punto"
          value={draft}
          onChange={setDraft}
          placeholder="Ej.: Equipo formado en pediatría"
          required
        />
      </div>
    </Modal>
  );
}

export function SobreTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const sobre: SobreNosotros = farmacia.sobreNosotros ?? {};
  const puntos = sobre.puntos ?? [];
  const imagenes = farmacia.imagenesSobre ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<MultilangText | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setSobre = (next: Partial<SobreNosotros>) =>
    patch({ sobreNosotros: { ...sobre, ...next } });

  const setPuntos = (next: MultilangText[]) => setSobre({ puntos: next });

  const openCreate = () => {
    if (puntos.length >= MAX_PUNTOS) return;
    setModalMode('create');
    setEditingIndex(null);
    setEditingDraft({});
    setModalOpen(true);
  };

  const openEdit = (i: number) => {
    setModalMode('edit');
    setEditingIndex(i);
    setEditingDraft({ ...puntos[i] });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDraft(null);
    setEditingIndex(null);
  };

  const handleSave = (p: MultilangText) => {
    if (modalMode === 'create') {
      setPuntos([...puntos, p]);
    } else if (editingIndex !== null) {
      setPuntos(puntos.map((x, idx) => (idx === editingIndex ? p : x)));
    }
  };

  const handleConfirmDelete = () => {
    if (deleteIndex === null) return;
    setPuntos(puntos.filter((_, idx) => idx !== deleteIndex));
    setDeleteIndex(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = Number(String(e.active.id).replace('p-', ''));
    const newIdx = Number(String(e.over.id).replace('p-', ''));
    if (Number.isNaN(oldIdx) || Number.isNaN(newIdx)) return;
    setPuntos(arrayMove(puntos, oldIdx, newIdx));
  };

  const count = puntos.length;
  const puntosCountHint =
    count === 0
      ? `Recomendado ${RECOMENDADO_PUNTOS}-6 puntos.`
      : count < RECOMENDADO_PUNTOS
        ? `${count}/${RECOMENDADO_PUNTOS} recomendados.`
        : `${count}/${MAX_PUNTOS} · máx ${MAX_PUNTOS}.`;

  const deletePreview =
    deleteIndex !== null
      ? puntos[deleteIndex]?.es ||
        puntos[deleteIndex]?.ca ||
        puntos[deleteIndex]?.en ||
        ''
      : '';

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= TEXTOS ============= */}
      <section aria-labelledby="sec-sobre-textos">
        <SectionHeader
          id="sec-sobre-textos"
          title="Textos de la sección"
          hint="Chip, título y años de experiencia que se muestran en la cabecera de la sección «Sobre nosotros»."
        />

        <div className="space-y-4">
          <MultilangInput
            label="Chip (etiqueta superior)"
            value={sobre.chip ?? {}}
            onChange={(v) => setSobre({ chip: v })}
            placeholder="Sobre nosotros"
            help="Texto pequeño sobre el título. Por defecto: «Sobre nosotros»."
          />
          <MultilangInput
            label="Título"
            value={sobre.titulo ?? {}}
            onChange={(v) => setSobre({ titulo: v })}
            placeholder="Una farmacia para familias"
            help="Las dos últimas palabras se resaltan automáticamente en la landing."
          />
          <div>
            <Label htmlFor="anyos-experiencia" hint={<span className="text-[11px] text-[var(--color-muted-2)]">badge «+X años»</span>}>
              Años de experiencia
            </Label>
            <Input
              id="anyos-experiencia"
              type="number"
              min={0}
              max={200}
              value={sobre.anyosExperiencia ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                setSobre({ anyosExperiencia: raw === '' ? undefined : Number(raw) });
              }}
              placeholder="45"
              className="font-mono-tabular max-w-[180px]"
            />
            <p className="help">Si lo dejas vacío, no aparece badge en la landing.</p>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= PUNTOS ============= */}
      <section aria-labelledby="sec-sobre-puntos">
        <SectionHeader
          id="sec-sobre-puntos"
          title={count === 0 ? 'Puntos destacados' : `${count} ${count === 1 ? 'punto' : 'puntos'}`}
          hint={`Lista de frases cortas que resumen los valores de la farmacia. ${puntosCountHint}`}
          actions={
            count > 0 ? (
              <Button
                variant="accent"
                size="sm"
                onClick={openCreate}
                disabled={count >= MAX_PUNTOS}
              >
                <NavIcon name="Plus" size={13} />
                <span className="hidden sm:inline">Añadir punto</span>
                <span className="sm:hidden">Añadir</span>
              </Button>
            ) : null
          }
        />

        {count === 0 ? (
          <button
            type="button"
            onClick={openCreate}
            className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
              <NavIcon name="Plus" size={18} />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Añade tu primer punto destacado</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">
              «Atención personalizada», «Servicio a domicilio», «Dermofarmacia especializada»…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={puntos.map((_, i) => `p-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="card p-1.5 space-y-0.5 list-none m-0">
                {puntos.map((p, i) => (
                  <PuntoRow
                    key={`p-${i}`}
                    id={`p-${i}`}
                    punto={p}
                    currentLocale={currentLocale}
                    activeLocales={farmacia.idiomasActivos}
                    onEdit={() => openEdit(i)}
                    onRemove={() => setDeleteIndex(i)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <div className="hairline" />

      {/* ============= DESCRIPCIÓN LARGA ============= */}
      <section aria-labelledby="sec-sobre-descripcion">
        <SectionHeader
          id="sec-sobre-descripcion"
          title="Descripción larga"
          hint="Cuerpo principal de la sección «Sobre nosotros» de la landing. Historia, especialidad y valores."
        />
        <Label
          hint={
            <LocaleChip
              locale={currentLocale}
              status={computeLocaleStatus(farmacia.descripcionLarga, currentLocale, farmacia.idiomasActivos)}
            />
          }
          className="mb-3"
        >
          Cuerpo
        </Label>
        <TiptapField
          value={farmacia.descripcionLarga[currentLocale] ?? ''}
          onChange={(html) =>
            patch({
              descripcionLarga: {
                ...farmacia.descripcionLarga,
                [currentLocale]: html,
              },
            })
          }
          placeholder="Escribe la descripción larga de la farmacia…"
          minHeight={220}
        />
      </section>

      <div className="hairline" />

      {/* ============= IMÁGENES ============= */}
      <section aria-labelledby="sec-sobre-imagenes">
        <SectionHeader
          id="sec-sobre-imagenes"
          title="Imágenes"
          hint={`Aparecen junto a la descripción en la landing. Entre 1 y ${MAX_IMAGENES} imágenes.`}
        />

        <ImageGalleryField
          businessId={farmacia.id}
          role="sobre"
          value={imagenes}
          onChange={(imagenesSobre) => patch({ imagenesSobre })}
          idiomasActivos={farmacia.idiomasActivos}
          max={MAX_IMAGENES}
        />
      </section>

      <PuntoModal
        open={modalOpen}
        initial={editingDraft}
        mode={modalMode}
        onSave={handleSave}
        onClose={closeModal}
      />

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => !o && setDeleteIndex(null)}
        title="Eliminar punto"
        description={
          deletePreview
            ? `Vas a eliminar «${deletePreview}». Esta acción no se puede deshacer.`
            : 'Vas a eliminar este punto. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
