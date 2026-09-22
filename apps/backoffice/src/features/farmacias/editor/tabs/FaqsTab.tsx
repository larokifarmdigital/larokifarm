'use client';

import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { TextosCabeceraFields } from '../TextosCabeceraFields';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NavIcon } from '@/features/shell/NavIcon';
import type { Faq } from '@/types/content';
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

function newFaq(orden: number): Faq {
  return {
    id: `faq_${Math.random().toString(36).slice(2, 10)}`,
    pregunta: {},
    respuesta: {},
    orden,
  };
}

function SortableFaq({
  faq,
  onChange,
  onRemove,
}: {
  faq: Faq;
  onChange: (f: Faq) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: faq.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-5 ${isDragging ? 'shadow-[var(--shadow-elevated)]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reordenar pregunta"
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted-2)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] cursor-grab active:cursor-grabbing"
        >
          <NavIcon name="DotsSixVertical" size={16} weight="bold" />
        </button>
        <div className="flex-1 space-y-4">
          <MultilangInput
            label="Pregunta"
            value={faq.pregunta}
            onChange={(v) => onChange({ ...faq, pregunta: v })}
            placeholder="¿Hacéis guardia nocturna?"
          />
          <MultilangTextarea
            label="Respuesta"
            value={faq.respuesta}
            onChange={(v) => onChange({ ...faq, respuesta: v })}
            placeholder="Escribe la respuesta clara y breve."
            rows={3}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar pregunta"
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] transition-colors"
        >
          <NavIcon name="Trash" size={14} />
        </button>
      </div>
    </div>
  );
}

export function FaqsTab() {
  const { farmacia, patch } = useFarmaciaEditor();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setFaqs = (list: Faq[]) => {
    patch({ faqs: list.map((f, i) => ({ ...f, orden: i })) });
  };

  const add = () => setFaqs([...farmacia.faqs, newFaq(farmacia.faqs.length)]);

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = farmacia.faqs.findIndex((f) => f.id === e.active.id);
    const newIdx = farmacia.faqs.findIndex((f) => f.id === e.over!.id);
    setFaqs(arrayMove(farmacia.faqs, oldIdx, newIdx));
  };

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= TEXTOS DE CABECERA ============= */}
      <section aria-labelledby="sec-faqs-textos">
        <SectionHeader
          id="sec-faqs-textos"
          title="Textos de la sección"
          hint="Cabecera de la sección «Preguntas frecuentes» en la landing. Deja los campos vacíos para usar los textos por defecto del sitio."
        />
        <TextosCabeceraFields
          value={farmacia.textosFaqs ?? {}}
          onChange={(v) => patch({ textosFaqs: v })}
          defaults={{
            chip: 'Preguntas frecuentes',
            titulo: 'Resolvemos tus dudas',
            subtitulo: 'Las preguntas más habituales que nos hacen…',
          }}
        />
      </section>

      <div className="hairline" />

      {/* ============= LISTA DE PREGUNTAS ============= */}
      <section aria-labelledby="sec-faqs-lista">
        <SectionHeader
          id="sec-faqs-lista"
          title="Lista de preguntas"
          hint="Aparecen como bloque de FAQ en la landing y se publican como FAQ schema en Google. Recomendado 4-8."
          actions={
            <Button onClick={add} variant="accent" size="sm">
              <NavIcon name="Plus" size={13} />
              <span className="hidden sm:inline">Añadir pregunta</span>
              <span className="sm:hidden">Añadir</span>
            </Button>
          }
        />

        {farmacia.faqs.length === 0 ? (
          <button
            type="button"
            onClick={add}
            className="w-full card p-10 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-4 text-[var(--color-accent)]">
              <NavIcon name="Plus" size={20} />
            </div>
            <p className="text-[14px] text-[var(--color-ink-2)] m-0">Añade tu primera pregunta</p>
            <p className="mt-1 text-[12.5px] text-[var(--color-muted)] m-0">
              Guardia nocturna, recetas electrónicas, delivery…
            </p>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={farmacia.faqs.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {farmacia.faqs.map((f) => (
                  <SortableFaq
                    key={f.id}
                    faq={f}
                    onChange={(next) =>
                      setFaqs(farmacia.faqs.map((x) => (x.id === f.id ? next : x)))
                    }
                    onRemove={() => setFaqs(farmacia.faqs.filter((x) => x.id !== f.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
