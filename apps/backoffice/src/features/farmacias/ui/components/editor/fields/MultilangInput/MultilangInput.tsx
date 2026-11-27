'use client';

import { CampoSinPublicar, EtiquetaSinPublicar, useCampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
import { useId } from 'react';
import type { MultilangText } from '@/core/shared';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { LocaleChip } from '@/features/farmacias/ui/components/editor/status/LocaleChip';
import { computeLocaleStatus } from '@/features/farmacias/ui/lib/i18nStatus';
import { useFieldBinding } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { useEditingLocale } from '@/features/farmacias/ui/components/editor/fields/ModalLocaleScope';

export function MultilangInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  help,
  field,
}: {
  label: string;
  value: MultilangText;
  onChange: (v: MultilangText) => void;
  placeholder?: string;
  required?: boolean;
  help?: string;
  /** Clave de validación (core/farmacias/domain/validation), p. ej. `heroChip.es`. */
  field?: string;
}) {
  const { farmacia } = useFarmaciaEditor();
  const currentLocale = useEditingLocale();
  const { id, error } = useFieldBinding(field, useId());
  const sinPublicar = useCampoSinPublicar(field);
  const current = value[currentLocale] ?? '';
  const status = computeLocaleStatus(value, currentLocale, farmacia.idiomasActivos);

  return (
    <CampoSinPublicar campo={field} soloBorde="enLabel">
      <Label htmlFor={id} required={required} hint={<>{sinPublicar && <EtiquetaSinPublicar />}<LocaleChip locale={currentLocale} status={status} /></>}>
        {label}
      </Label>
      <Input
        id={id}
        value={current}
        onChange={(e) => onChange({ ...value, [currentLocale]: e.target.value })}
        placeholder={placeholder}
        {...error?.inputProps}
      />
      {error && <FieldError {...error} />}
      {help && <p className="help">{help}</p>}
    </CampoSinPublicar>
  );
}
