'use client';

import { CampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
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
import { ModalLocaleScope } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import type { MultilangText } from '@/core/shared';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { LOCALE_NOMBRE } from '@/core/shared';
import { AvisoTraduccion, CabeceraColapsable, FilaLista } from '@/features/farmacias/ui/components/editor/fields/FilaLista';
import { useFieldErrors } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';

const MAX_PUNTOS = 8;
const RECOMENDADO_PUNTOS = 4;
const MAX_IMAGENES = 6;

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
  const { readOnly } = useFarmaciaEditor();
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
      soloLectura={readOnly}
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === 'create' ? 'Nuevo punto destacado' : (readOnly ? 'Punto destacado' : 'Editar punto')}
      description="Frase corta que resume un valor de la farmacia. Aparece como ítem de lista en la sección «Sobre nosotros»."
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
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
        <ModalLocaleScope values={[draft]}>
          <MultilangInput
            label="Texto del punto"
            value={draft}
            onChange={setDraft}
            placeholder="Ej.: Equipo formado en pediatría"
            required
          />
        </ModalLocaleScope>
      </div>
    </Modal>
  );
}

export function SobreTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const anyosError = useFieldErrors()('sobreNosotros.anyosExperiencia');
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
      toast.success('Punto añadido al final de la lista');
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
  const lleno = count >= MAX_PUNTOS;
  const mover = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= puntos.length) return;
    setPuntos(arrayMove(puntos, indice, destino));
  };
  const puntosCountHint = `Lo ideal son entre ${RECOMENDADO_PUNTOS} y 6; como máximo ${MAX_PUNTOS}.`;
  const { issues } = useFarmaciaEditor();
  const cabeceraConError = issues.some((i) => i.field.startsWith('sobreNosotros'));

  const deletePreview =
    deleteIndex !== null
      ? puntos[deleteIndex]?.es ||
        puntos[deleteIndex]?.ca ||
        puntos[deleteIndex]?.en ||
        ''
      : '';

  return (
    <div className="space-y-10 max-w-3xl">
      <CampoSinPublicar campo="descripcionLarga" soloBorde>
        <section aria-labelledby="sec-sobre-descripcion">
          <SectionHeader
            id="sec-sobre-descripcion"
            title="Vuestra historia"
            hint="El texto principal de «Quiénes somos»: historia, especialidad y valores."
          />
          <Label
            hint={
              <LocaleChip
                locale={currentLocale}
                status={computeLocaleStatus(farmacia.descripcionLarga, currentLocale, farmacia.idiomasActivos)}
              />
            }
            className="mb-3"
            required
          >
            Texto
          </Label>
          <TiptapField
            field="descripcionLarga.es"
            label="Vuestra historia"
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
      </CampoSinPublicar>

      <div className="hairline" />

      <section aria-labelledby="sec-sobre-imagenes">
        <SectionHeader
          id="sec-sobre-imagenes"
          required
          title="Fotos"
          hint={`Salen junto a vuestra historia. Entre 1 y ${MAX_IMAGENES} fotos.`}
        />

        <ImageGalleryField
          businessId={farmacia.id}
          role="sobre"
          field="imagenesSobre"
          value={imagenes}
          onChange={(imagenesSobre) => patch({ imagenesSobre })}
          idiomasActivos={farmacia.idiomasActivos}
          max={MAX_IMAGENES}
        />
      </section>

      <div className="hairline" />

      <CampoSinPublicar campo="sobreNosotros" soloBorde>
        <section aria-labelledby="sec-sobre-puntos">
          <SectionHeader
            id="sec-sobre-puntos"
            title={count === 0 ? 'Puntos destacados' : `${count} ${count === 1 ? 'punto destacado' : 'puntos destacados'}`}
            hint={`Frases cortas con lo que os hace especiales. ${puntosCountHint}`}
            actions={
              count > 0 && !lleno ? (
                <Button variant="accent" size="sm" onClick={openCreate}>
                  <NavIcon name="Plus" size={14} />
                  Añadir punto
                </Button>
              ) : null
            }
          />
          {lleno && (
            <p className="m-0 mb-3 text-[13.5px] text-[var(--color-muted)]">
              Has llegado al máximo de {MAX_PUNTOS} puntos. Elimina uno para añadir otro.
            </p>
          )}

          {count === 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            >
              <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
                <NavIcon name="Plus" size={18} />
              </div>
              <p className="text-[15px] font-medium text-[var(--color-ink)] m-0">Añade tu primer punto destacado</p>
              <p className="mt-1 text-[13px] text-[var(--color-muted)] m-0">
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
                    <FilaLista
                      key={`p-${i}`}
                      id={`p-${i}`}
                      indice={i}
                      total={count}
                      tipo="punto"
                      titulo={p[currentLocale] || p.es || p.ca || p.en || ''}
                      aviso={
                        <AvisoTraduccion
                          idiomas={farmacia.idiomasActivos.filter((l) => !p[l]?.trim()).map((l) => LOCALE_NOMBRE[l])}
                        />
                      }
                      onEdit={() => openEdit(i)}
                      onRemove={() => setDeleteIndex(i)}
                      onMove={(d) => mover(i, d)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </CampoSinPublicar>

      <div className="hairline" />

      <div className="hairline" />

      <section aria-label="Textos de la cabecera de Quiénes somos">
        <CabeceraColapsable
          abierta={cabeceraConError}
          resumen={[sobre.chip?.es, sobre.titulo?.es, sobre.anyosExperiencia ? `+${sobre.anyosExperiencia} años` : ''].filter(Boolean).join(' · ')}
        >
        <div className="space-y-4">
          <MultilangInput
            label="Etiqueta pequeña sobre el título"
            required
            field="sobreNosotros.chip.es"
            value={sobre.chip ?? {}}
            onChange={(v) => setSobre({ chip: v })}
            placeholder="Sobre nosotros"
            help="Por ejemplo: Sobre nosotros."
          />
          <MultilangInput
            label="Título"
            required
            field="sobreNosotros.titulo.es"
            value={sobre.titulo ?? {}}
            onChange={(v) => setSobre({ titulo: v })}
            placeholder="Una farmacia para familias"
            help="Las dos últimas palabras salen resaltadas en tu web."
          />
          <div>
            <Label htmlFor="anyos-experiencia">
              Años de experiencia
            </Label>
            <Input
              id="anyos-experiencia"
              {...anyosError.inputProps}
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
            <FieldError {...anyosError} />
            <p className="help">Sale como «+45 años». Si lo dejas vacío, no se muestra.</p>
          </div>
        </div>
        </CabeceraColapsable>
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
