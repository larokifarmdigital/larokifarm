import { defineType } from 'sanity';
import { IconoSelectorInput } from './IconoSelectorInput';
import { ICONOS_VALORES } from './iconosCatalogo';

/**
 * Tipo Sanity para seleccionar un icono del catálogo Lucide.
 *
 * Internamente es un `string` con el valor del icono (ej: "heart-pulse"),
 * pero el editor lo elige con un grid visual.
 *
 * Uso:
 * ```
 * defineField({ name: 'icono', title: 'Icono', type: 'iconoLucide' })
 * ```
 */
export const iconoLucide = defineType({
  name: 'iconoLucide',
  title: 'Icono',
  type: 'string',
  components: {
    input: IconoSelectorInput,
  },
  validation: (r) =>
    r.custom<string | undefined>((val) => {
      if (!val) return true;
      if (ICONOS_VALORES.includes(val as (typeof ICONOS_VALORES)[number])) return true;
      return `Icono no válido. Valores aceptados: ${ICONOS_VALORES.join(', ')}.`;
    }),
});
