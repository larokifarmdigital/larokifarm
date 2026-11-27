'use client';

import { CampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { ListFieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { Input } from '@/shared/components/atoms/Input';
import { Button } from '@/shared/components/atoms/Button';
import { Label } from '@/shared/components/atoms/Label';
import { Modal } from '@/shared/components/molecules/Modal';
import { ModalLocaleScope } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { TextosCabeceraFields } from '@/features/farmacias/ui/components/editor/fields/TextosCabeceraFields';
import { IconoField } from '@/features/farmacias/ui/components/editor/fields/IconoField';
import { IconoSVG } from '@/shared/components/atoms/IconoSVG';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { Servicio } from '@/core/farmacias/domain';
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
  const { readOnly } = useFarmaciaEditor();

  if (initial && draft?.id !== initial.id) setDraft(initial);
  if (!initial && draft !== null) setDraft(null);
  if (!draft) return null;

  return (
    <Modal
      soloLectura={readOnly}
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === 'create' ? 'Nuevo servicio' : (readOnly ? 'Servicio' : 'Editar servicio')}
      description="Sale como una tarjeta en la sección de servicios de tu web."
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!(draft.nombre?.es ?? '').trim() || !(draft.descripcion?.es ?? '').trim() || !isSafeHref(draft.enlace?.url ?? '')}
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
        <ModalLocaleScope values={[draft.nombre, draft.descripcion]}>
          <MultilangInput
            label="Nombre del servicio"
            value={draft.nombre}
            onChange={(v) => setDraft({ ...draft, nombre: v })}
            placeholder="Ej.: Consulta dermofarmacéutica"
            required
          />

          <MultilangTextarea
            label="Descripción"
            required
            value={draft.descripcion ?? {}}
            onChange={(v) => setDraft({ ...draft, descripcion: v })}
            placeholder="Explica en una o dos frases en qué consiste."
            rows={3}
          />
        </ModalLocaleScope>

        <IconoField value={draft.icono} onChange={(icono) => setDraft({ ...draft, icono })} />

        <details className="group" open={Boolean(draft.enlace?.url) || undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
            <NavIcon name="CaretRight" size={12} className="transition-transform group-open:rotate-90" />
            Opciones avanzadas: enlace
          </summary>
          <div className="mt-2">
            <Label htmlFor="servicio-enlace" hint="Opcional">Enlace al pulsar el servicio</Label>
            <p className="text-[12.5px] text-[var(--color-muted)] mb-2 mt-0.5">
              Si lo rellenas, toda la tarjeta lleva a ese enlace. Por ejemplo, https://… o /aviso-legal.
            </p>
            <Input
              id="servicio-enlace"
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
              <p role="alert" className="mt-1.5 mb-0 text-[12.5px] text-[var(--color-red-ink)]">
                Ese enlace no se puede usar. Empieza por https://, mailto:, tel:, # o /.
              </p>
            )}
            <label className="mt-2.5 flex min-h-11 sm:min-h-0 items-center gap-2 text-[13.5px] text-[var(--color-ink-2)] cursor-pointer">
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
              Abrir en otra pestaña (recomendado si es otra web)
            </label>
          </div>
        </details>
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
  const [recienAnadido, setRecienAnadido] = useState<string | null>(null);
  const { issues } = useFarmaciaEditor();

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
      setRecienAnadido(s.id);
      window.setTimeout(() => setRecienAnadido(null), 2500);
      toast.success('Servicio añadido al final de la lista', {
        description: 'Puedes moverlo de sitio desde la lista.',
      });
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

  const moverServicio = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= farmacia.servicios.length) return;
    setServicios(arrayMove(farmacia.servicios, indice, destino));
  };

  const activeLocales = farmacia.idiomasActivos;
  const t = farmacia.textosServicios ?? {};
  const cabeceraConError = issues.some((i) => i.field.startsWith('textosServicios'));
  const count = farmacia.servicios.length;

  const deletePreview =
    deleteTarget?.nombre.es ||
    deleteTarget?.nombre.ca ||
    deleteTarget?.nombre.en ||
    '';

  return (
    <div className="section-gap max-w-3xl">
      <CampoSinPublicar campo="servicios" soloBorde>
        <section aria-labelledby="sec-servicios-lista">
          <SectionHeader
            id="sec-servicios-lista"
            required
            title={count === 0 ? 'Servicios' : `${count} ${count === 1 ? 'servicio' : 'servicios'}`}
            hint="Cada servicio sale como una tarjeta en tu web, en este orden."
            actions={
              count > 0 ? (
                <Button variant="accent" size="sm" onClick={openCreate}>
                  <NavIcon name="Plus" size={14} />
                  Añadir servicio
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
              <p className="text-[15px] font-medium text-[var(--color-ink)] m-0">Añade tu primer servicio</p>
              <p className="mt-1 text-[13px] text-[var(--color-muted)] m-0">
                Consulta dermofarmacéutica, entrega a domicilio, asesoría nutricional…
              </p>
            </button>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={farmacia.servicios.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="card p-1.5 space-y-0.5 list-none m-0">
                  {farmacia.servicios.map((s, i) => {
                    const nombre = s.nombre[currentLocale] || s.nombre.es || s.nombre.ca || s.nombre.en || '';
                    const desc = s.descripcion?.[currentLocale] || s.descripcion?.es || '';
                    const faltan = activeLocales.filter((l) => !s.nombre[l]?.trim()).map((l) => LOCALE_NOMBRE[l]);
                    return (
                      <FilaLista
                        key={s.id}
                        id={s.id}
                        indice={i}
                        total={count}
                        tipo="servicio"
                        titulo={nombre}
                        detalle={desc}
                        destacar={recienAnadido === s.id}
                        icono={
                          <span
                            className={cn(
                              'h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center',
                              s.icono
                                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]',
                            )}
                          >
                            {s.icono ? <IconoSVG nombre={s.icono} size={18} /> : <NavIcon name="Image" size={14} />}
                          </span>
                        }
                        aviso={<AvisoTraduccion idiomas={faltan} />}
                        onEdit={() => openEdit(s)}
                        onRemove={() => setDeleteTarget(s)}
                        onMove={(d) => moverServicio(i, d)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <ListFieldError field="servicios" />
        </section>
      </CampoSinPublicar>

      <section aria-label="Textos de la cabecera de Servicios">
        <CabeceraColapsable
          abierta={cabeceraConError}
          resumen={[t.chip?.es, t.titulo?.es].filter(Boolean).join(' · ')}
        >
          <TextosCabeceraFields
            required
            fieldPrefix="textosServicios"
            value={t}
            onChange={(v) => patch({ textosServicios: v })}
            defaults={{
              chip: 'Nuestros servicios',
              titulo: 'Nuestros servicios',
              subtitulo: 'Ofrecemos una amplia gama de servicios farmacéuticos…',
            }}
          />
        </CabeceraColapsable>
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
