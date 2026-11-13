'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { Input } from '@/shared/components/atoms/Input';
import { Button } from '@/shared/components/atoms/Button';
import { Label } from '@/shared/components/atoms/Label';
import { Modal } from '@/shared/components/molecules/Modal';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { TextosCabeceraFields } from '@/features/farmacias/ui/components/editor/fields/TextosCabeceraFields';
import { IconPicker } from '@/shared/components/molecules/IconPicker';
import { IconoSVG } from '@/shared/components/atoms/IconoSVG';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { Servicio } from '@/core/farmacias/domain';
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
import { isSafeHref } from '@/shared/lib/safeHref';

function crearServicioVacio(orden: number): Servicio {
  return {
    id: `srv_${Math.random().toString(36).slice(2, 10)}`,
    icono: undefined,
    nombre: {},
    descripcion: {},
    enlace: undefined,
    orden,
  };
}

/**
 * Fila compacta read-only. Mostrar + gestionar (editar/eliminar/reordenar).
 * El contenido NO se edita in-place: click en editar abre el modal.
 */
function ServicioRow({
  servicio,
  currentLocale,
  activeLocales,
  onEdit,
  onRemove,
}: {
  servicio: Servicio;
  currentLocale: Locale;
  activeLocales: Locale[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: servicio.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const nombre =
    servicio.nombre[currentLocale] ||
    servicio.nombre.es ||
    servicio.nombre.ca ||
    servicio.nombre.en ||
    '';
  const desc =
    servicio.descripcion?.[currentLocale] ||
    servicio.descripcion?.es ||
    servicio.descripcion?.ca ||
    servicio.descripcion?.en ||
    '';
  const hasName = !!nombre.trim();

  const missingLocales = activeLocales.filter(
    (l) => !servicio.nombre[l]?.trim(),
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
        aria-label="Reordenar servicio"
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
            servicio.icono
              ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted-2)]',
          )}
        >
          {servicio.icono ? (
            <IconoSVG nombre={servicio.icono} size={18} />
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
            {hasName ? nombre : 'Servicio sin título'}
          </span>
          {desc && (
            <span className="block text-[12.5px] text-[var(--color-muted)] truncate leading-tight mt-0.5">
              {desc}
            </span>
          )}
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
        aria-label="Editar servicio"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
      >
        <NavIcon name="PencilSimple" size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar servicio"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)]"
      >
        <NavIcon name="Trash" size={13} />
      </button>
    </li>
  );
}

function ServicioModal({
  open,
  initial,
  mode,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Servicio | null;
  mode: 'create' | 'edit';
  onSave: (servicio: Servicio) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Servicio | null>(initial);

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}
      description="Los servicios aparecen en la sección «Nuestros servicios» de la landing."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!Object.values(draft.nombre ?? {}).some((v) => (v ?? '').trim()) || !isSafeHref(draft.enlace?.url ?? '')}
            title={Object.values(draft.nombre ?? {}).some((v) => (v ?? '').trim()) ? undefined : 'Rellena el campo obligatorio'}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {mode === 'create' ? 'Añadir servicio' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label>Icono</Label>
          <p className="text-[11.5px] text-[var(--color-muted)] mb-3 mt-0.5">
            Elige un icono del catálogo. El que muestres aquí es el que verá el visitante.
          </p>
          <IconPicker
            value={draft.icono}
            onChange={(icono) => setDraft({ ...draft, icono })}
          />
        </div>

        <div className="hairline" />

        <MultilangInput
          label="Nombre del servicio"
          value={draft.nombre}
          onChange={(v) => setDraft({ ...draft, nombre: v })}
          placeholder="Consulta dermofarmacéutica"
          required
        />

        <MultilangTextarea
          label="Descripción"
          value={draft.descripcion ?? {}}
          onChange={(v) => setDraft({ ...draft, descripcion: v })}
          placeholder="Breve descripción del servicio…"
          rows={3}
        />

        <div className="hairline" />

        <div>
          <Label hint="Opcional">Enlace al hacer clic</Label>
          <p className="text-[11.5px] text-[var(--color-muted)] mb-2 mt-0.5">
            Si rellenas la URL, toda la tarjeta será clicable. Acepta URL externa, ancla (#seccion) o ruta interna (/aviso-legal).
          </p>
          <Input
            type="url"
            value={draft.enlace?.url ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                enlace: { ...draft.enlace, url: e.target.value || undefined },
              })
            }
            placeholder="https://…"
            aria-invalid={!isSafeHref(draft.enlace?.url ?? '')}
          />
          {!isSafeHref(draft.enlace?.url ?? '') && (
            <p role="alert" className="mt-1.5 mb-0 text-[12px] text-[var(--color-red-ink)]">
              Enlace no permitido. Usa https://, mailto:, tel:, #seccion o /ruta.
            </p>
          )}
          <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-[var(--color-ink-2)] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.enlace?.nuevaPestana ?? false}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  enlace: { ...draft.enlace, nuevaPestana: e.target.checked },
                })
              }
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
            Abrir en nueva pestaña (recomendado para URLs externas)
          </label>
        </div>
      </div>
    </Modal>
  );
}

