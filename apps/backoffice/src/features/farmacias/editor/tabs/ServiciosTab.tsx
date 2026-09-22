'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextosCabeceraFields } from '../TextosCabeceraFields';
import { IconPicker } from '@/components/ui/IconPicker';
import { IconoSVG } from '@/components/ui/IconoSVG';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import type { Servicio } from '@/types/content';
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

function SortableRow({
  servicio,
  currentLocale,
  onEdit,
  onRemove,
}: {
  servicio: Servicio;
  currentLocale: 'es' | 'en' | 'ca';
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

  const nombre = servicio.nombre[currentLocale];
  const desc = servicio.descripcion?.[currentLocale];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-[var(--radius-sm)] border border-transparent bg-[var(--color-surface)]',
        'hover:border-[var(--color-hairline)] hover:shadow-[var(--shadow-soft)] transition-all',
        isDragging && 'border-[var(--color-hairline-strong)] shadow-[var(--shadow-elevated)]',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar (arrastrar)"
        className="shrink-0 h-8 w-6 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-muted-2)] hover:text-[var(--color-ink-2)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <NavIcon name="DotsSixVertical" size={14} weight="bold" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex-1 flex items-center gap-3 min-w-0 text-left px-1 py-0.5 rounded-[var(--radius-xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
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
          <span className="block text-[14px] font-medium text-[var(--color-ink)] truncate">
            {nombre || (
              <span className="italic text-[var(--color-muted-2)]">
                Sin nombre en {currentLocale.toUpperCase()}
              </span>
            )}
          </span>
          {desc && (
            <span className="block text-[12.5px] text-[var(--color-muted)] truncate">
              {desc}
            </span>
          )}
        </span>
      </button>

      <div className="shrink-0 flex items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar servicio"
          className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
        >
          <NavIcon name="PencilSimple" size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar servicio"
          className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] transition-colors"
        >
          <NavIcon name="Trash" size={13} />
        </button>
      </div>
    </li>
  );
}

function ServicioModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Servicio | null;
  onSave: (servicio: Servicio) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Servicio | null>(initial);

  // Sincronizar cuando cambia initial (abrir modal con otro servicio)
  if (initial && draft?.id !== initial.id) {
    setDraft(initial);
  }
  if (!initial && draft !== null) {
    setDraft(null);
  }

  if (!draft) return null;

  const isNew = !initial?.nombre.es && !initial?.nombre.en && !initial?.nombre.ca;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? 'Nuevo servicio' : 'Editar servicio'}
      description="Los servicios aparecen en la sección «Nuestros servicios» de la landing."
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
            {isNew ? 'Añadir servicio' : 'Guardar cambios'}
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
          />
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const editingServicio = farmacia.servicios.find((s) => s.id === editingId) ?? null;

  const setServicios = (list: Servicio[]) => {
    patch({ servicios: list.map((s, i) => ({ ...s, orden: i })) });
  };

  const handleAdd = () => {
    const nuevo = crearServicioVacio(farmacia.servicios.length);
    setServicios([...farmacia.servicios, nuevo]);
    setEditingId(nuevo.id);
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleSaveModal = (servicio: Servicio) => {
    setServicios(
      farmacia.servicios.map((s) => (s.id === servicio.id ? servicio : s)),
    );
  };

  const handleCloseModal = () => {
    // Si es un servicio nuevo sin nombre, lo eliminamos al cerrar
    if (editingServicio) {
      const isEmpty =
        !editingServicio.nombre.es &&
        !editingServicio.nombre.en &&
        !editingServicio.nombre.ca &&
        !editingServicio.icono;
      if (isEmpty) {
        setServicios(farmacia.servicios.filter((s) => s.id !== editingServicio.id));
      }
    }
    setModalOpen(false);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    setServicios(farmacia.servicios.filter((s) => s.id !== id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = farmacia.servicios.findIndex((s) => s.id === e.active.id);
    const newIdx = farmacia.servicios.findIndex((s) => s.id === e.over!.id);
    setServicios(arrayMove(farmacia.servicios, oldIdx, newIdx));
  };

  return (
    <div className="space-y-10 max-w-3xl">
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

      <div className="hairline" />

      {/* ============= LISTA DE SERVICIOS ============= */}
      <section aria-labelledby="sec-servicios-lista">
      <SectionHeader
        id="sec-servicios-lista"
        title="Lista de servicios"
        hint="Cada servicio aparece como card. Arrastra las filas para reordenar."
        actions={
          <Button variant="accent" size="sm" onClick={handleAdd}>
            <NavIcon name="Plus" size={13} />
            <span className="hidden sm:inline">Añadir servicio</span>
            <span className="sm:hidden">Añadir</span>
          </Button>
        }
      />

      {farmacia.servicios.length === 0 ? (
        <button
          type="button"
          onClick={handleAdd}
          className="w-full card p-10 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
            <NavIcon name="Plus" size={20} />
          </div>
          <p className="text-[14px] text-[var(--color-ink-2)]">
            Añade tu primer servicio
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
            Consulta dermofarmacéutica, delivery, asesoría nutricional…
          </p>
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={farmacia.servicios.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="card p-1.5 space-y-0.5">
              {farmacia.servicios.map((s) => (
                <SortableRow
                  key={s.id}
                  servicio={s}
                  currentLocale={currentLocale}
                  onEdit={() => handleEdit(s.id)}
                  onRemove={() => handleRemove(s.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ServicioModal
        open={modalOpen}
        initial={editingServicio}
        onSave={handleSaveModal}
        onClose={handleCloseModal}
      />
      </section>
    </div>
  );
}
