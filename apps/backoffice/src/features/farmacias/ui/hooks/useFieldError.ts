'use client';

import { useCallback } from 'react';
import { fieldDomId } from '@/core/farmacias/domain';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';

export type FieldErrorState = {
  message?: string;
  errorId: string;
  inputProps: {
    invalid: boolean;
    'aria-describedby'?: string;
    onBlur: () => void;
  };
};

/**
 * Errores de validación de los campos del editor:
 *   const fieldError = useFieldErrors();
 *   const email = fieldError('email');
 *   <Input {...email.inputProps} />  <FieldError {...email} />
 * Un error solo se muestra tras salir del campo (blur) o tras intentar publicar.
 */
export function useFieldErrors() {
  const { issues, isErrorVisible, touch } = useFarmaciaEditor();
  return useCallback(
    (field: string): FieldErrorState => {
      const issue = issues.find((i) => i.field === field);
      const visible = Boolean(issue) && isErrorVisible(field);
      const errorId = `err-${field.replace(/[^a-zA-Z0-9-]/g, '-')}`;
      return {
        message: visible ? issue!.message : undefined,
        errorId,
        inputProps: {
          invalid: visible,
          'aria-describedby': visible ? errorId : undefined,
          onBlur: () => touch(field),
        },
      };
    },
    [issues, isErrorVisible, touch],
  );
}

/**
 * Para componentes de campo con prop `field` (MultilangInput, Tiptap,
 * galería…): id estable del DOM (para "Revisar" en el aviso de publicar) +
 * su error. En campos multidioma el error solo se pinta en el idioma que
 * falla (p. ej. `heroChip.es` → solo en la pestaña de castellano).
 */
export function useFieldBinding(field: string | undefined, fallbackId: string) {
  const { issues, isErrorVisible, touch, currentLocale } = useFarmaciaEditor();
  if (!field) return { id: fallbackId, error: undefined as FieldErrorState | undefined };
  const issue = issues.find((i) => i.field === field);
  const visible = Boolean(issue) && isErrorVisible(field) && (!issue!.locale || issue!.locale === currentLocale);
  const errorId = `err-${field.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  return {
    id: fieldDomId(field),
    error: {
      message: visible ? issue!.message : undefined,
      errorId,
      inputProps: { invalid: visible, 'aria-describedby': visible ? errorId : undefined, onBlur: () => touch(field) },
    } satisfies FieldErrorState,
  };
}
