'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { ListFieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { ImageGalleryField } from '@/features/farmacias/ui/components/editor/fields/ImageGalleryField';
import { Button } from '@/shared/components/atoms/Button';
import { Modal } from '@/shared/components/molecules/Modal';
import { ModalLocaleScope } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { IconoSVG } from '@/shared/components/atoms/IconoSVG';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { HeroTarjetaFlotante } from '@/core/farmacias/domain';
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
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { FilaLista } from '@/features/farmacias/ui/components/editor/fields/FilaLista';
import { IconoField } from '@/features/farmacias/ui/components/editor/fields/IconoField';

function crearTarjetaVacia(orden: number): HeroTarjetaFlotante {
  return {
    id: `htj_${Math.random().toString(36).slice(2, 10)}`,
    icono: undefined,
    titulo: {},
    subtitulo: {},
    orden,
  };
}

function TarjetaModal({
  open,
  initial,
  mode,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: HeroTarjetaFlotante | null;
  mode: 'create' | 'edit';
  onSave: (t: HeroTarjetaFlotante) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HeroTarjetaFlotante | null>(initial);
  const { readOnly } = useFarmaciaEditor();

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  const isNew = mode === 'create';

  return (
    <Modal
      soloLectura={readOnly}
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? 'Nueva tarjeta sobre la foto' : (readOnly ? 'Tarjeta sobre la foto' : 'Editar tarjeta')}
      description="Sale encima de la foto principal de la portada. Su posición se elige sola."
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" size="md"
            disabled={!Object.values(draft.titulo ?? {}).some((v) => (v ?? '').trim()) || !Object.values(draft.subtitulo ?? {}).some((v) => (v ?? '').trim())}
            title={Object.values(draft.titulo ?? {}).some((v) => (v ?? '').trim()) ? undefined : 'Rellena el campo obligatorio'} onClick={() => { onSave(draft); onClose(); }}>
            {isNew ? 'Añadir tarjeta' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <ModalLocaleScope values={[draft.titulo, draft.subtitulo]}>
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
        </ModalLocaleScope>
        <IconoField value={draft.icono} onChange={(icono) => setDraft({ ...draft, icono })} />
      </div>
    </Modal>
  );
}

export function HeroTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const [modalOpen, setModalOpen] = useState(false);
  // La tarjeta en edición vive fuera de `farmacia` hasta que se guarda: si se
  // añadiera vacía, el autoguardado la descartaría (sin título) y cerraría el modal.
  const [editingDraft, setEditingDraft] = useState<HeroTarjetaFlotante | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [borrar, setBorrar] = useState<HeroTarjetaFlotante | null>(null);
  const [recienAnadida, setRecienAnadida] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tarjetas = farmacia.heroTarjetasFlotantes ?? [];

  const setTarjetas = (list: HeroTarjetaFlotante[]) =>
    patch({ heroTarjetasFlotantes: list.map((t, i) => ({ ...t, orden: i })) });

  const addTarjeta = () => {
    if (tarjetas.length >= 3) return;
    setModalMode('create');
    setEditingDraft(crearTarjetaVacia(tarjetas.length));
    setModalOpen(true);
  };

  const editTarjeta = (id: string) => {
    const t = tarjetas.find((x) => x.id === id);
    if (!t) return;
    setModalMode('edit');
    setEditingDraft(t);
    setModalOpen(true);
  };

  const saveTarjeta = (t: HeroTarjetaFlotante) => {
    if (modalMode === 'create') {
      setTarjetas([...tarjetas, t]);
      setRecienAnadida(t.id);
      window.setTimeout(() => setRecienAnadida(null), 2500);
      toast.success('Tarjeta añadida al final');
    } else setTarjetas(tarjetas.map((x) => (x.id === t.id ? t : x)));
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDraft(null);
  };

  const removeTarjeta = (id: string) =>
    setTarjetas(tarjetas.filter((x) => x.id !== id));

  const mover = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= tarjetas.length) return;
    setTarjetas(arrayMove(tarjetas, indice, destino));
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = tarjetas.findIndex((t) => t.id === e.active.id);
    const newIdx = tarjetas.findIndex((t) => t.id === e.over!.id);
    setTarjetas(arrayMove(tarjetas, oldIdx, newIdx));
  };

  return (
    <div className="space-y-10 max-w-3xl">
      <section aria-labelledby="sec-hero-textos">
        <SectionHeader
          id="sec-hero-textos"
          title="Textos de la portada"
          hint="Lo primero que se lee al entrar en tu web. Los tres son obligatorios en castellano para publicar."
        />

        <div className="space-y-5">
          <MultilangInput
            label="Etiqueta pequeña sobre el título"
            required
            field="heroChip.es"
            value={farmacia.heroChip ?? {}}
            onChange={(v) => patch({ heroChip: v })}
            placeholder="Farmacia en Barcelona"
            help="Por ejemplo: Farmacia en Barcelona."
          />
          <MultilangInput
            label="Frase principal"
            required
            field="heroSubtitulo.es"
            value={farmacia.heroSubtitulo ?? {}}
            onChange={(v) => patch({ heroSubtitulo: v })}
            placeholder="Tu farmacia familiar en el Eixample"
            help="La frase grande bajo el nombre de la farmacia."
          />
          <MultilangTextarea
            label="Frase de apoyo"
            required
            field="descripcionCorta.es"
            value={farmacia.descripcionCorta}
            onChange={(v) => patch({ descripcionCorta: v })}
            placeholder="Una o dos frases que expliquen qué ofrece tu farmacia."
            rows={2}
            maxLength={180}
            help="Sale bajo la frase principal y Google también puede usarla. Máximo 180 caracteres."
          />
        </div>
      </section>

      <div className="hairline" />

      <section aria-labelledby="sec-hero-imagenes">
        <SectionHeader
          id="sec-hero-imagenes"
          required
          title="Fotos de la portada"
          hint="Van pasando en la parte de arriba de tu web. De 1 a 6 fotos horizontales, de 1920×800 como mínimo."
        />

        <ImageGalleryField
          businessId={farmacia.id}
          role="hero"
          field="heroImages"
          value={farmacia.heroImages}
          onChange={(heroImages) => patch({ heroImages })}
          idiomasActivos={farmacia.idiomasActivos}
          max={6}
        />
      </section>

      <div className="hairline" />

      <section aria-labelledby="sec-hero-tarjetas">
        <SectionHeader
          id="sec-hero-tarjetas"
          required
          title="Tarjetas sobre la foto"
          hint="De 1 a 3 tarjetas pequeñas encima de la foto principal. Su posición se elige sola."
          actions={
            tarjetas.length > 0 && tarjetas.length < 3 ? (
              <Button variant="accent" size="sm" onClick={addTarjeta}>
                <NavIcon name="Plus" size={14} />
                Añadir tarjeta
              </Button>
            ) : null
          }
        />
        {tarjetas.length >= 3 && (
          <p className="m-0 mb-3 text-[13.5px] text-[var(--color-muted)]">
            Has llegado al máximo de 3 tarjetas. Elimina una para añadir otra.
          </p>
        )}

        {tarjetas.length === 0 ? (
          <button
            type="button"
            onClick={addTarjeta}
            className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
              <NavIcon name="Plus" size={18} />
            </div>
            <p className="text-[15px] font-medium text-[var(--color-ink)] m-0">Añade una tarjeta</p>
            <p className="mt-1 text-[13px] text-[var(--color-muted)] m-0">
              Consulta gratuita, entrega a domicilio, guardia 24h…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={tarjetas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="card p-1.5 space-y-0.5 list-none m-0">
                {tarjetas.map((t, i) => (
                  <FilaLista
                    key={t.id}
                    id={t.id}
                    indice={i}
                    total={tarjetas.length}
                    tipo="tarjeta"
                    titulo={t.titulo[currentLocale] || t.titulo.es || ''}
                    detalle={t.subtitulo?.[currentLocale] || t.subtitulo?.es || ''}
                    destacar={recienAnadida === t.id}
                    icono={
                      <span
                        className={cn(
                          'h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center',
                          t.icono
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]',
                        )}
                      >
                        {t.icono ? <IconoSVG nombre={t.icono} size={18} /> : <NavIcon name="Image" size={14} />}
                      </span>
                    }
                    onEdit={() => editTarjeta(t.id)}
                    onRemove={() => setBorrar(t)}
                    onMove={(d) => mover(i, d)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <TarjetaModal
          open={modalOpen}
          initial={editingDraft}
          mode={modalMode}
          onSave={saveTarjeta}
          onClose={closeModal}
        />
        <ListFieldError field="heroTarjetasFlotantes" />
        <ConfirmDialog
          open={borrar !== null}
          onOpenChange={(o) => !o && setBorrar(null)}
          title="Eliminar tarjeta"
          description={`Vas a eliminar «${borrar?.titulo.es || 'esta tarjeta'}». No se puede deshacer.`}
          onConfirm={() => {
            if (borrar) removeTarjeta(borrar.id);
            setBorrar(null);
          }}
        />
      </section>
    </div>
  );
}