export function ServiciosTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDraft, setEditingDraft] = useState<Servicio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Servicio | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setServicios = (list: Servicio[]) => {
    patch({ servicios: list.map((s, i) => ({ ...s, orden: i })) });
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingDraft(crearServicioVacio(farmacia.servicios.length));
    setModalOpen(true);
  };

  const openEdit = (s: Servicio) => {
    setModalMode('edit');
    setEditingDraft(s);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDraft(null);
  };

  const handleSave = (s: Servicio) => {
    if (modalMode === 'create') {
      setServicios([...farmacia.servicios, s]);
    } else {
      setServicios(farmacia.servicios.map((x) => (x.id === s.id ? s : x)));
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setServicios(farmacia.servicios.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = farmacia.servicios.findIndex((s) => s.id === e.active.id);
    const newIdx = farmacia.servicios.findIndex((s) => s.id === e.over!.id);
    setServicios(arrayMove(farmacia.servicios, oldIdx, newIdx));
  };

  const activeLocales = farmacia.idiomasActivos;
  const count = farmacia.servicios.length;

  const deletePreview =
    deleteTarget?.nombre.es ||
    deleteTarget?.nombre.ca ||
    deleteTarget?.nombre.en ||
    '';

  return (
    <div className="section-gap max-w-3xl">
      {/* ============= TEXTOS DE CABECERA ============= */}
      <section aria-labelledby="sec-servicios-textos">
        <SectionHeader
          id="sec-servicios-textos"
          title="Textos de la sección"
          hint="Cabecera de la sección «Nuestros servicios» en la landing. Deja los campos vacíos para usar los textos por defecto del sitio."
        />
        <TextosCabeceraFields
          value={farmacia.textosServicios ?? {}}
          onChange={(v) => patch({ textosServicios: v })}
          defaults={{
            chip: 'Nuestros servicios',
            titulo: 'Nuestros servicios',
            subtitulo: 'Ofrecemos una amplia gama de servicios farmacéuticos…',
          }}
        />
      </section>

      {/* ============= LISTA DE SERVICIOS ============= */}
      <section aria-labelledby="sec-servicios-lista">
        <SectionHeader
          id="sec-servicios-lista"
          title={count === 0 ? 'Lista de servicios' : `${count} ${count === 1 ? 'servicio' : 'servicios'}`}
          hint="Cada servicio aparece como card en la landing. Arrastra las filas para reordenar."
          actions={
            count > 0 ? (
              <Button variant="accent" size="sm" onClick={openCreate}>
                <NavIcon name="Plus" size={13} />
                <span className="hidden sm:inline">Añadir servicio</span>
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
            <p className="text-[14px] text-[var(--color-ink-2)] m-0">
              Añade tu primer servicio
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--color-muted)] m-0">
              Consulta dermofarmacéutica, delivery, asesoría nutricional…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={farmacia.servicios.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="card p-1.5 space-y-0.5 list-none m-0">
                {farmacia.servicios.map((s) => (
                  <ServicioRow
                    key={s.id}
                    servicio={s}
                    currentLocale={currentLocale}
                    activeLocales={activeLocales}
                    onEdit={() => openEdit(s)}
                    onRemove={() => setDeleteTarget(s)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <ServicioModal
        open={modalOpen}
        initial={editingDraft}
        mode={modalMode}
        onSave={handleSave}
        onClose={closeModal}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar servicio"
        description={
          deletePreview
            ? `Vas a eliminar «${deletePreview}». Esta acción no se puede deshacer.`
            : 'Vas a eliminar este servicio. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
