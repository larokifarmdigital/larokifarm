'use client';

import { MultilangInput } from './MultilangInput';
import { MultilangTextarea } from './MultilangTextarea';
import type { TextosCabecera } from '@/types/content';

/**
 * Trío de campos i18n (chip / titulo / subtitulo) reutilizable en Servicios,
 * FAQs y Reseñas. Los tres son opcionales: si se dejan vacíos, la landing usa
 * los textos por defecto del sitio.
 */
export function TextosCabeceraFields({
  value,
  onChange,
  defaults,
}: {
  value: TextosCabecera;
  onChange: (v: TextosCabecera) => void;
  defaults: { chip: string; titulo: string; subtitulo: string };
}) {
  return (
    <div className="space-y-4">
      <MultilangInput
        label="Chip (etiqueta superior)"
        value={value.chip ?? {}}
        onChange={(v) => onChange({ ...value, chip: v })}
        placeholder={defaults.chip}
        help={`Por defecto: «${defaults.chip}».`}
      />
      <MultilangInput
        label="Título"
        value={value.titulo ?? {}}
        onChange={(v) => onChange({ ...value, titulo: v })}
        placeholder={defaults.titulo}
        help="Las dos últimas palabras se resaltan automáticamente en la landing."
      />
      <MultilangTextarea
        label="Subtítulo"
        value={value.subtitulo ?? {}}
        onChange={(v) => onChange({ ...value, subtitulo: v })}
        placeholder={defaults.subtitulo}
        rows={2}
      />
    </div>
  );
}
