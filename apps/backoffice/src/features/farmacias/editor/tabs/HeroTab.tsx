'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { IconPicker } from '@/components/ui/IconPicker';
import { IconoSVG } from '@/components/ui/IconoSVG';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import type { HeroTarjetaFlotante, ImagenAsset } from '@/types/content';
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

function mockUpload(name: string): ImagenAsset {
  const seed = name.replace(/\W+/g, '-').toLowerCase() || `img-${Date.now()}`;
  return {
    id: `img_${Math.random().toString(36).slice(2, 10)}`,
    url: `https://picsum.photos/seed/${seed}/1920/800`,
    alt: {},
  };
}

function crearTarjetaVacia(orden: number): HeroTarjetaFlotante {
  return {
    id: `htj_${Math.random().toString(36).slice(2, 10)}`,
    icono: undefined,
    titulo: {},
    subtitulo: {},
    orden,
  };
}

function TarjetaRow({
  tarjeta,
  currentLocale,
  onEdit,
  onRemove,
}: {
  tarjeta: HeroTarjetaFlotante;
  currentLocale: 'es' | 'en' | 'ca';
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tarjeta.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const titulo = tarjeta.titulo[currentLocale];
  const sub = tarjeta.subtitulo[currentLocale];

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
        <span className="shrink-0 h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] flex items-center justify-center text-[var(--color-accent-ink)]">
          {tarjeta.icono ? (
            <IconoSVG nombre={tarjeta.icono} size={18} />
          ) : (
            <NavIcon name="Image" size={14} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-[var(--color-ink)] truncate">
            {titulo || <span className="text-[var(--color-muted-2)] italic">Sin título</span>}
          </span>
          {sub && (
            <span className="block text-[12px] text-[var(--color-muted)] truncate">{sub}</span>
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

function TarjetaModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: HeroTarjetaFlotante | null;
  onSave: (t: HeroTarjetaFlotante) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HeroTarjetaFlotante | null>(initial);

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  const isNew = !initial?.titulo.es && !initial?.titulo.en && !initial?.titulo.ca;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? 'Nueva tarjeta flotante' : 'Editar tarjeta'}
      description="Aparecen flotando sobre la imagen principal del hero. La posición se asigna automáticamente."
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
          placeholder="Ej.: Consulta gratuita"
          required
        />
        <MultilangInput
          label="Subtítulo"
          value={draft.subtitulo}
          onChange={(v) => setDraft({ ...draft, subtitulo: v })}
          placeholder="Ej.: Sin cita previa"
          required
        />
      </div>
    </Modal>
  );
}

export function HeroTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tarjetas = farmacia.heroTarjetasFlotantes ?? [];
  const editingTarjeta = tarjetas.find((t) => t.id === editingId) ?? null;

  const setTarjetas = (list: HeroTarjetaFlotante[]) =>
    patch({ heroTarjetasFlotantes: list.map((t, i) => ({ ...t, orden: i })) });

  const addTarjeta = () => {
    if (tarjetas.length >= 3) return;
    const nueva = crearTarjetaVacia(tarjetas.length);
    setTarjetas([...tarjetas, nueva]);
    setEditingId(nueva.id);
    setModalOpen(true);
  };

  const editTarjeta = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const saveTarjeta = (t: HeroTarjetaFlotante) => {
    setTarjetas(tarjetas.map((x) => (x.id === t.id ? t : x)));
  };

  const closeModal = () => {
    if (editingTarjeta) {
      const empty =
        !editingTarjeta.titulo.es &&
        !editingTarjeta.titulo.en &&
        !editingTarjeta.titulo.ca &&
        !editingTarjeta.icono;
      if (empty) setTarjetas(tarjetas.filter((x) => x.id !== editingTarjeta.id));
    }
    setModalOpen(false);
    setEditingId(null);
  };

  const removeTarjeta = (id: string) =>
    setTarjetas(tarjetas.filter((x) => x.id !== id));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = tarjetas.findIndex((t) => t.id === e.active.id);
    const newIdx = tarjetas.findIndex((t) => t.id === e.over!.id);
    setTarjetas(arrayMove(tarjetas, oldIdx, newIdx));
  };

  const addHero = (files: FileList | null) => {
    if (!files) return;
    const nuevos = Array.from(files).map((f) => mockUpload(f.name));
    patch({ heroImages: [...farmacia.heroImages, ...nuevos] });
  };

  const removeHero = (id: string) =>
    patch({ heroImages: farmacia.heroImages.filter((h) => h.id !== id) });

  const updateHeroAlt = (id: string, alt: string) =>
    patch({
      heroImages: farmacia.heroImages.map((h) =>
        h.id === id ? { ...h, alt: { ...h.alt, [currentLocale]: alt } } : h,
      ),
    });

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= TEXTOS ============= */}
      <section aria-labelledby="sec-hero-textos">
        <SectionHeader
          id="sec-hero-textos"
          title="Textos del hero"
          hint="Chip, subtítulo y claim que aparecen sobre la primera pantalla de la landing. Si dejas el chip o el subtítulo vacíos, se usan los textos por defecto del sitio."
        />

        <div className="space-y-4">
          <MultilangInput
            label="Chip (etiqueta superior)"
            value={farmacia.heroChip ?? {}}
            onChange={(v) => patch({ heroChip: v })}
            placeholder="Farmacia en Barcelona"
            help="Texto pequeño sobre el título principal."
          />
          <MultilangInput
            label="Subtítulo"
            value={farmacia.heroSubtitulo ?? {}}
            onChange={(v) => patch({ heroSubtitulo: v })}
            placeholder="Tu farmacia familiar en el Eixample"
            help="Línea destacada bajo el nombre de la farmacia."
          />
          <MultilangTextarea
            label="Claim / descripción corta"
            value={farmacia.descripcionCorta}
            onChange={(v) => patch({ descripcionCorta: v })}
            placeholder="Frase de apoyo bajo el subtítulo. Aparece también como meta description en Google."
            rows={2}
            maxLength={180}
            help="Máximo 180 caracteres por idioma."
          />
        </div>
      </section>

      <div className="hairline" />

      {/* ============= IMÁGENES ============= */}
      <section aria-labelledby="sec-hero-imagenes">
        <SectionHeader
          id="sec-hero-imagenes"
          title="Imágenes del hero"
          hint="Se rotan en la cabecera de la landing. Recomendado 1-6 imágenes horizontales, mínimo 1920×800."
          actions={
            <>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addHero(e.target.files)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => imgInputRef.current?.click()}
              >
                <NavIcon name="Plus" size={13} />
                Añadir
              </Button>
            </>
          }
        />

        {farmacia.heroImages.length === 0 ? (
          <button
            type="button"
            onClick={() => imgInputRef.current?.click()}
            className="w-full card p-10 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-3">
              <NavIcon name="Image" size={20} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-[14px] text-[var(--color-ink-2)] m-0">Arrastra o pulsa para subir imágenes</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">JPG, PNG o WEBP · mínimo 1920×800</p>
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {farmacia.heroImages.map((h, i) => (
              <div key={h.id} className="card overflow-hidden">
                <div className="relative aspect-[12/5] bg-[var(--color-surface-sunken)]">
                  <Image
                    src={h.url}
                    alt={h.alt[currentLocale] ?? ''}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 chip chip-neutral bg-white/90">
                    Imagen {i + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHero(h.id)}
                    aria-label="Eliminar imagen"
                    className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-[6px] bg-white/90 hover:bg-white text-[var(--color-red-ink)]"
                  >
                    <NavIcon name="Trash" size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <Label htmlFor={`alt-${h.id}`}>Alt (accesibilidad + SEO)</Label>
                  <Input
                    id={`alt-${h.id}`}
                    value={h.alt[currentLocale] ?? ''}
                    onChange={(e) => updateHeroAlt(h.id, e.target.value)}
                    placeholder="Describe lo que se ve"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="hairline" />

      {/* ============= TARJETAS FLOTANTES ============= */}
      <section aria-labelledby="sec-hero-tarjetas">
        <SectionHeader
          id="sec-hero-tarjetas"
          title="Tarjetas flotantes"
          hint="Hasta 3 tarjetas que flotan sobre la imagen principal del hero. La posición visual se asigna automáticamente."
          actions={
            <Button
              variant="accent"
              size="sm"
              onClick={addTarjeta}
              disabled={tarjetas.length >= 3}
            >
              <NavIcon name="Plus" size={13} />
              <span className="hidden sm:inline">Añadir tarjeta</span>
              <span className="sm:hidden">Añadir</span>
            </Button>
          }
        />

        {tarjetas.length === 0 ? (
          <button
            type="button"
            onClick={addTarjeta}
            className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
              <NavIcon name="Plus" size={18} />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Añade una tarjeta flotante</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">
              Consulta gratuita, entrega a domicilio, guardia 24h…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={tarjetas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="card p-1.5 space-y-0.5 list-none m-0">
                {tarjetas.map((t) => (
                  <TarjetaRow
                    key={t.id}
                    tarjeta={t}
                    currentLocale={currentLocale}
                    onEdit={() => editTarjeta(t.id)}
                    onRemove={() => removeTarjeta(t.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <TarjetaModal
          open={modalOpen}
          initial={editingTarjeta}
          onSave={saveTarjeta}
          onClose={closeModal}
        />
      </section>
    </div>
  );
}
