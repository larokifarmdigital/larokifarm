'use client';

/**
 * `multi`: galería en grid con modal de alt por idioma. `single` (logo, OG): subir reemplaza, sin modal de alt.
 * Eliminar siempre pasa por ConfirmDialog; Reemplazar no confirma. Acciones siempre visibles en touch, solo al hover en desktop.
 */

import { CampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { useFieldBinding } from '@/features/farmacias/ui/hooks/useFieldError';
import { MultiImageField } from './MultiImageField';
import { SingleImageField } from './SingleImageField';
import type { MultiProps, SingleProps } from './imageFieldShared';

export function ImageGalleryField(props: MultiProps | SingleProps) {
  const { id, error } = useFieldBinding(props.field, '');
  const field = props.mode === 'single' ? <SingleImageField {...props} /> : <MultiImageField {...props} />;
  if (!props.field) return field;
  return (
    <CampoSinPublicar campo={props.field}>
      <div id={id} className={error?.message ? 'rounded-[10px] outline outline-1 outline-offset-4 outline-[var(--color-red-ink)]' : undefined}>
        {field}
        {error && <FieldError {...error} />}
      </div>
    </CampoSinPublicar>
  );
}
