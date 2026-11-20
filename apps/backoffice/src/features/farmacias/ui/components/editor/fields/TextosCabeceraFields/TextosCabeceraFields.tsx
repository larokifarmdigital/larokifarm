'use client';

import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import type { TextosCabecera } from '@/core/farmacias/domain';

/**
 * Trío de campos i18n (chip / titulo / subtitulo) reutilizable en Servicios,
 * FAQs y Reseñas. Con `required` (Servicios, FAQs) son obligatorios en
 * castellano para publicar; sin él (Reseñas) son opcionales y la landing usa
 * los textos por defecto. `fieldPrefix` = clave de validación
 * (`textosServicios` → `textosServicios.chip.es`…).
 */
export function TextosCabeceraFields({
  value,
  onChange,
  defaults,
  required = false,
  fieldPrefix,
}: {
  value: TextosCabecera;
  onChange: (v: TextosCabecera) => void;
  defaults: { chip: string; titulo: string; subtitulo: string };
  required?: boolean;
  fieldPrefix?: string;
}) {
  const f = (k: string) => (fieldPrefix ? `${fieldPrefix}.${k}.es` : undefined);
  return (
    <div className="space-y-4">
      <MultilangInput
        label="Etiqueta pequeña sobre el título"
        required={required}
        field={f('chip')}
        value={value.chip ?? {}}
        onChange={(v) => onChange({ ...value, chip: v })}
        placeholder={defaults.chip}
        help={required ? undefined : `Por defecto: «${defaults.chip}».`}
      />
      <MultilangInput
        label="Título"
        required={required}
        field={f('titulo')}
        value={value.titulo ?? {}}
        onChange={(v) => onChange({ ...value, titulo: v })}
        placeholder={defaults.titulo}
        help="Las dos últimas palabras salen resaltadas en tu web."
      />
      <MultilangTextarea
        label="Subtítulo"
        required={required}
        field={f('subtitulo')}
        value={value.subtitulo ?? {}}
        onChange={(v) => onChange({ ...value, subtitulo: v })}
        placeholder={defaults.subtitulo}
        rows={2}
      />
    </div>
  );
}
